import Link from "next/link";
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

const months = [
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

const budgetRows = [
  {
    label: "AUTOMÓVEL",
    crmBranches: ["AUTOMÓVEL"],
    premiumObjective: 3800,
    commissionObjective: 342,
  },
  {
    label: "CASA",
    crmBranches: ["CASA", "MREMP"],
    premiumObjective: 700,
    commissionObjective: 77,
  },
  {
    label: "ATS",
    crmBranches: ["ATCP", "ATCO"],
    premiumObjective: 500,
    commissionObjective: 50,
  },
  {
    label: "SAUDE",
    crmBranches: ["SAUDE"],
    premiumObjective: 150,
    commissionObjective: 20,
  },
  {
    label: "VIDA",
    crmBranches: ["VIDA"],
    premiumObjective: 350,
    commissionObjective: 98,
  },
  {
    label: "OUTROS",
    crmBranches: ["APS", "FINANCEIROS", "VIAGEM", "CAES E GATOS", "OUTROS"],
    premiumObjective: 100,
    commissionObjective: 10,
  },
];

function normalizeText(value) {
  return String(value || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function branchBelongsToRow(policyBranch, row) {
  const normalizedBranch = normalizeText(policyBranch);

  return row.crmBranches
    .map((branch) => normalizeText(branch))
    .includes(normalizedBranch);
}

function getFrequencyMultiplier(frequency) {
  const value = normalizeText(frequency);

  if (value === "MENSAL") return 12;
  if (value === "TRIMESTRAL") return 4;
  if (value === "SEMESTRAL") return 2;

  return 1;
}

function getFirstFractionPremium(policy) {
  const annualPremium = Number(
    policy.annual_premium ||
      policy.total_premium ||
      policy.premium ||
      policy.premio_anual ||
      policy.premio ||
      0
  );

  const multiplier = getFrequencyMultiplier(policy.payment_frequency);

  return annualPremium / multiplier;
}

function getFirstFractionCommission(policy) {
  return Number(
    policy.commission_per_payment ||
      policy.commission ||
      policy.comissao ||
      policy.comissao_anual ||
      0
  );
}

function getStartDate(policy) {
  return policy.start_date || null;
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
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

export async function getServerSideProps() {
  const { data: policies, error } = await supabase
    .from("policies")
    .select(
      "id, policy_number, branch, status, annual_premium, commission_per_payment, payment_frequency, policy_issue_date, start_date, created_at, insurers(name), clients(name)"
    )
    .order("created_at", { ascending: false });

  return {
    props: {
      policies: policies || [],
      loadError: error?.message || null,
    },
  };
}

export default function OrcamentoSeguros({ policies, loadError }) {
  const [detailModal, setDetailModal] = useState(null);

  const currentYear = new Date().getFullYear();

  const activePolicies = (policies || []).filter(
    (policy) => normalizeText(policy.status) !== "ANULADA"
  );

  const issuedPoliciesThisYear = activePolicies.filter((policy) => {
    const startDate = getStartDate(policy);

    if (!startDate) return false;

    return new Date(startDate).getFullYear() === currentYear;
  });

  const monthBlocks = months.map((monthName, monthIndex) => {
    const rows = budgetRows.map((budgetRow) => {
      const rowPolicies = issuedPoliciesThisYear.filter((policy) => {
        const startDate = getStartDate(policy);

        if (!startDate) return false;

        const start = new Date(startDate);

        return (
          start.getMonth() === monthIndex &&
          branchBelongsToRow(policy.branch, budgetRow)
        );
      });

      const premiumAchieved = rowPolicies.reduce(
        (sum, policy) => sum + getFirstFractionPremium(policy),
        0
      );

      const commissionAchieved = rowPolicies.reduce(
        (sum, policy) => sum + getFirstFractionCommission(policy),
        0
      );

      return {
        ...budgetRow,
        policies: rowPolicies,
        count: rowPolicies.length,
        premiumAchieved,
        commissionAchieved,
        premiumGap: premiumAchieved - budgetRow.premiumObjective,
        commissionGap: commissionAchieved - budgetRow.commissionObjective,
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
      monthName,
      rows,
      totals,
    };
  });

  const annualTotals = monthBlocks.reduce(
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
              Controlo mensal por data de início da apólice, prémio da primeira fração e comissão da primeira fração.
            </p>
          </div>

          <Link href="/" style={backButton}>
            Voltar
          </Link>
        </div>

        {loadError && (
          <div style={errorBox}>
            Erro ao carregar apólices: {loadError}
          </div>
        )}

        <section style={summaryGrid}>
          <SummaryCard
            label="Apólices iniciadas no ano"
            value={annualTotals.count}
            color="#2563eb"
          />

          <SummaryCard
            label="Prémio 1ª fração"
            value={formatEuro(annualTotals.premiumAchieved)}
            color="#16a34a"
          />

          <SummaryCard
            label="Comissão 1ª fração"
            value={formatEuro(annualTotals.commissionAchieved)}
            color="#7c3aed"
          />

          <SummaryCard
            label="Diferença prémio"
            value={formatEuro(annualTotals.premiumGap)}
            color={annualTotals.premiumGap >= 0 ? "#16a34a" : "#dc2626"}
          />

          <SummaryCard
            label="Diferença comissão"
            value={formatEuro(annualTotals.commissionGap)}
            color={annualTotals.commissionGap >= 0 ? "#16a34a" : "#dc2626"}
          />
        </section>

        <section style={infoBox}>
          <strong>Grupos finais:</strong> AUTOMÓVEL = AUTOMÓVEL · CASA = CASA + MREMP ·
          ATS = ATCP + ATCO · SAUDE = SAUDE · VIDA = VIDA · OUTROS = APS + FINANCEIROS + VIAGEM + CAES E GATOS + OUTROS.
          <br />
          <strong>Lógica:</strong> a apólice entra no mês da sua data de início. Exemplo: início em 24/02/2026 entra em FEV. O prémio considerado é o prémio da primeira fração. A comissão considerada é a comissão da primeira fração.
        </section>


        {detailModal && (
          <div style={modalOverlay}>
            <section style={detailModalBox}>
              <div style={modalHeader}>
                <div>
                  <h2 style={modalTitle}>
                    Detalhe {detailModal.monthName} · {detailModal.label}
                  </h2>

                  <p style={modalSubtitle}>
                    {detailModal.policies.length} apólice(s) consideradas neste total.
                  </p>
                </div>

                <button
                  type="button"
                  style={closeButton}
                  onClick={() => setDetailModal(null)}
                >
                  Fechar
                </button>
              </div>

              {detailModal.policies.length === 0 ? (
                <p>Não existem apólices nesta rubrica/mês.</p>
              ) : (
                <div style={detailTableWrap}>
                  <table style={detailTable}>
                    <thead>
                      <tr>
                        <th style={detailTh}>Cliente</th>
                        <th style={detailTh}>Nº Apólice</th>
                        <th style={detailTh}>Ramo CRM</th>
                        <th style={detailTh}>Seguradora</th>
                        <th style={detailTh}>Data início</th>
                        <th style={detailTh}>Fracionamento</th>
                        <th style={detailTh}>Prémio 1ª fração</th>
                        <th style={detailTh}>Comissão 1ª fração</th>
                      </tr>
                    </thead>

                    <tbody>
                      {detailModal.policies.map((policy) => (
                        <tr key={policy.id}>
                          <td style={detailTd}>{policy.clients?.name || "-"}</td>
                          <td style={detailTd}>{policy.policy_number || "-"}</td>
                          <td style={detailTd}>{policy.branch || "-"}</td>
                          <td style={detailTd}>{policy.insurers?.name || "-"}</td>
                          <td style={detailTd}>{formatDate(policy.start_date)}</td>
                          <td style={detailTd}>{policy.payment_frequency || "-"}</td>
                          <td style={detailTdRight}>
                            {formatNumber(getFirstFractionPremium(policy))}
                          </td>
                          <td style={detailTdRight}>
                            {formatNumber(getFirstFractionCommission(policy))}
                          </td>
                        </tr>
                      ))}

                      <tr style={detailTotalRow}>
                        <td style={detailTd} colSpan={6}>
                          TOTAL
                        </td>
                        <td style={detailTdRight}>
                          {formatNumber(
                            detailModal.policies.reduce(
                              (sum, policy) => sum + getFirstFractionPremium(policy),
                              0
                            )
                          )}
                        </td>
                        <td style={detailTdRight}>
                          {formatNumber(
                            detailModal.policies.reduce(
                              (sum, policy) => sum + getFirstFractionCommission(policy),
                              0
                            )
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        <div style={monthList}>
          {monthBlocks.map((month) => (
            <section key={month.monthName} style={monthCard}>
              <div style={monthHeader}>
                <h2 style={monthTitle}>{month.monthName}</h2>
              </div>

              <div style={tableWrap}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>Rubricas</th>
                      <th style={th}>Nº Apólices</th>
                      <th style={th}>Prémio 1ª fração</th>
                      <th style={th}>Comissão 1ª fração</th>
                      <th style={th}>Objetivo prémio</th>
                      <th style={th}>Diferença prémio</th>
                      <th style={th}>Objetivo comissão</th>
                      <th style={th}>Diferença comissão</th>
                    </tr>
                  </thead>

                  <tbody>
                    {month.rows.map((row) => (
                      <tr key={`${month.monthName}-${row.label}`}>
                        <td style={tdStrong}>
                          <div>{row.label}</div>
                          <button
                            type="button"
                            style={detailButton}
                            onClick={() =>
                              setDetailModal({
                                monthName: month.monthName,
                                label: row.label,
                                policies: row.policies,
                              })
                            }
                          >
                            Ver detalhe
                          </button>
                        </td>
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
  gap: 20,
  alignItems: "flex-start",
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

const backButton = {
  background: "#111827",
  color: "white",
  padding: "12px 16px",
  borderRadius: 10,
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
  lineHeight: 1.6,
};

const monthList = {
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
  minWidth: 980,
  borderCollapse: "collapse",
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
  textAlign: "center",
  fontWeight: "bold",
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
  background: "#f8fafc",
  fontWeight: "bold",
};


const detailButton = {
  marginTop: 6,
  background: "#111827",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "6px 9px",
  fontSize: 12,
  cursor: "pointer",
  fontWeight: "bold",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(17,24,39,0.65)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const detailModalBox = {
  width: "min(1150px, 96vw)",
  maxHeight: "86vh",
  overflowY: "auto",
  background: "white",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 25px 80px rgba(0,0,0,0.35)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 20,
};

const modalTitle = {
  margin: 0,
  color: "#111827",
};

const modalSubtitle = {
  marginTop: 8,
  color: "#6b7280",
};

const closeButton = {
  background: "#6b7280",
  color: "white",
  border: "none",
  padding: "12px 16px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const detailTableWrap = {
  overflowX: "auto",
};

const detailTable = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 980,
};

const detailTh = {
  textAlign: "left",
  padding: 10,
  borderBottom: "2px solid #e5e7eb",
  background: "#f9fafb",
  color: "#374151",
  fontSize: 13,
};

const detailTd = {
  padding: 10,
  borderBottom: "1px solid #e5e7eb",
  color: "#111827",
};

const detailTdRight = {
  padding: 10,
  borderBottom: "1px solid #e5e7eb",
  color: "#111827",
  textAlign: "right",
  fontWeight: "bold",
};

const detailTotalRow = {
  background: "#f8fafc",
  fontWeight: "bold",
};
