import { useState } from "react";
import Link from "next/link";
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
      clients(id, name, nif, phone, email),
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

function calculateAge(date) {
  if (!date) return null;

  const today = new Date();
  const birthDate = new Date(date);

  let age = today.getFullYear() - birthDate.getFullYear();

  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

function calculateAnnualCommission(policy) {
  const commission = Number(policy.commission_per_payment || 0);
  const frequency = String(policy.payment_frequency || "anual").toLowerCase();

  if (frequency === "mensal") return commission * 12;
  if (frequency === "trimestral") return commission * 4;
  if (frequency === "semestral") return commission * 2;

  return commission;
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

function buildTopClientsPremiumReport(policies) {
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

function buildTopClientsCommissionReport(policies) {
  const activePolicies = policies.filter(
    (policy) => policy.status !== "anulada"
  );

  const clientStats = {};

  activePolicies.forEach((policy) => {
    const clientId = policy.client_id || "sem_cliente";
    const clientName = policy.clients?.name || "Sem cliente";
    const clientNif = policy.clients?.nif || "-";
    const premium = Number(policy.annual_premium || 0);
    const commission = calculateAnnualCommission(policy);

    if (!clientStats[clientId]) {
      clientStats[clientId] = {
        id: clientId,
        name: clientName,
        nif: clientNif,
        policies: 0,
        premium: 0,
        commission: 0,
      };
    }

    clientStats[clientId].policies += 1;
    clientStats[clientId].premium += premium;
    clientStats[clientId].commission += commission;
  });

  return Object.values(clientStats)
    .sort((a, b) => b.commission - a.commission)
    .slice(0, 10);
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
      clientId: policy.client_id || null,
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

function buildClientsUntil40Report(clients) {
  return clients
    .map((client) => ({
      id: client.id,
      name: client.name || "Sem nome",
      nif: client.nif || "-",
      phone: client.phone || "-",
      email: client.email || "-",
      birthDate: client.birth_date || null,
      age: calculateAge(client.birth_date),
    }))
    .filter((client) => client.age !== null && client.age <= 40)
    .sort((a, b) => {
      if (a.age !== b.age) return a.age - b.age;
      return a.name.localeCompare(b.name);
    });
}

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

export default function Relatorios({ clients, policies }) {
  const [selectedReport, setSelectedReport] = useState("topClientesPremio");

  const topClientsPremium = buildTopClientsPremiumReport(policies);
  const topClientsCommission = buildTopClientsCommissionReport(policies);

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

  const realVida2026 = buildRealVida2026Report(policies);

  const realVida2026Totals = {
    clients: new Set(realVida2026.map((item) => item.clientNif)).size,
    policies: realVida2026.length,
    premium: realVida2026.reduce(
      (sum, item) => sum + Number(item.annualPremium || 0),
      0
    ),
  };

  const clientsUntil40 = buildClientsUntil40Report(clients);

  const selectedReportInfo = reportOptions.find(
    (report) => report.value === selectedReport
  );

  function printReportPdf() {
    window.print();
  }

  function exportTopClientsPremiumCsv() {
    const header = [
      "Posição",
      "Cliente",
      "NIF",
      "Nº Apólices em vigor",
      "Prémio total em vigor",
    ];

    const rows = topClientsPremium.map((client, index) => [
      index + 1,
      client.name,
      client.nif,
      client.policies,
      client.premium.toFixed(2),
    ]);

    exportCsv(
      "top_10_clientes_premio_em_vigor.csv",
      header,
      rows
    );
  }

  function exportTopClientsCommissionCsv() {
    const header = [
      "Posição",
      "Cliente",
      "NIF",
      "Nº Apólices em vigor",
      "Prémio total em vigor",
      "Comissão anual",
    ];

    const rows = topClientsCommission.map((client, index) => [
      index + 1,
      client.name,
      client.nif,
      client.policies,
      client.premium.toFixed(2),
      client.commission.toFixed(2),
    ]);

    exportCsv(
      "top_10_clientes_comissoes.csv",
      header,
      rows
    );
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

    exportCsv(
      "clientes_sem_seguro_saude.csv",
      header,
      rows
    );
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

    exportCsv(
      "clientes_sem_seguro_casa.csv",
      header,
      rows
    );
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

  function exportClientsUntil40Csv() {
    const header = [
      "Cliente",
      "NIF",
      "Idade",
      "Data nascimento",
      "Telefone",
      "Email",
    ];

    const rows = clientsUntil40.map((client) => [
      client.name,
      client.nif,
      client.age,
      formatDate(client.birthDate),
      client.phone,
      client.email,
    ]);

    exportCsv(
      "clientes_ate_40_anos.csv",
      header,
      rows
    );
  }

  function exportSelectedReport() {
    if (selectedReport === "topClientesPremio") {
      exportTopClientsPremiumCsv();
      return;
    }

    if (selectedReport === "topClientesComissoes") {
      exportTopClientsCommissionCsv();
      return;
    }

    if (selectedReport === "semCasa") {
      exportClientsWithoutHomeCsv();
      return;
    }

    if (selectedReport === "semSaude") {
      exportClientsWithoutHealthCsv();
      return;
    }

    if (selectedReport === "realVida2026") {
      exportRealVida2026Csv();
      return;
    }

    if (selectedReport === "clientesAte40") {
      exportClientsUntil40Csv();
    }
  }

  return (
    <div style={page}>
      <Sidebar active="relatorios" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Relatórios</h1>
            <p style={subtitle}>
              Seleciona um relatório e consulta os dados na hora.
            </p>
          </div>
        </header>

        <section style={selectorCard}>
          <label style={label}>Selecionar relatório</label>

          <select
            style={select}
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value)}
          >
            {reportOptions.map((report) => (
              <option key={report.value} value={report.value}>
                {report.label}
              </option>
            ))}
          </select>

          {selectedReportInfo && (
            <p style={muted}>
              {selectedReportInfo.description}
            </p>
          )}

          <div style={buttonGroup}>
            <button
              style={secondaryButton}
              onClick={printReportPdf}
            >
              Gerar PDF
            </button>

            <button
              style={button}
              onClick={exportSelectedReport}
            >
              Exportar Excel
            </button>
          </div>
        </section>

        {selectedReport === "topClientesPremio" && (
          <section style={panel}>
            <h2 style={panelTitle}>
              Top 10 clientes por prémio total em vigor
            </h2>

            <p style={muted}>
              Considera apenas apólices em vigor. Apólices anuladas ficam excluídas.
            </p>

            {topClientsPremium.length === 0 ? (
              <p style={muted}>
                Sem dados disponíveis.
              </p>
            ) : (
              <div style={table}>
                <div style={tableHeaderTop}>
                  <span>#</span>
                  <span>Cliente</span>
                  <span>NIF</span>
                  <span>Apólices</span>
                  <span>Prémio em vigor</span>
                  <span>Ficha</span>
                </div>

                {topClientsPremium.map((client, index) => (
                  <div
                    key={client.id}
                    style={tableRowTop}
                  >
                    <strong>{index + 1}</strong>
                    <strong>{client.name}</strong>
                    <span>{client.nif}</span>
                    <span>{client.policies}</span>
                    <strong style={premiumValue}>
                      {formatEuro(client.premium)}
                    </strong>

                    {client.id && client.id !== "sem_cliente" ? (
                      <Link
                        href={`/clientes/${client.id}`}
                        style={openClientButton}
                      >
                        Abrir ficha
                      </Link>
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {selectedReport === "topClientesComissoes" && (
          <section style={panel}>
            <h2 style={panelTitle}>
              Top 10 clientes por comissões
            </h2>

            <p style={muted}>
              Considera a comissão anual estimada das apólices em vigor.
            </p>

            {topClientsCommission.length === 0 ? (
              <p style={muted}>
                Sem dados disponíveis.
              </p>
            ) : (
              <div style={table}>
                <div style={tableHeaderCommission}>
                  <span>#</span>
                  <span>Cliente</span>
                  <span>NIF</span>
                  <span>Apólices</span>
                  <span>Prémio</span>
                  <span>Comissão anual</span>
                  <span>Ficha</span>
                </div>

                {topClientsCommission.map((client, index) => (
                  <div
                    key={client.id}
                    style={tableRowCommission}
                  >
                    <strong>{index + 1}</strong>
                    <strong>{client.name}</strong>
                    <span>{client.nif}</span>
                    <span>{client.policies}</span>
                    <span>{formatEuro(client.premium)}</span>
                    <strong style={premiumValue}>
                      {formatEuro(client.commission)}
                    </strong>

                    {client.id && client.id !== "sem_cliente" ? (
                      <Link
                        href={`/clientes/${client.id}`}
                        style={openClientButton}
                      >
                        Abrir ficha
                      </Link>
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {selectedReport === "semSaude" && (
          <section style={panel}>
            <h2 style={panelTitle}>
              Clientes sem seguro de saúde
            </h2>

            <p style={muted}>
              Considera clientes sem nenhuma apólice SAÚDE em vigor.
            </p>

            {clientsWithoutHealthInsurance.length === 0 ? (
              <p style={muted}>
                Todos os clientes têm seguro de saúde em vigor.
              </p>
            ) : (
              <ClientsSimpleTable clients={clientsWithoutHealthInsurance} />
            )}
          </section>
        )}

        {selectedReport === "semCasa" && (
          <section style={panel}>
            <h2 style={panelTitle}>
              Clientes sem seguro da casa
            </h2>

            <p style={muted}>
              Considera clientes que não têm nenhuma apólice CASA em vigor.
            </p>

            {clientsWithoutHomeInsurance.length === 0 ? (
              <p style={muted}>
                Todos os clientes têm seguro da casa em vigor.
              </p>
            ) : (
              <ClientsSimpleTable clients={clientsWithoutHomeInsurance} />
            )}
          </section>
        )}

        {selectedReport === "realVida2026" && (
          <section style={panel}>
            <h2 style={panelTitle}>
              Real Vida — Apólices iniciadas em 2026
            </h2>

            <p style={muted}>
              Lista de clientes, apólices e prémios anuais de apólices em vigor iniciadas em 2026 na Real Vida.
            </p>

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

        {selectedReport === "clientesAte40" && (
          <section style={panel}>
            <h2 style={panelTitle}>
              Clientes até 40 anos
            </h2>

            <p style={muted}>
              Lista de clientes com data de nascimento registada e idade até 40 anos.
            </p>

            {clientsUntil40.length === 0 ? (
              <p style={muted}>
                Sem clientes até 40 anos com data de nascimento registada.
              </p>
            ) : (
              <div style={table}>
                <div style={tableHeaderClientsAge}>
                  <span>Cliente</span>
                  <span>NIF</span>
                  <span>Idade</span>
                  <span>Data nascimento</span>
                  <span>Telefone</span>
                  <span>Ficha</span>
                </div>

                {clientsUntil40.map((client) => (
                  <div
                    key={client.id}
                    style={tableRowClientsAge}
                  >
                    <strong>{client.name}</strong>
                    <span>{client.nif}</span>
                    <strong>{client.age}</strong>
                    <span>{formatDate(client.birthDate)}</span>
                    <span>{client.phone}</span>

                    <Link
                      href={`/clientes/${client.id}`}
                      style={openClientButton}
                    >
                      Abrir ficha
                    </Link>
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

function ClientsSimpleTable({ clients }) {
  return (
    <div style={table}>
      <div style={tableHeaderHome}>
        <span>Cliente</span>
        <span>NIF</span>
        <span>Telefone</span>
        <span>Email</span>
        <span>Ficha</span>
      </div>

      {clients.map((client) => (
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

          <Link
            href={`/clientes/${client.id}`}
            style={openClientButton}
          >
            Abrir ficha
          </Link>
        </div>
      ))}
    </div>
  );
}

const reportOptions = [
  {
    value: "topClientesPremio",
    label: "Top 10 clientes por prémio",
    description: "Clientes com maior prémio comercial total em vigor.",
  },
  {
    value: "topClientesComissoes",
    label: "Top 10 clientes por comissões",
    description: "Clientes com maior comissão anual estimada.",
  },
  {
    value: "semCasa",
    label: "Clientes sem seguro da casa",
    description: "Clientes que não têm nenhuma apólice CASA em vigor.",
  },
  {
    value: "semSaude",
    label: "Clientes sem seguro de saúde",
    description: "Clientes que não têm nenhuma apólice SAÚDE em vigor.",
  },
  {
    value: "realVida2026",
    label: "Real Vida 2026",
    description: "Apólices Real Vida iniciadas em 2026.",
  },
  {
    value: "clientesAte40",
    label: "Clientes até 40 anos",
    description: "Clientes com idade até 40 anos.",
  },
];

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

const selectorCard = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  display: "grid",
  gap: 12,
};

const label = {
  fontSize: 13,
  color: "#6b7280",
  fontWeight: "bold",
};

const select = {
  padding: 14,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 16,
  maxWidth: 520,
};

const panel = {
  background: "white",
  borderRadius: 18,
  padding: 24,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const panelTitle = {
  marginTop: 0,
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

const tableHeaderTop = {
  display: "grid",
  gridTemplateColumns: "0.4fr 2fr 1fr 1fr 1.4fr 1fr",
  gap: 12,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 14,
};

const tableRowTop = {
  display: "grid",
  gridTemplateColumns: "0.4fr 2fr 1fr 1fr 1.4fr 1fr",
  gap: 12,
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
  alignItems: "center",
};

const tableHeaderCommission = {
  display: "grid",
  gridTemplateColumns: "0.4fr 2fr 1fr 1fr 1.3fr 1.3fr 1fr",
  gap: 12,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 14,
};

const tableRowCommission = {
  display: "grid",
  gridTemplateColumns: "0.4fr 2fr 1fr 1fr 1.3fr 1.3fr 1fr",
  gap: 12,
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
  alignItems: "center",
};

const tableHeaderHome = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1.6fr 1fr",
  gap: 12,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 14,
};

const tableRowHome = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1.6fr 1fr",
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

const tableHeaderClientsAge = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 0.7fr 1.2fr 1fr 1fr",
  gap: 12,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 14,
};

const tableRowClientsAge = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 0.7fr 1.2fr 1fr 1fr",
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

const openClientButton = {
  background: "#2563eb",
  color: "white",
  padding: "9px 12px",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: "bold",
  textAlign: "center",
};

const premiumValue = {
  color: "#16a34a",
};

const muted = {
  color: "#6b7280",
};
