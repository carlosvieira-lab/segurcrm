import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "../components/Sidebar";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function getServerSideProps() {
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, nif");

  const { data: policies } = await supabase
    .from("policies")
    .select("id, policy_number, client_id");

  const { data: insurers } = await supabase
    .from("insurers")
    .select("id, name");

  return {
    props: {
      clients: clients || [],
      policies: policies || [],
      insurers: insurers || [],
    },
  };
}

function onlyNumbers(value) {
  return String(value || "").replace(/\D/g, "");
}

function cleanText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatEuro(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function excelDateToIso(value) {
  if (!value) return "";

  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  if (typeof value === "number") {
    const utcDays = Math.floor(value - 25569);
    const utcValue = utcDays * 86400;
    const date = new Date(utcValue * 1000);
    return date.toISOString().split("T")[0];
  }

  const text = String(value).trim();

  if (!text) return "";

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }

  const parts = text.split(/[\/\-\.]/);

  if (parts.length === 3) {
    const [day, month, year] = parts;

    if (year?.length === 4) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  return text;
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") return value;

  const text = String(value)
    .replace(/\s/g, "")
    .replace("€", "")
    .replace(/\./g, "")
    .replace(",", ".");

  return Number(text) || 0;
}

function normalizePaymentFrequency(value) {
  const text = cleanText(value);

  if (text.includes("mensal")) return "Mensal";
  if (text.includes("trimestral")) return "Trimestral";
  if (text.includes("semestral")) return "Semestral";
  if (text.includes("anual")) return "Anual";

  return value || "Anual";
}

function normalizeStatus(value) {
  const text = cleanText(value);

  if (text.includes("anulad") || text.includes("cancel")) return "anulada";

  return "ativa";
}

function normalizeColumnName(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s/g, "")
    .toLowerCase();
}

function getCell(row, possibleNames) {
  const normalizedRow = {};

  Object.keys(row || {}).forEach((key) => {
    normalizedRow[normalizeColumnName(key)] = row[key];
  });

  for (const name of possibleNames) {
    const normalizedName = normalizeColumnName(name);

    if (normalizedName in normalizedRow) {
      return normalizedRow[normalizedName];
    }
  }

  return "";
}

function loadSheetJs() {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.XLSX) {
      resolve(window.XLSX);
      return;
    }

    const existingScript = document.getElementById("sheetjs-script");

    if (existingScript) {
      existingScript.onload = () => resolve(window.XLSX);
      existingScript.onerror = reject;
      return;
    }

    const script = document.createElement("script");
    script.id = "sheetjs-script";
    script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.onload = () => resolve(window.XLSX);
    script.onerror = reject;

    document.body.appendChild(script);
  });
}

export default function Importacoes({ clients, policies, insurers }) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const realVida = insurers.find(
    (insurer) => cleanText(insurer.name) === "real vida"
  );

  const existingClientsByNif = useMemo(() => {
    const map = new Map();

    clients.forEach((client) => {
      const nif = onlyNumbers(client.nif);

      if (nif) {
        map.set(nif, client);
      }
    });

    return map;
  }, [clients]);

  const existingPoliciesByNumber = useMemo(() => {
    const map = new Map();

    policies.forEach((policy) => {
      const policyNumber = String(policy.policy_number || "").trim();

      if (policyNumber) {
        map.set(policyNumber, policy);
      }
    });

    return map;
  }, [policies]);

  const analyzedRows = useMemo(() => {
    return rows.map((row, index) => {
      const policyNumber = String(
        getCell(row, ["Apolice", "Apólice", "Policy"])
      ).trim();

      const clientName = String(
        getCell(row, ["Tomador", "Cliente", "Nome"])
      ).trim();

      const nif = onlyNumbers(
        getCell(row, ["Nif", "NIF", "Contribuinte"])
      );

      const startDate = excelDateToIso(
        getCell(row, ["PeriodoDe", "Período De", "Inicio", "DataInicio"])
      );

      const renewalDate = excelDateToIso(
        getCell(row, ["PeriodoAte", "Período Até", "Fim", "DataFim"])
      );

      const status = normalizeStatus(
        getCell(row, ["Situacao", "Situação", "Estado"])
      );

      const premium = parseNumber(
        getCell(row, ["Premio", "Prémio"])
      );

      const commercialPremium = parseNumber(
        getCell(row, ["PremioComercial", "Prémio Comercial"])
      );

      const paymentFrequency = normalizePaymentFrequency(
        getCell(row, ["FormaPagamento", "Forma Pagamento", "Fracionamento"])
      );

      const commission = parseNumber(
        getCell(row, ["Comissao", "Comissão"])
      );

      const existingClient = nif
        ? existingClientsByNif.get(nif)
        : null;

      const existingPolicy = policyNumber
        ? existingPoliciesByNumber.get(policyNumber)
        : null;

      return {
        index: index + 1,
        policyNumber,
        clientName,
        nif,
        startDate,
        renewalDate,
        status,
        premium,
        commercialPremium,
        paymentFrequency,
        commission,
        existingClient,
        existingPolicy,
      };
    });
  }, [rows, existingClientsByNif, existingPoliciesByNumber]);

  const summary = useMemo(() => {
    const clientsNew = analyzedRows.filter(
      (row) => row.nif && !row.existingClient
    ).length;

    const clientsExisting = analyzedRows.filter(
      (row) => row.nif && row.existingClient
    ).length;

    const policiesNew = analyzedRows.filter(
      (row) => row.policyNumber && !row.existingPolicy
    ).length;

    const policiesExisting = analyzedRows.filter(
      (row) => row.policyNumber && row.existingPolicy
    ).length;

    const rowsWithErrors = analyzedRows.filter(
      (row) => !row.policyNumber || !row.nif || !row.clientName
    ).length;

    return {
      total: analyzedRows.length,
      clientsNew,
      clientsExisting,
      policiesNew,
      policiesExisting,
      rowsWithErrors,
    };
  }, [analyzedRows]);

  async function readExcel(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setLoading(true);
    setErrorMessage("");
    setRows([]);
    setFileName(file.name);

    try {
      const XLSX = await loadSheetJs();
      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
      });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const jsonRows = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: false,
      });

      setRows(jsonRows);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "Não foi possível ler o Excel. Confirma se o ficheiro é o export da Real Vida."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={page}>
      <Sidebar active="importacoes" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Importações</h1>
            <p style={subtitle}>
              Importação segura com pré-visualização antes de gravar dados no CRM.
            </p>
          </div>
        </header>

        <section style={card}>
          <h2>Importar Excel Real Vida</h2>

          <p style={muted}>
            Esta versão apenas lê e valida o ficheiro. Não cria clientes nem apólices.
          </p>

          {!realVida && (
            <div style={warningBox}>
              Não encontrei a seguradora REAL VIDA na tabela insurers.
              A pré-visualização funciona, mas antes da importação final convém confirmar a seguradora.
            </div>
          )}

          <label style={uploadBox}>
            <strong>Escolher ficheiro Excel</strong>
            <span>{fileName || "Nenhum ficheiro selecionado"}</span>

            <input
              type="file"
              accept=".xls,.xlsx,.csv"
              onChange={readExcel}
              style={{ display: "none" }}
            />
          </label>

          {loading && (
            <p style={muted}>A ler ficheiro...</p>
          )}

          {errorMessage && (
            <div style={errorBox}>{errorMessage}</div>
          )}
        </section>

        {analyzedRows.length > 0 && (
          <>
            <section style={summaryGrid}>
              <SummaryCard title="Linhas encontradas" value={summary.total} color="#111827" />
              <SummaryCard title="Clientes existentes" value={summary.clientsExisting} color="#2563eb" />
              <SummaryCard title="Clientes novos" value={summary.clientsNew} color="#16a34a" />
              <SummaryCard title="Apólices existentes" value={summary.policiesExisting} color="#7c3aed" />
              <SummaryCard title="Apólices novas" value={summary.policiesNew} color="#0f766e" />
              <SummaryCard title="Linhas com avisos" value={summary.rowsWithErrors} color="#dc2626" />
            </section>

            <section style={card}>
              <div style={tableHeaderArea}>
                <div>
                  <h2>Pré-visualização</h2>
                  <p style={muted}>
                    Confirma estes dados antes de avançarmos para a fase de importação final.
                  </p>
                </div>
              </div>

              <div style={table}>
                <div style={tableHeader}>
                  <span>#</span>
                  <span>Cliente</span>
                  <span>NIF</span>
                  <span>Apólice</span>
                  <span>Início</span>
                  <span>Até</span>
                  <span>Prémio comercial</span>
                  <span>Comissão</span>
                  <span>Cliente</span>
                  <span>Apólice</span>
                </div>

                {analyzedRows.map((row) => {
                  const hasWarning =
                    !row.policyNumber ||
                    !row.nif ||
                    !row.clientName;

                  return (
                    <div
                      key={`${row.index}-${row.policyNumber}-${row.nif}`}
                      style={{
                        ...tableRow,
                        ...(hasWarning ? tableRowWarning : {}),
                      }}
                    >
                      <span>{row.index}</span>

                      <strong>
                        {row.clientName || "Sem nome"}
                      </strong>

                      <span>
                        {row.nif || "-"}
                      </span>

                      <span>
                        {row.policyNumber || "-"}
                      </span>

                      <span>
                        {row.startDate || "-"}
                      </span>

                      <span>
                        {row.renewalDate || "-"}
                      </span>

                      <strong>
                        {formatEuro(row.commercialPremium)}
                      </strong>

                      <span>
                        {formatEuro(row.commission)}
                      </span>

                      <span style={row.existingClient ? badgeExisting : badgeNew}>
                        {row.existingClient ? "EXISTE" : "NOVO"}
                      </span>

                      <span style={row.existingPolicy ? badgeExisting : badgeNew}>
                        {row.existingPolicy ? "EXISTE" : "NOVA"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ title, value, color }) {
  return (
    <div style={{ ...summaryCard, borderTop: `6px solid ${color}` }}>
      <p style={summaryLabel}>{title}</p>
      <h2 style={{ ...summaryValue, color }}>{value}</h2>
    </div>
  );
}

const page = {
  display: "flex",
  minHeight: "100vh",
  background: "#f3f4f6",
  fontFamily: "Arial, sans-serif",
};

const main = {
  flex: 1,
  padding: 40,
};

const header = {
  marginBottom: 30,
};

const title = {
  fontSize: 42,
  margin: 0,
};

const subtitle = {
  color: "#6b7280",
  marginTop: 10,
};

const card = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const uploadBox = {
  display: "grid",
  gap: 8,
  border: "2px dashed #bfdbfe",
  background: "#eff6ff",
  color: "#1d4ed8",
  padding: 24,
  borderRadius: 16,
  cursor: "pointer",
  marginTop: 18,
};

const warningBox = {
  background: "#fef3c7",
  border: "1px solid #f59e0b",
  color: "#92400e",
  padding: 14,
  borderRadius: 12,
  marginTop: 12,
};

const errorBox = {
  background: "#fee2e2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  padding: 14,
  borderRadius: 12,
  marginTop: 12,
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 16,
  marginBottom: 24,
};

const summaryCard = {
  background: "white",
  padding: 20,
  borderRadius: 16,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const summaryLabel = {
  color: "#6b7280",
  margin: 0,
};

const summaryValue = {
  fontSize: 30,
  margin: "10px 0 0",
};

const tableHeaderArea = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
};

const table = {
  display: "grid",
  gap: 8,
  overflowX: "auto",
};

const tableHeader = {
  display: "grid",
  gridTemplateColumns: "0.4fr 2fr 1fr 1.2fr 1fr 1fr 1.2fr 1fr 0.8fr 0.8fr",
  gap: 10,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 13,
  minWidth: 1150,
};

const tableRow = {
  display: "grid",
  gridTemplateColumns: "0.4fr 2fr 1fr 1.2fr 1fr 1fr 1.2fr 1fr 0.8fr 0.8fr",
  gap: 10,
  padding: "12px 14px",
  borderBottom: "1px solid #e5e7eb",
  alignItems: "center",
  minWidth: 1150,
  fontSize: 13,
};

const tableRowWarning = {
  background: "#fff7ed",
};

const badgeExisting = {
  background: "#dbeafe",
  color: "#1d4ed8",
  padding: "5px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: "bold",
  textAlign: "center",
};

const badgeNew = {
  background: "#dcfce7",
  color: "#166534",
  padding: "5px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: "bold",
  textAlign: "center",
};

const muted = {
  color: "#6b7280",
};
