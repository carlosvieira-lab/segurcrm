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
  async function fetchPoliciesRange(from, to) {
    const { data, error } = await supabase
      .from("policies")
      .select(`
        *,
        clients(name),
        insurers(name)
      `)
      .order("start_date", { ascending: false })
      .range(from, to);

    if (error) {
      console.log("Erro ao carregar apólices:", error.message);
      return [];
    }

    return data || [];
  }

  const firstBatch = await fetchPoliciesRange(0, 999);
  const secondBatch = await fetchPoliciesRange(1000, 1999);
  const thirdBatch = await fetchPoliciesRange(2000, 2999);
  const fourthBatch = await fetchPoliciesRange(3000, 3999);

  const policies = [
    ...firstBatch,
    ...secondBatch,
    ...thirdBatch,
    ...fourthBatch,
  ];

  return {
    props: {
      policies,
    },
  };
}

function formatEuro(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function getYear(date) {
  if (!date) return "Sem ano";
  return new Date(date).getFullYear().toString();
}

function normalizeText(value) {
  return String(value || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function insurerIcon(name) {
  const normalized = normalizeText(name);

  if (normalized.includes("GENERALI")) return "🦁";
  if (normalized.includes("REAL VIDA")) return "🔵";
  if (normalized.includes("ZURICH")) return "Ⓩ";
  if (normalized.includes("ALLIANZ")) return "🔷";
  if (normalized.includes("FIDELIDADE")) return "🔴";
  if (normalized.includes("AGEAS")) return "🟢";
  if (normalized.includes("MAPFRE")) return "🟥";
  if (normalized.includes("LIBERTY")) return "🗽";
  if (normalized.includes("VICTORIA")) return "🏛️";
  if (normalized.includes("UNA")) return "🟣";
  if (normalized.includes("TRANQUILIDADE")) return "🟩";
  if (normalized.includes("CARAVELA")) return "⛵";

  return "🏢";
}

function getLastYears(years, limit = 8) {
  return [...years]
    .filter((year) => year !== "Sem ano")
    .sort((a, b) => Number(a) - Number(b))
    .slice(-limit);
}

function getBarHeight(value, maxValue) {
  if (!maxValue) return 6;
  return Math.max(6, Math.round((Number(value || 0) / maxValue) * 150));
}

export default function Apolices({ policies }) {
  const activePolicies = policies.filter((p) => p.status === "ativa");
  const cancelledPolicies = policies.filter((p) => p.status === "anulada");

  const totalActivePremium = activePolicies.reduce(
    (sum, p) => sum + Number(p.annual_premium || 0),
    0
  );

  const totalCancelledPremium = cancelledPolicies.reduce(
    (sum, p) => sum + Number(p.annual_premium || 0),
    0
  );

  const insurerStats = {};
  const yearlyStats = {};
  const yearlyInsurerStats = {};

  policies.forEach((policy) => {
    const insurer = policy.insurers?.name || "Sem seguradora";
    const premium = Number(policy.annual_premium || 0);

    if (!insurerStats[insurer]) {
      insurerStats[insurer] = {
        activeCount: 0,
        cancelledCount: 0,
        activePremium: 0,
        cancelledPremium: 0,
      };
    }

    if (policy.status === "anulada") {
      insurerStats[insurer].cancelledCount += 1;
      insurerStats[insurer].cancelledPremium += premium;
    } else {
      insurerStats[insurer].activeCount += 1;
      insurerStats[insurer].activePremium += premium;
    }

    const startYear = getYear(policy.start_date || policy.created_at);

    if (!yearlyStats[startYear]) {
      yearlyStats[startYear] = {
        newCount: 0,
        cancelledCount: 0,
        newPremium: 0,
        cancelledPremium: 0,
      };
    }

    yearlyStats[startYear].newCount += 1;
    yearlyStats[startYear].newPremium += premium;

    if (!yearlyInsurerStats[startYear]) {
      yearlyInsurerStats[startYear] = {};
    }

    if (!yearlyInsurerStats[startYear][insurer]) {
      yearlyInsurerStats[startYear][insurer] = {
        count: 0,
        premium: 0,
      };
    }

    yearlyInsurerStats[startYear][insurer].count += 1;
    yearlyInsurerStats[startYear][insurer].premium += premium;

    if (policy.cancelled_at) {
      const cancelledYear = getYear(policy.cancelled_at);

      if (!yearlyStats[cancelledYear]) {
        yearlyStats[cancelledYear] = {
          newCount: 0,
          cancelledCount: 0,
          newPremium: 0,
          cancelledPremium: 0,
        };
      }

      yearlyStats[cancelledYear].cancelledCount += 1;
      yearlyStats[cancelledYear].cancelledPremium += premium;
    }
  });

  const years = Object.keys(yearlyStats).sort((a, b) => Number(b) - Number(a));
  const chartYears = getLastYears(years, 9);

  const maxChartValue = Math.max(
    ...chartYears.map((year) =>
      Math.max(
        Number(yearlyStats[year]?.newPremium || 0),
        Number(yearlyStats[year]?.cancelledPremium || 0)
      )
    ),
    1
  );

  const currentYear = new Date().getFullYear().toString();
  const currentYearStats = yearlyStats[currentYear] || {
    newCount: 0,
    cancelledCount: 0,
    newPremium: 0,
    cancelledPremium: 0,
  };

  const currentYearInsurers = Object.entries(yearlyInsurerStats[currentYear] || {})
    .sort((a, b) => b[1].premium - a[1].premium)
    .slice(0, 5);

  const insurerRanking = Object.entries(insurerStats)
    .sort((a, b) => b[1].activePremium - a[1].activePremium)
    .map(([insurer, item]) => ({
      insurer,
      ...item,
      percentage:
        totalActivePremium > 0
          ? ((item.activePremium / totalActivePremium) * 100).toFixed(1)
          : "0.0",
    }));

  const vidaBranches = ["VIDA", "APS", "VIAGEM"];
  const lifeInsurerNames = ["GENERALI", "REAL VIDA", "ZURICH"];

  function isVidaPolicy(policy) {
    return vidaBranches.includes(normalizeText(policy.branch));
  }

  const lifePolicies = activePolicies.filter(isVidaPolicy);

  const lifePortfolioStats = lifeInsurerNames.map((insurerName) => {
    const companyPolicies = lifePolicies.filter((policy) => {
      return normalizeText(policy.insurers?.name) === normalizeText(insurerName);
    });

    const premium = companyPolicies.reduce(
      (sum, policy) => sum + Number(policy.annual_premium || 0),
      0
    );

    return {
      insurer: insurerName,
      policies: companyPolicies.length,
      premium,
    };
  });

  const totalLifePremium = lifePolicies.reduce(
    (sum, policy) => sum + Number(policy.annual_premium || 0),
    0
  );

  const totalLifePolicies = lifePolicies.length;

  const lifePortfolioRows = lifePortfolioStats.map((item) => ({
    ...item,
    percentage:
      totalLifePremium > 0
        ? ((item.premium / totalLifePremium) * 100).toFixed(1)
        : "0.0",
  }));

  const yearsForCompanyTable = chartYears.slice(-5).reverse();

  return (
    <div style={page}>
      <Sidebar active="apolices" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Apólices</h1>
            <p style={subtitle}>
              Visão geral da carteira, produção anual e receita por companhia.
            </p>
          </div>
        </header>

        <section style={stats}>
          <StatCard title="Total apólices" value={policies.length} color="#2563eb" icon="📄" />
          <StatCard title="Em vigor" value={activePolicies.length} color="#16a34a" icon="🛡️" />
          <StatCard title="Anuladas" value={cancelledPolicies.length} color="#dc2626" icon="❌" />
          <StatCard title="Receita em vigor" value={formatEuro(totalActivePremium)} color="#16a34a" icon="€" />
          <StatCard title="Receita anulada" value={formatEuro(totalCancelledPremium)} color="#dc2626" icon="€" />
        </section>

        <section style={topGrid}>
          <section style={panel}>
            <h2 style={panelTitle}>📈 Evolução anual da receita</h2>

            {chartYears.length === 0 ? (
              <p style={muted}>Sem dados disponíveis.</p>
            ) : (
              <>
                <div style={legend}>
                  <span><b style={greenDot}></b>Receita nova</span>
                  <span><b style={redDot}></b>Receita anulada</span>
                </div>

                <div style={chart}>
                  {chartYears.map((year) => {
                    const item = yearlyStats[year] || {};
                    const newHeight = getBarHeight(item.newPremium, maxChartValue);
                    const cancelledHeight = getBarHeight(item.cancelledPremium, maxChartValue);

                    return (
                      <div key={year} style={chartItem}>
                        <div style={barGroup}>
                          <div
                            title={`${year} receita nova: ${formatEuro(item.newPremium)}`}
                            style={{
                              ...greenBar,
                              height: newHeight,
                            }}
                          />
                          <div
                            title={`${year} receita anulada: ${formatEuro(item.cancelledPremium)}`}
                            style={{
                              ...redBar,
                              height: cancelledHeight,
                            }}
                          />
                        </div>
                        <strong style={chartYear}>{year}</strong>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          <section style={panel}>
            <h2 style={panelTitle}>🚀 Produção nova {currentYear}</h2>

            <div style={currentYearBox}>
              <div>
                <span style={boxLabel}>Novas</span>
                <strong style={greenBig}>{currentYearStats.newCount}</strong>
              </div>

              <div>
                <span style={boxLabel}>Receita nova</span>
                <strong style={greenBig}>{formatEuro(currentYearStats.newPremium)}</strong>
              </div>

              <div>
                <span style={boxLabel}>Anuladas</span>
                <strong style={redBig}>{currentYearStats.cancelledCount}</strong>
              </div>

              <div>
                <span style={boxLabel}>Receita anulada</span>
                <strong style={redBig}>{formatEuro(currentYearStats.cancelledPremium)}</strong>
              </div>
            </div>

            <div style={miniCompanyList}>
              {currentYearInsurers.map(([insurer, item]) => (
                <div key={insurer} style={miniCompanyRow}>
                  <span style={companyName}>
                    <b style={companyIcon}>{insurerIcon(insurer)}</b>
                    {insurer}
                  </span>
                  <strong>{item.count}</strong>
                  <strong style={greenText}>{formatEuro(item.premium)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section style={alertsPanel}>
            <h2 style={alertsTitle}>⚠️ Alertas</h2>

            <AlertCard
              title="Receita anulada"
              value={formatEuro(totalCancelledPremium)}
              text={`${cancelledPolicies.length} apólices anuladas`}
              color="#dc2626"
            />

            <AlertCard
              title={`Produção nova ${currentYear}`}
              value={formatEuro(currentYearStats.newPremium)}
              text={`${currentYearStats.newCount} apólices criadas`}
              color="#16a34a"
            />

            <AlertCard
              title="Saldo líquido do ano"
              value={formatEuro(currentYearStats.newPremium - currentYearStats.cancelledPremium)}
              text={`${currentYearStats.newCount - currentYearStats.cancelledCount} apólices líquidas`}
              color={currentYearStats.newPremium - currentYearStats.cancelledPremium >= 0 ? "#16a34a" : "#dc2626"}
            />
          </section>
        </section>

        <section style={panel}>
          <div style={sectionHeader}>
            <h2 style={panelTitle}>Resultados por ano</h2>
            <span style={pill}>Receita nova vs receita anulada</span>
          </div>

          {years.length === 0 ? (
            <p style={muted}>Sem dados disponíveis.</p>
          ) : (
            <div style={yearCards}>
              {years.map((year) => {
                const item = yearlyStats[year];
                const netCount = item.newCount - item.cancelledCount;
                const netPremium = item.newPremium - item.cancelledPremium;

                return (
                  <div key={year} style={yearCard}>
                    <h3 style={yearCardTitle}>{year}</h3>

                    <div style={yearMetric}>
                      <span>Novas</span>
                      <strong style={greenText}>{item.newCount}</strong>
                    </div>

                    <div style={yearMetric}>
                      <span>Anuladas</span>
                      <strong style={redText}>{item.cancelledCount}</strong>
                    </div>

                    <div style={yearMetric}>
                      <span>Receita nova</span>
                      <strong style={greenText}>{formatEuro(item.newPremium)}</strong>
                    </div>

                    <div style={yearMetric}>
                      <span>Receita anulada</span>
                      <strong style={redText}>{formatEuro(item.cancelledPremium)}</strong>
                    </div>

                    <div style={netBox}>
                      <span>Saldo</span>
                      <strong style={netPremium >= 0 ? greenText : redText}>
                        {netCount} / {formatEuro(netPremium)}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section style={wideGrid}>
          <section style={panel}>
            <h2 style={panelTitle}>🏢 Receita anual por companhia</h2>

            {insurerRanking.length === 0 ? (
              <p style={muted}>Sem dados disponíveis.</p>
            ) : (
              <div style={companyRevenueTable}>
                <div style={companyRevenueHeader}>
                  <span>Seguradora</span>
                  {yearsForCompanyTable.map((year) => (
                    <span key={year}>{year}</span>
                  ))}
                  <span>Total</span>
                  <span>% Carteira</span>
                </div>

                {insurerRanking.map((row) => (
                  <div key={row.insurer} style={companyRevenueRow}>
                    <strong style={companyName}>
                      <b style={companyIcon}>{insurerIcon(row.insurer)}</b>
                      {row.insurer}
                    </strong>

                    {yearsForCompanyTable.map((year) => {
                      const value = yearlyInsurerStats[year]?.[row.insurer]?.premium || 0;
                      return (
                        <span key={year} style={value > 0 ? greenText : muted}>
                          {formatEuro(value)}
                        </span>
                      );
                    })}

                    <strong>{formatEuro(row.activePremium)}</strong>
                    <strong style={blueText}>{row.percentage}%</strong>
                  </div>
                ))}
              </div>
            )}

            <div style={lifePortfolioBox}>
              <div style={lifePortfolioHeader}>
                <div>
                  <h3 style={lifePortfolioTitle}>❤️ Carteira Vida por seguradora</h3>
                  <p style={lifePortfolioSubtitle}>
                    Ramo VIDA, APS e VIAGEM em vigor, separado por Generali, Real Vida e Zurich.
                  </p>
                </div>

                <div style={lifePortfolioTotal}>
                  <span>Total Vida</span>
                  <strong>{formatEuro(totalLifePremium)}</strong>
                  <small>{totalLifePolicies} apólices</small>
                </div>
              </div>

              <div style={lifePortfolioGrid}>
                {lifePortfolioRows.map((row) => (
                  <div key={row.insurer} style={lifePortfolioCard}>
                    <div style={lifePortfolioCompany}>
                      <b style={companyIcon}>{insurerIcon(row.insurer)}</b>
                      <strong>{row.insurer}</strong>
                    </div>

                    <strong style={lifePortfolioPremium}>
                      {formatEuro(row.premium)}
                    </strong>

                    <div style={lifePortfolioMeta}>
                      <span>{row.policies} apólices Vida</span>
                      <strong style={blueText}>
                        {row.percentage}% da carteira Vida
                      </strong>
                    </div>

                    <div style={progressOuter}>
                      <div
                        style={{
                          ...progressInner,
                          width: `${Math.min(Number(row.percentage), 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section style={panel}>
            <h2 style={panelTitle}>🏆 Ranking seguradoras</h2>

            <div style={rankingList}>
              {insurerRanking.map((row, index) => (
                <div key={row.insurer} style={rankingCard}>
                  <div style={rankingTop}>
                    <span style={rankingPosition}>{index + 1}</span>
                    <span style={rankingIcon}>{insurerIcon(row.insurer)}</span>
                    <strong>{row.insurer}</strong>
                  </div>

                  <div style={rankingMeta}>
                    <span>{row.activeCount} em vigor</span>
                    <span>{row.cancelledCount} anuladas</span>
                  </div>

                  <strong style={rankingValue}>{formatEuro(row.activePremium)}</strong>
                  <div style={progressOuter}>
                    <div style={{ ...progressInner, width: `${Math.min(Number(row.percentage), 100)}%` }} />
                  </div>
                  <span style={blueText}>{row.percentage}% da carteira</span>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section style={panel}>
          <h2 style={panelTitle}>Carteira por seguradora</h2>

          {Object.keys(insurerStats).length === 0 ? (
            <p style={muted}>Sem dados disponíveis.</p>
          ) : (
            <div style={table}>
              <div style={tableHeader}>
                <span>Seguradora</span>
                <span>Em vigor</span>
                <span>Receita em vigor</span>
                <span>Anuladas</span>
                <span>Receita anulada</span>
              </div>

              {insurerRanking.map((row) => (
                <div key={row.insurer} style={tableRow}>
                  <strong style={companyName}>
                    <b style={companyIcon}>{insurerIcon(row.insurer)}</b>
                    {row.insurer}
                  </strong>
                  <span style={greenText}>{row.activeCount}</span>
                  <span style={greenText}>{formatEuro(row.activePremium)}</span>
                  <span style={redText}>{row.cancelledCount}</span>
                  <span style={redText}>{formatEuro(row.cancelledPremium)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ title, value, color = "#111827", icon = "📄" }) {
  return (
    <div style={statCard}>
      <div style={{ ...statIcon, color, background: `${color}18` }}>{icon}</div>
      <div>
        <p style={cardLabel}>{title}</p>
        <h2 style={{ ...cardValue, color }}>{value}</h2>
      </div>
    </div>
  );
}

function AlertCard({ title, value, text, color }) {
  return (
    <div style={alertCard}>
      <p style={alertTitle}>{title}</p>
      <strong style={{ ...alertValue, color }}>{value}</strong>
      <span style={alertText}>{text}</span>
    </div>
  );
}

const page = {
  display: "flex",
  minHeight: "100vh",
  background: "#f1f5f9",
  fontFamily: "Arial, sans-serif",
};

const main = {
  flex: 1,
  padding: 24,
};

const header = {
  marginBottom: 18,
};

const title = {
  fontSize: 36,
  margin: 0,
  color: "#0f172a",
  fontWeight: 900,
};

const subtitle = {
  color: "#475569",
  marginTop: 8,
};

const stats = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 12,
  marginBottom: 16,
};

const statCard = {
  background: "white",
  padding: 14,
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const statIcon = {
  width: 44,
  height: 44,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
  fontSize: 20,
};

const cardLabel = {
  color: "#475569",
  margin: 0,
  fontSize: 13,
  fontWeight: 800,
};

const cardValue = {
  fontSize: 25,
  margin: "4px 0 0",
};

const topGrid = {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.9fr 0.8fr",
  gap: 16,
  marginBottom: 16,
  alignItems: "stretch",
};

const wideGrid = {
  display: "grid",
  gridTemplateColumns: "1.7fr 0.8fr",
  gap: 16,
  marginBottom: 16,
  alignItems: "start",
};

const panel = {
  background: "white",
  borderRadius: 18,
  padding: 16,
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  marginBottom: 16,
};

const panelTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: 20,
  fontWeight: 900,
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 14,
};

const pill = {
  background: "#dcfce7",
  color: "#166534",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 900,
};

const legend = {
  display: "flex",
  gap: 16,
  color: "#475569",
  fontSize: 13,
  margin: "14px 0 8px",
};

const greenDot = {
  display: "inline-block",
  width: 10,
  height: 10,
  borderRadius: 999,
  background: "#16a34a",
  marginRight: 6,
};

const redDot = {
  display: "inline-block",
  width: 10,
  height: 10,
  borderRadius: 999,
  background: "#dc2626",
  marginRight: 6,
};

const chart = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(48px, 1fr))",
  gap: 10,
  minHeight: 200,
  alignItems: "end",
  paddingTop: 12,
};

const chartItem = {
  display: "grid",
  justifyItems: "center",
  gap: 8,
};

const barGroup = {
  height: 160,
  display: "flex",
  alignItems: "end",
  gap: 5,
};

const greenBar = {
  width: 14,
  background: "linear-gradient(180deg, #22c55e, #15803d)",
  borderRadius: "8px 8px 0 0",
};

const redBar = {
  width: 14,
  background: "linear-gradient(180deg, #ef4444, #dc2626)",
  borderRadius: "8px 8px 0 0",
};

const chartYear = {
  color: "#334155",
  fontSize: 12,
};

const currentYearBox = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginTop: 14,
  marginBottom: 14,
};

const boxLabel = {
  display: "block",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 4,
};

const greenBig = {
  color: "#16a34a",
  fontSize: 22,
};

const redBig = {
  color: "#dc2626",
  fontSize: 22,
};

const miniCompanyList = {
  display: "grid",
  gap: 8,
};

const miniCompanyRow = {
  display: "grid",
  gridTemplateColumns: "1fr auto auto",
  gap: 10,
  alignItems: "center",
  background: "#f8fafc",
  padding: 10,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  fontSize: 13,
};

const companyName = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const companyIcon = {
  minWidth: 24,
  width: 24,
  height: 24,
  borderRadius: 999,
  background: "#eff6ff",
  color: "#1d4ed8",
  display: "inline-grid",
  placeItems: "center",
  fontSize: 13,
};

const alertsPanel = {
  background: "linear-gradient(135deg, #fff7ed, #ffffff)",
  border: "1px solid #fed7aa",
  borderRadius: 18,
  padding: 16,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const alertsTitle = {
  margin: "0 0 12px",
  color: "#9a3412",
  fontSize: 20,
};

const alertCard = {
  background: "rgba(255,255,255,0.85)",
  border: "1px solid #fed7aa",
  borderRadius: 14,
  padding: 12,
  marginBottom: 10,
};

const alertTitle = {
  margin: 0,
  color: "#9a3412",
  fontWeight: 900,
};

const alertValue = {
  display: "block",
  marginTop: 6,
  fontSize: 20,
};

const alertText = {
  display: "block",
  marginTop: 4,
  color: "#64748b",
  fontSize: 12,
};

const yearCards = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
};

const yearCard = {
  background: "linear-gradient(135deg, #f8fafc, #ffffff)",
  border: "1px solid #dbeafe",
  borderRadius: 16,
  padding: 14,
};

const yearCardTitle = {
  margin: "0 0 10px",
  color: "#0369a1",
  fontSize: 20,
};

const yearMetric = {
  display: "grid",
  gap: 2,
  marginBottom: 8,
  color: "#64748b",
  fontSize: 12,
};

const netBox = {
  marginTop: 10,
  paddingTop: 10,
  borderTop: "1px solid #e5e7eb",
  display: "grid",
  gap: 4,
  color: "#475569",
  fontSize: 12,
};

const companyRevenueTable = {
  display: "grid",
  gap: 7,
  overflowX: "auto",
};

const companyRevenueHeader = {
  display: "grid",
  gridTemplateColumns: "1.4fr repeat(5, 1fr) 1fr 0.8fr",
  gap: 8,
  minWidth: 880,
  background: "#eff6ff",
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: 900,
  color: "#1e3a8a",
  fontSize: 13,
};

const companyRevenueRow = {
  display: "grid",
  gridTemplateColumns: "1.4fr repeat(5, 1fr) 1fr 0.8fr",
  gap: 8,
  minWidth: 880,
  alignItems: "center",
  padding: "11px 12px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: 13,
};

const rankingList = {
  display: "grid",
  gap: 10,
};

const rankingCard = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
};

const rankingTop = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
};

const rankingPosition = {
  background: "#dbeafe",
  color: "#1d4ed8",
  width: 24,
  height: 24,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
};

const rankingIcon = {
  fontSize: 20,
};

const rankingMeta = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  color: "#64748b",
  fontSize: 12,
  marginBottom: 8,
};

const rankingValue = {
  color: "#0f172a",
  fontSize: 18,
};

const progressOuter = {
  height: 8,
  background: "#e5e7eb",
  borderRadius: 999,
  overflow: "hidden",
  margin: "8px 0",
};

const progressInner = {
  height: "100%",
  background: "linear-gradient(90deg, #2563eb, #16a34a)",
};

const lifePortfolioBox = {
  marginTop: 18,
  paddingTop: 18,
  borderTop: "1px solid #e5e7eb",
};

const lifePortfolioHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  marginBottom: 14,
};

const lifePortfolioTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: 20,
  fontWeight: 900,
};

const lifePortfolioSubtitle = {
  margin: "8px 0 0",
  color: "#475569",
  fontSize: 13,
};

const lifePortfolioTotal = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: "12px 14px",
  minWidth: 150,
  textAlign: "right",
  display: "grid",
  gap: 4,
  color: "#334155",
  fontSize: 12,
  fontWeight: 800,
};

const lifePortfolioGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const lifePortfolioCard = {
  background: "linear-gradient(135deg, #f8fafc, #ffffff)",
  border: "1px solid #bfdbfe",
  borderRadius: 16,
  padding: 14,
};

const lifePortfolioCompany = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 12,
  color: "#0f172a",
};

const lifePortfolioPremium = {
  display: "block",
  color: "#16a34a",
  fontSize: 22,
  marginBottom: 10,
};

const lifePortfolioMeta = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  color: "#64748b",
  fontSize: 12,
  marginBottom: 8,
};

const table = {
  display: "grid",
  gap: 8,
  overflowX: "auto",
};

const tableHeader = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr 1.4fr 1fr 1.4fr",
  gap: 12,
  minWidth: 720,
  padding: "12px 14px",
  borderRadius: 12,
  background: "#f1f5f9",
  color: "#374151",
  fontWeight: "bold",
  fontSize: 14,
};

const tableRow = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr 1.4fr 1fr 1.4fr",
  gap: 12,
  minWidth: 720,
  alignItems: "center",
  padding: "12px 14px",
  borderBottom: "1px solid #e5e7eb",
};

const greenText = {
  color: "#16a34a",
  fontWeight: "bold",
};

const blueText = {
  color: "#2563eb",
  fontWeight: "bold",
};

const redText = {
  color: "#dc2626",
  fontWeight: "bold",
};

const muted = {
  color: "#64748b",
};
