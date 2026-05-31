import { useState } from "react";
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
    .select("*");

  const { data: policies } = await supabase
    .from("policies")
    .select(`
      *,
      clients(id, name, nif),
      insurers(name)
    `);

  return {
    props: {
      clients: clients || [],
      policies: policies || [],
    },
  };
}

function formatEuro(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-PT").format(new Date(date));
}

function buildRealVida2026Report(policies) {
  return policies
    .filter((policy) => {
      const insurerName = String(policy.insurers?.name || "")
        .toLowerCase()
        .trim();

      const startDate = policy.start_date
        ? new Date(policy.start_date)
        : null;

      return (
        insurerName === "real vida" &&
        startDate &&
        startDate >= new Date("2026-01-01") &&
        startDate <= new Date("2026-12-31") &&
        policy.status !== "anulada"
      );
    })
    .map((policy) => ({
      id: policy.id,
      clientName: policy.clients?.name || "Sem cliente",
      clientNif: policy.clients?.nif || "-",
      policyNumber: policy.policy_number || "-",
      branch: policy.branch || "-",
      startDate: policy.start_date || null,
      annualPremium: Number(policy.annual_premium || 0),
    }))
    .sort((a, b) => {
      const nameCompare = a.clientName.localeCompare(b.clientName);

      if (nameCompare !== 0) return nameCompare;

      return new Date(a.startDate || 0) - new Date(b.startDate || 0);
    });
}

function buildClientsWithoutHomeInsuranceReport(clients, policies) {
  const clientsWithHomeInsurance = new Set();

  policies
    .filter((policy) => policy.status !== "anulada")
    .forEach((policy) => {
      const branch = String(policy.branch || "")
        .toLowerCase()
        .trim();

      if (branch === "casa" && policy.client_id) {
        clientsWithHomeInsurance.add(policy.client_id);
      }
    });

  return clients
    .filter((client) => !clientsWithHomeInsurance.has(client.id))
    .map((client) => ({
      id: client.id,
      name: client.name || "Sem nome",
      nif: client.nif || "-",
      phone: client.phone || "-",
      email: client.email || "-",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}


function buildClientsWithoutHealthInsuranceReport(clients, policies) {
  const clientsWithHealthInsurance = new Set();

  policies
    .filter((policy) => policy.status !== "anulada")
    .forEach((policy) => {
      const branch = String(policy.branch || "")
        .toLowerCase()
        .trim();

      if (branch === "saude" && policy.client_id) {
        clientsWithHealthInsurance.add(policy.client_id);
      }
    });

  return clients
    .filter((client) => !clientsWithHealthInsurance.has(client.id))
    .map((client) => ({
      id: client.id,
      name: client.name || "Sem nome",
      nif: client.nif || "-",
      phone: client.phone || "-",
      email: client.email || "-",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildTopClientsReport(policies) {
  const activePolicies = policies.filter(
    (policy) => policy.status !== "anulada"
  );

  const clientStats = {};

  activePolicies.forEach((policy) => {
    const clientId = policy.client_id || "sem_cliente";
    const clientName = policy.clients?.name || "Sem cliente";
    const clientNif = policy.clients?.nif || "-";
    const premium = Number(policy.annual_premium || 0);

    if (!clientStats[clientId]) {
      clientStats[clientId] = {
        id: clientId,
        name: clientName,
        nif: clientNif,
        policies: 0,
        premium: 0,
      };
    }

    clientStats[clientId].policies += 1;
    clientStats[clientId].premium += premium;
  });

  return Object.values(clientStats)
    .sort((a, b) => b.premium - a.premium)
    .slice(0, 10);
}

export default function Relatorios({ clients, policies }) {
  const [selectedReport, setSelectedReport] = useState(null);

  const topClients = buildTopClientsReport(policies);

  const realVida2026 = buildRealVida2026Report(policies);

  const realVida2026Totals = {
    clients: new Set(realVida2026.map((item) => item.clientNif)).size,
    policies: realVida2026.length,
    premium: realVida2026.reduce(
      (sum, item) => sum + Number(item.annualPremium || 0),
      0
    ),
  };

  const clientsWithoutHomeInsurance =
    buildClientsWithoutHomeInsuranceReport(
      clients,
      policies
    );

  const clientsWithoutHealthInsurance =
    buildClientsWithoutHealthInsuranceReport(
      clients,
      policies
    );

  function exportCsv(filename, header, rows) {
    const csvContent = [header, ...rows]
      .map((row) =>
        row
          .map((cell) =>
            `"${String(cell).replace(/"/g, '""')}"`
          )
          .join(";")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", filename);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function exportRealVida2026Csv() {
    const header = [
      "Cliente",
      "NIF",
      "Nº Apólice",
      "Ramo",
      "Data início",
      "Prémio anual",
    ];

    const rows = realVida2026.map((item) => [
      item.clientName,
      item.clientNif,
      item.policyNumber,
      item.branch,
      formatDate(item.startDate),
      item.annualPremium.toFixed(2),
    ]);

    exportCsv(
      "real_vida_apolices_iniciadas_2026.csv",
      header,
      rows
    );
  }

  function exportTopClientsCsv() {
    const header = [
      "Posição",
      "Cliente",
      "NIF",
      "Nº Apólices em vigor",
      "Prémio total em vigor",
    ];

    const rows = topClients.map((client, index) => [
      index + 1,
      client.name,
      client.nif,
      client.policies,
      client.premium.toFixed(2),
    ]);

    const csvContent = [header, ...rows]
      .map((row) =>
        row
          .map((cell) =>
            `"${String(cell).replace(/"/g, '""')}"`
          )
          .join(";")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute(
      "download",
      "top_10_clientes_premio_em_vigor.csv"
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function printTopClientsPdf() {
    window.print();
  }


  function exportClientsWithoutHealthCsv() {
    const header = [
      "Cliente",
      "NIF",
      "Telefone",
      "Email",
    ];

    const rows = clientsWithoutHealthInsurance.map((client) => [
      client.name,
      client.nif,
      client.phone,
      client.email,
    ]);

    const csvContent = [header, ...rows]
      .map((row) =>
        row
          .map((cell) =>
            `"${String(cell).replace(/"/g, '""')}"`
          )
          .join(";")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute(
      "download",
      "clientes_sem_seguro_saude.csv"
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function exportClientsWithoutHomeCsv() {
    const header = [
      "Cliente",
      "NIF",
      "Telefone",
      "Email",
    ];

    const rows = clientsWithoutHomeInsurance.map((client) => [
      client.name,
      client.nif,
      client.phone,
      client.email,
    ]);

    const csvContent = [header, ...rows]
      .map((row) =>
        row
          .map((cell) =>
            `"${String(cell).replace(/"/g, '""')}"`
          )
          .join(";")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute(
      "download",
      "clientes_sem_seguro_casa.csv"
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  return (
    <div style={page}>
      <Sidebar active="relatorios" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Relatórios</h1>
            <p style={subtitle}>
              Relatórios pré-definidos para análise da carteira.
            </p>
          </div>
        </header>

        <section style={reportsGrid}>
          <button
            style={{
              ...reportCard,
              borderTop: "6px solid #2563eb",
            }}
            onClick={() =>
              setSelectedReport("topClientes")
            }
          >
            <h2 style={reportTitle}>
              Top 10 clientes
            </h2>

            <p style={reportText}>
              Clientes com maior prémio comercial total em vigor.
            </p>

            <strong style={reportAction}>
              Abrir relatório
            </strong>
          </button>

          <button
            style={{
              ...reportCard,
              borderTop: "6px solid #f59e0b",
            }}
            onClick={() =>
              setSelectedReport("semCasa")
            }
          >
            <h2 style={reportTitle}>
              Clientes sem seguro da casa
            </h2>

            <p style={reportText}>
              Lista de clientes que não têm apólice CASA em vigor.
            </p>

            <strong style={reportAction}>
              Abrir relatório
            </strong>
          </button>
          <button
            style={{
              ...reportCard,
              borderTop: "6px solid #16a34a",
            }}
            onClick={() =>
              setSelectedReport("semSaude")
            }
          >
            <h2 style={reportTitle}>
              Clientes sem seguro de saúde
            </h2>

            <p style={reportText}>
              Lista de clientes que não têm seguro de saúde em vigor.
            </p>

            <strong style={reportAction}>
              Abrir relatório
            </strong>
          </button>

          <button
            style={{
              ...reportCard,
              borderTop: "6px solid #7c3aed",
            }}
            onClick={() =>
              setSelectedReport("realVida2026")
            }
          >
            <h2 style={reportTitle}>
              Real Vida 2026
            </h2>

            <p style={reportText}>
              Clientes, apólices e prémios anuais de apólices iniciadas em 2026 na Real Vida.
            </p>

            <strong style={reportAction}>
              Abrir relatório
            </strong>
          </button>

        </section>

        {selectedReport === "topClientes" && (
          <section style={panel}>
            <div style={reportHeader}>
              <div>
                <h2 style={panelTitle}>
                  Top 10 clientes por prémio total em vigor
                </h2>

                <p style={muted}>
                  Considera apenas apólices em vigor. Apólices anuladas ficam excluídas.
                </p>
              </div>

              <div style={buttonGroup}>
                <button
                  style={secondaryButton}
                  onClick={printTopClientsPdf}
                >
                  Gerar PDF
                </button>

                <button
                  style={button}
                  onClick={exportTopClientsCsv}
                >
                  Exportar Excel
                </button>
              </div>
            </div>

            {topClients.length === 0 ? (
              <p style={muted}>
                Sem dados disponíveis.
              </p>
            ) : (
              <div style={table}>
                <div style={tableHeader}>
                  <span>#</span>
                  <span>Cliente</span>
                  <span>NIF</span>
                  <span>Apólices</span>
                  <span>Prémio em vigor</span>
                </div>

                {topClients.map((client, index) => (
                  <div
                    key={client.id}
                    style={tableRow}
                  >
                    <strong>
                      {index + 1}
                    </strong>

                    <strong>
                      {client.name}
                    </strong>

                    <span>
                      {client.nif}
                    </span>

                    <span>
                      {client.policies}
                    </span>

                    <strong style={premiumValue}>
                      {formatEuro(client.premium)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}


        {selectedReport === "realVida2026" && (
          <section style={panel}>
            <div style={reportHeader}>
              <div>
                <h2 style={panelTitle}>
                  Real Vida — Apólices iniciadas em 2026
                </h2>

                <p style={muted}>
                  Lista de clientes, apólices e prémios anuais de apólices em vigor iniciadas em 2026 na Real Vida.
                </p>
              </div>

              <div style={buttonGroup}>
                <button
                  style={secondaryButton}
                  onClick={printTopClientsPdf}
                >
                  Gerar PDF
                </button>

                <button
                  style={button}
                  onClick={exportRealVida2026Csv}
                >
                  Exportar Excel
                </button>
              </div>
            </div>

            <div style={summaryGrid}>
              <div style={summaryBox}>
                <span style={summaryLabel}>Clientes</span>
                <strong style={summaryValue}>{realVida2026Totals.clients}</strong>
              </div>

              <div style={summaryBox}>
                <span style={summaryLabel}>Apólices</span>
                <strong style={summaryValue}>{realVida2026Totals.policies}</strong>
              </div>

              <div style={summaryBox}>
                <span style={summaryLabel}>Prémio anual total</span>
                <strong style={summaryValue}>{formatEuro(realVida2026Totals.premium)}</strong>
              </div>
            </div>

            {realVida2026.length === 0 ? (
              <p style={muted}>
                Sem apólices Real Vida iniciadas em 2026.
              </p>
            ) : (
              <div style={table}>
                <div style={tableHeaderRealVida}>
                  <span>Cliente</span>
                  <span>NIF</span>
                  <span>Nº Apólice</span>
                  <span>Ramo</span>
                  <span>Data início</span>
                  <span>Prémio anual</span>
                </div>

                {realVida2026.map((item) => (
                  <div
                    key={item.id}
                    style={tableRowRealVida}
                  >
                    <strong>
                      {item.clientName}
                    </strong>

                    <span>
                      {item.clientNif}
                    </span>

                    <span>
                      {item.policyNumber}
                    </span>

                    <span>
                      {item.branch}
                    </span>

                    <span>
                      {formatDate(item.startDate)}
                    </span>

                    <strong style={premiumValue}>
                      {formatEuro(item.annualPremium)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}


        {selectedReport === "semSaude" && (
          <section style={panel}>
            <div style={reportHeader}>
              <div>
                <h2 style={panelTitle}>
                  Clientes sem seguro de saúde
                </h2>

                <p style={muted}>
                  Considera clientes sem nenhuma apólice SAÚDE em vigor.
                </p>
              </div>

              <div style={buttonGroup}>
                <button
                  style={secondaryButton}
                  onClick={printTopClientsPdf}
                >
                  Gerar PDF
                </button>

                <button
                  style={button}
                  onClick={exportClientsWithoutHealthCsv}
                >
                  Exportar Excel
                </button>
              </div>
            </div>

            {clientsWithoutHealthInsurance.length === 0 ? (
              <p style={muted}>
                Todos os clientes têm seguro de saúde em vigor.
              </p>
            ) : (
              <div style={table}>
                <div style={tableHeaderHome}>
                  <span>Cliente</span>
                  <span>NIF</span>
                  <span>Telefone</span>
                  <span>Email</span>
                </div>

                {clientsWithoutHealthInsurance.map((client) => (
                  <div
                    key={client.id}
                    style={tableRowHome}
                  >
                    <strong>
                      {client.name}
                    </strong>

                    <span>
                      {client.nif}
                    </span>

                    <span>
                      {client.phone}
                    </span>

                    <span>
                      {client.email}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}


        {selectedReport === "semCasa" && (
          <section style={panel}>
            <div style={reportHeader}>
              <div>
                <h2 style={panelTitle}>
                  Clientes sem seguro da casa
                </h2>

                <p style={muted}>
                  Considera clientes que não têm nenhuma apólice CASA em vigor.
                </p>
              </div>

              <div style={buttonGroup}>
                <button
                  style={secondaryButton}
                  onClick={printTopClientsPdf}
                >
                  Gerar PDF
                </button>

                <button
                  style={button}
                  onClick={exportClientsWithoutHomeCsv}
                >
                  Exportar Excel
                </button>
              </div>
            </div>

            {clientsWithoutHomeInsurance.length === 0 ? (
              <p style={muted}>
                Todos os clientes têm seguro da casa em vigor.
              </p>
            ) : (
              <div style={table}>
                <div style={tableHeaderHome}>
                  <span>Cliente</span>
                  <span>NIF</span>
                  <span>Telefone</span>
                  <span>Email</span>
                </div>

                {clientsWithoutHomeInsurance.map((client) => (
                  <div
                    key={client.id}
                    style={tableRowHome}
                  >
                    <strong>
                      {client.name}
                    </strong>

                    <span>
                      {client.nif}
                    </span>

                    <span>
                      {client.phone}
                    </span>

                    <span>
                      {client.email}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
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

const reportsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 18,
  marginBottom: 30,
};

const reportCard = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  border: "none",
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  cursor: "pointer",
  textAlign: "left",
};

const reportTitle = {
  margin: 0,
  fontSize: 22,
  color: "#111827",
};

const reportText = {
  color: "#6b7280",
  marginTop: 10,
  lineHeight: 1.4,
};

const reportAction = {
  display: "inline-block",
  marginTop: 12,
  color: "#2563eb",
};

const panel = {
  background: "white",
  borderRadius: 18,
  padding: 24,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const reportHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  alignItems: "flex-start",
  marginBottom: 24,
};

const panelTitle = {
  margin: 0,
};

const buttonGroup = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const button = {
  background: "#111827",
  color: "white",
  border: "none",
  padding: "11px 16px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryButton = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "11px 16px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const table = {
  display: "grid",
  gap: 8,
};

const tableHeader = {
  display: "grid",
  gridTemplateColumns: "0.4fr 2fr 1fr 1fr 1.4fr",
  gap: 12,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 14,
};

const tableRow = {
  display: "grid",
  gridTemplateColumns: "0.4fr 2fr 1fr 1fr 1.4fr",
  gap: 12,
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
  alignItems: "center",
};

const tableHeaderHome = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1.6fr",
  gap: 12,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 14,
};

const tableRowHome = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1.6fr",
  gap: 12,
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
  alignItems: "center",
};

const tableHeaderRealVida = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1.2fr 1fr 1fr 1.2fr",
  gap: 12,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 14,
};

const tableRowRealVida = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1.2fr 1fr 1fr 1.2fr",
  gap: 12,
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
  alignItems: "center",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
  marginBottom: 24,
};

const summaryBox = {
  background: "#f9fafb",
  padding: 16,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  display: "grid",
  gap: 8,
};

const summaryLabel = {
  color: "#6b7280",
  fontSize: 13,
};

const summaryValue = {
  color: "#111827",
  fontSize: 24,
};

const premiumValue = {
  color: "#16a34a",
};

const muted = {
  color: "#6b7280",
};
