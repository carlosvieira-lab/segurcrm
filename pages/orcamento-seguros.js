mport Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "../components/Sidebar";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

const monthNames = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
];

const annualObjectives = {
  AUTO: {
    premium: 3800,
    commission: 342,
  },
  ATS: {
    premium: 500,
    commission: 50,
  },
  MR: {
    premium: 700,
    commission: 77,
  },
  "VIDA APS": {
    premium: 350,
    commission: 98,
  },
  SAUDE: {
    premium: 150,
    commission: 20,
  },
  DIVERSOS: {
    premium: 100,
    commission: 10,
  },
};

const groups = [
  "AUTO",
  "ATS",
  "MR",
  "VIDA APS",
  "SAUDE",
  "OUTROS",
];

function normalizeText(value) {
  return String(value || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function mapBranchToGroup(branch) {
  const value = normalizeText(branch);

  if (value === "AUTOMOVEL" || value === "AUTO") {
    return "AUTO";
  }

  if (value === "ATCO" || value === "ATCP" || value === "ATS") {
    return "ATS";
  }

  if (
    value === "CASA" ||
    value === "MREMP" ||
    value === "MULTIRRISCOS" ||
    value === "MR"
  ) {
    return "MR";
  }

  if (value === "VIDA" || value === "APS" || value === "VIDA APS") {
    return "VIDA APS";
  }

  if (value === "SAUDE") {
    return "SAUDE";
  }

  return "OUTROS";
}

function getFrequencyMultiplier(frequency) {
  const value = normalizeText(frequency);

  if (value === "MENSAL") return 12;
  if (value === "TRIMESTRAL") return 4;
  if (value === "SEMESTRAL") return 2;

  return 1;
}

function getMonthlyPremium(policy) {
  const annualPremium = Number(policy.annual_premium || 0);
  const multiplier = getFrequencyMultiplier(policy.payment_frequency);

  if (!multiplier) return 0;

  return annualPremium / multiplier;
}

function getMonthlyCommission(policy) {
  return Number(policy.commission_per_payment || 0);
}

function formatEuro(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function getPolicyIssueDate(policy) {
  return (
    policy.policy_issue_date ||
    policy.issue_date ||
    policy.created_at ||
    null
  );
}

export async function getServerSideProps() {
  const { data: policies, error } = await supabase
    .from("policies")
    .select(
      "id, policy_number, branch, status, annual_premium, commission_per_payment, payment_frequency, policy_issue_date, issue_date, created_at, insurers(name), clients(name)"
    )
    .order("policy_issue_date", { ascending: true });

  return {
    props: {
      policies: policies || [],
      loadError: error?.message || null,
    },
  };
}

export default function OrcamentoSeguros({ policies, loadError }) {
  const currentYear = new Date().getFullYear();

  const activePolicies = (policies || []).filter(
    (policy) => normalizeText(policy.status) !== "ANULADA"
  );

  const yearPolicies = activePolicies.filter((policy) => {
    const issueDate = getPolicyIssueDate(policy);

    if (!issueDate) return false;

    return new Date(issueDate).getFullYear() === currentYear;
  });

  const monthlyData = monthNames.map((month, index) => {
    const rows = groups.map((group) => {
      const groupPolicies = yearPolicies.filter((policy) => {
        const issueDate = getPolicyIssueDate(policy);

        if (!issueDate) return false;

        const date = new Date(issueDate);

        return (
          date.getMonth() === index &&
          mapBranchToGroup(policy.branch) === group
        );
      });

      const premiumAchieved = groupPolicies.reduce(
        (sum, policy) => sum + getMonthlyPremium(policy),
        0
      );

      const commissionAchieved = groupPolicies.reduce(
        (sum, policy) => sum + getMonthlyCommission(policy),
        0
      );

      const premiumObjective = annualObjectives[group].premium;
      const commissionObjective = annualObjectives[group].commission;

      return {
        group,
        count: groupPolicies.length,
        premiumAchieved,
        commissionAchieved,
        premiumObjective,
        commissionObjective,
        premiumGap: premiumAchieved - premiumObjective,
        commissionGap: commissionAchieved - commissionObjective,
      };
    });

    const totals = rows.reduce(
      (acc, row) => {
        acc.count += row.count;
        acc.premiumAchieved += row.premiumAchieved;
        acc.commissionAchieved += row.commissionAchieved;
        acc.premiumObjective += row.premiumObjective;
        acc.commissionObjective += row.commissionObjective;
        acc.premiumGap += row.premiumGap;
        acc.commissionGap += row.commissionGap;
        return acc;
      },
      {
        count: 0,
        premiumAchieved: 0,
        commissionAchieved: 0,
        premiumObjective: 0,
        commissionObjective: 0,
        premiumGap: 0,
        commissionGap: 0,
      }
    );

    return {
      month,
      rows,
      totals,
    };
  });

  const annualTotals = monthlyData.reduce(
    (acc, month) => {
      acc.count += month.totals.count;
      acc.premiumAchieved += month.totals.premiumAchieved;
      acc.commissionAchieved += month.totals.commissionAchieved;
      acc.premiumObjective += month.totals.premiumObjective;
      acc.commissionObjective += month.totals.commissionObjective;
      acc.premiumGap += month.totals.premiumGap;
      acc.commissionGap += month.totals.commissionGap;
      return acc;
    },
    {
      count: 0,
      premiumAchieved: 0,
      commissionAchieved: 0,
      premiumObjective: 0,
      commissionObjective: 0,
      premiumGap: 0,
      commissionGap: 0,
    }
  );

  return (
    <div style={page}>
      <Sidebar active="orcamento-seguros" />

      <main style={main}>
        <div style={header}>
          <div>
            <h1 style={title}>Orçamento Seguros</h1>
            <p style={subtitle}>
              Objetivos mensais por ramo, com base no prémio fracionado e comissão fracionada no mês de emissão.
            </p>
          </div>

          <Link href="/" style={backButton}>
            Voltar ao Dashboard
          </Link>
        </div>

        {loadError && (
          <div style={errorBox}>
            Erro ao carregar dados: {loadError}
          </div>
        )}

        <section style={summaryGrid}>
          <SummaryCard
            label="Apólices emitidas no ano"
            value={annualTotals.count}
            color="#2563eb"
          />

          <SummaryCard
            label="Receita atingida"
            value={formatEuro(annualTotals.premiumAchieved)}
            color="#16a34a"
          />

          <SummaryCard
            label="Comissões atingidas"
            value={formatEuro(annualTotals.commissionAchieved)}
            color="#7c3aed"
          />

          <SummaryCard
            label="Falta receita"
            value={formatEuro(annualTotals.premiumGap)}
            color={annualTotals.premiumGap >= 0 ? "#16a34a" : "#dc2626"}
          />

          <SummaryCard
            label="Falta comissões"
            value={formatEuro(annualTotals.commissionGap)}
            color={annualTotals.commissionGap >= 0 ? "#16a34a" : "#dc2626"}
          />
        </section>

        <section style={infoBox}>
          <strong>Lógica usada:</strong>{" "}
          Prémio do mês = prémio anual dividido pelo fracionamento da apólice.
          Comissão do mês = comissão por pagamento. O mês considerado é o mês da data de emissão.
        </section>

        <div style={monthsList}>
          {monthlyData.map((month) => (
            <section key={month.month} style={monthCard}>
              <div style={monthHeader}>
                <h2 style={monthTitle}>{month.month}</h2>
              </div>

              <div style={tableWrap}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>Rubricas</th>
                      <th style={th}>Nº apólices</th>
                      <th style={th}>Receita atingida</th>
                      <th style={th}>Comissões atingidas</th>
                      <th style={th}>Receita objetivo</th>
                      <th style={th}>Falta concretizar receita</th>
                      <th style={th}>Comissão objetivo</th>
                      <th style={th}>Falta concretizar comissões</th>
                    </tr>
                  </thead>

                  <tbody>
                    {month.rows.map((row) => (
                      <tr key={`${month.month}-${row.group}`}>
                        <td style={tdStrong}>{row.group}</td>
                        <td style={tdCenter}>{row.count}</td>
                        <td style={tdRight}>{formatNumber(row.premiumAchieved)}</td>
                        <td style={tdRight}>{formatNumber(row.commissionAchieved)}</td>
                        <td style={tdRight}>-{formatNumber(row.premiumObjective)}</td>
                        <td
                          style={{
                            ...tdRight,
                            ...(row.premiumGap >= 0 ? positiveCell : negativeCell),
                          }}
                        >
                          {formatNumber(row.premiumGap)}
                        </td>
                        <td style={tdRight}>-{formatNumber(row.commissionObjective)}</td>
                        <td
                          style={{
                            ...tdRight,
                            ...(row.commissionGap >= 0 ? positiveCell : negativeCell),
                          }}
                        >
                          {formatNumber(row.commissionGap)}
                        </td>
                      </tr>
                    ))}

                    <tr style={totalRow}>
                      <td style={tdStrong}>TOTAIS</td>
                      <td style={tdCenter}>{month.totals.count}</td>
                      <td style={tdRight}>{formatNumber(month.totals.premiumAchieved)}</td>
                      <td style={tdRight}>{formatNumber(month.totals.commissionAchieved)}</td>
                      <td style={tdRight}>-{formatNumber(month.totals.premiumObjective)}</td>
                      <td
                        style={{
                          ...tdRight,
                          ...(month.totals.premiumGap >= 0 ? positiveCell : negativeCell),
                        }}
                      >
                        {formatNumber(month.totals.premiumGap)}
                      </td>
                      <td style={tdRight}>-{formatNumber(month.totals.commissionObjective)}</td>
                      <td
                        style={{
                          ...tdRight,
                          ...(month.totals.commissionGap >= 0 ? positiveCell : negativeCell),
                        }}
                      >
                        {formatNumber(month.totals.commissionGap)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={summaryCard}>
      <span style={summaryLabel}>{label}</span>
      <strong style={{ ...summaryValue, color }}>{value}</strong>
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
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  marginBottom: 30,
};

const title = {
  fontSize: 42,
  margin: 0,
};

const subtitle = {
  color: "#6b7280",
  marginTop: 10,
  maxWidth: 850,
};

const backButton = {
  background: "#111827",
  color: "white",
  borderRadius: 10,
  padding: "12px 16px",
  textDecoration: "none",
  fontWeight: "bold",
};

const errorBox = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: 14,
  padding: 14,
  marginBottom: 20,
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 16,
  marginBottom: 20,
};

const summaryCard = {
  background: "white",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  display: "grid",
  gap: 10,
};

const summaryLabel = {
  color: "#6b7280",
  fontSize: 13,
};

const summaryValue = {
  fontSize: 24,
};

const infoBox = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e3a8a",
  padding: 14,
  borderRadius: 14,
  marginBottom: 24,
};

const monthsList = {
  display: "grid",
  gap: 24,
};

const monthCard = {
  background: "white",
  borderRadius: 18,
  overflow: "hidden",
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const monthHeader = {
  background: "#bfdbfe",
  borderBottom: "6px solid #84cc16",
  padding: "10px 16px",
  textAlign: "center",
};

const monthTitle = {
  margin: 0,
  fontSize: 28,
  color: "#000",
};

const tableWrap = {
  overflowX: "auto",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 950,
};

const th = {
  border: "1px solid #111827",
  padding: 10,
  textAlign: "center",
  fontWeight: "bold",
  background: "white",
};

const tdStrong = {
  border: "1px solid #111827",
  padding: 8,
  fontWeight: "bold",
  textAlign: "center",
};

const tdCenter = {
  border: "1px solid #111827",
  padding: 8,
  textAlign: "center",
};

const tdRight = {
  border: "1px solid #111827",
  padding: 8,
  textAlign: "right",
};

const positiveCell = {
  background: "#22c55e",
  color: "#000",
  fontWeight: "bold",
};

const negativeCell = {
  background: "#ff0000",
  color: "#fff",
  fontWeight: "bold",
};

const totalRow = {
  fontWeight: "bold",
  background: "#f8fafc",
};
