mport { createClient } from "@supabase/supabase-js";
import Sidebar from "../components/Sidebar";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function getServerSideProps() {
  const { data: policies } = await supabase
    .from("policies")
    .select(`
      *,
      clients(name),
      insurers(name)
    `)
    .order("start_date", { ascending: false });

  return {
    props: {
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

function getYear(date) {
  if (!date) return "Sem ano";
  return new Date(date).getFullYear().toString();
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

  const allYearsSet = new Set();

  policies.forEach((policy) => {
    const startYear = Number(
      getYear(
        policy.start_date ||
          policy.created_at
      )
    );

    if (!isNaN(startYear)) {
      allYearsSet.add(startYear);
    }

    if (policy.cancelled_at) {
      const cancelledYear = Number(
        getYear(
          policy.cancelled_at
        )
      );

      if (!isNaN(cancelledYear)) {
        allYearsSet.add(
          cancelledYear
        );
      }
    }
  });

  const sortedYears =
    Array.from(allYearsSet)
      .filter((y) => !isNaN(y))
      .sort((a, b) => a - b);

  const portfolioEvolution =
    sortedYears.map((year) => {
      const activeUntilYear =
        policies.filter((policy) => {
          const startYear =
            Number(
              getYear(
                policy.start_date ||
                  policy.created_at
              )
            );

          const cancelledYear =
            policy.cancelled_at
              ? Number(
                  getYear(
                    policy.cancelled_at
                  )
                )
              : null;

          const started =
            startYear <= year;

          const stillActive =
            !cancelledYear ||
            cancelledYear > year;

          return (
            started &&
            stillActive
          );
        });

      const totalPremium =
        activeUntilYear.reduce(
          (sum, policy) =>
            sum +
            Number(
              policy.annual_premium ||
                0
            ),
          0
        );

      return {
        year,
        premium: totalPremium,
        policies:
          activeUntilYear.length,
      };
    });

  const years = Object.keys(yearlyStats).sort((a, b) => Number(b) - Number(a));

  return (
    <div style={page}>
      <Sidebar active="apolices" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Apólices</h1>
            <p style={subtitle}>
              Estatística da carteira, produção nova e anulações.
            </p>
          </div>
        </header>

        <section style={stats}>
          <StatCard title="Total apólices" value={policies.length} />
          <StatCard title="Em vigor" value={activePolicies.length} color="#16a34a" />
          <StatCard title="Anuladas" value={cancelledPolicies.length} color="#dc2626" />
          <StatCard title="Receita em vigor" value={formatEuro(totalActivePremium)} color="#16a34a" />
          <StatCard title="Receita anulada" value={formatEuro(totalCancelledPremium)} color="#dc2626" />
        </section>

        <section style={panel}>
          <h2>Produção e anulações por ano</h2>

          {years.length === 0 ? (
            <p style={muted}>Sem dados disponíveis.</p>
          ) : (
            <div style={table}>
              <div style={tableHeader}>
                <span>Ano</span>
                <span>Novas</span>
                <span>Receita nova</span>
                <span>Anuladas</span>
                <span>Receita anulada</span>
                <span>Saldo líquido</span>
              </div>

              {years.map((year) => {
                const item = yearlyStats[year];
                const netCount = item.newCount - item.cancelledCount;
                const netPremium = item.newPremium - item.cancelledPremium;

                return (
                  <div key={year} style={tableRow}>
                    <strong>{year}</strong>
                    <span style={greenText}>{item.newCount}</span>
                    <span style={greenText}>{formatEuro(item.newPremium)}</span>
                    <span style={redText}>{item.cancelledCount}</span>
                    <span style={redText}>{formatEuro(item.cancelledPremium)}</span>
                    <strong style={netPremium >= 0 ? greenText : redText}>
                      {netCount} / {formatEuro(netPremium)}
                    </strong>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section style={panel}>
          <h2>Evolução da carteira viva</h2>

          {portfolioEvolution.length === 0 ? (
            <p style={muted}>Sem dados disponíveis.</p>
          ) : (
            <div style={table}>
              <div style={tableHeaderEvolution}>
                <span>Ano</span>
                <span>Apólices vivas</span>
                <span>Carteira viva</span>
                <span>Crescimento</span>
              </div>

              {portfolioEvolution.map((item, index) => {
                const previous =
                  index > 0
                    ? portfolioEvolution[index - 1]
                    : null;

                const growth =
                  previous
                    ? item.premium -
                      previous.premium
                    : item.premium;

                return (
                  <div
                    key={item.year}
                    style={tableRowEvolution}
                  >
                    <strong>
                      {item.year}
                    </strong>

                    <span style={greenText}>
                      {item.policies}
                    </span>

                    <strong style={greenText}>
                      {formatEuro(item.premium)}
                    </strong>

                    <strong
                      style={
                        growth >= 0
                          ? greenText
                          : redText
                      }
                    >
                      {growth >= 0
                        ? "+"
                        : ""}
                      {formatEuro(growth)}
                    </strong>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section style={panel}>
          <h2>Carteira por seguradora</h2>

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

              {Object.entries(insurerStats)
                .sort((a, b) => b[1].activePremium - a[1].activePremium)
                .map(([insurer, item]) => (
                  <div key={insurer} style={tableRow}>
                    <strong>{insurer}</strong>
                    <span style={greenText}>{item.activeCount}</span>
                    <span style={greenText}>{formatEuro(item.activePremium)}</span>
                    <span style={redText}>{item.cancelledCount}</span>
                    <span style={redText}>{formatEuro(item.cancelledPremium)}</span>
                  </div>
                ))}
            </div>
          )}
        </section>

        <section style={panel}>
          <h2>Lista compacta de apólices</h2>

          {policies.length === 0 ? (
            <p style={muted}>Ainda não existem apólices.</p>
          ) : (
            <div style={compactList}>
              {policies.map((policy) => (
                <div key={policy.id} style={compactRow}>
                  <div>
                    <strong>{policy.policy_number || "Sem nº"}</strong>
                    <p style={smallText}>
                      {policy.clients?.name || "-"} · {policy.branch || "-"} ·{" "}
                      {policy.insurers?.name || "-"}
                    </p>
                  </div>

                  <div style={rightSide}>
                    <strong>{formatEuro(policy.annual_premium)}</strong>
                    <span
                      style={{
                        ...badge,
                        background:
                          policy.status === "anulada" ? "#fee2e2" : "#dcfce7",
                        color:
                          policy.status === "anulada" ? "#991b1b" : "#166534",
                      }}
                    >
                      {policy.status || "ativa"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ title, value, color = "#111827" }) {
  return (
    <div style={statCard}>
      <p style={cardLabel}>{title}</p>
      <h2 style={{ ...cardValue, color }}>{value}</h2>
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

const stats = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 16,
  marginBottom: 30,
};

const statCard = {
  background: "white",
  padding: 22,
  borderRadius: 16,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const cardLabel = {
  color: "#6b7280",
  margin: 0,
};

const cardValue = {
  fontSize: 28,
  margin: "10px 0 0",
};

const panel = {
  background: "white",
  borderRadius: 16,
  padding: 24,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const muted = {
  color: "#6b7280",
};

const table = {
  display: "grid",
  gap: 8,
};

const tableHeader = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr 1.3fr 1fr 1.3fr 1.3fr",
  gap: 12,
  padding: "12px 14px",
  borderRadius: 12,
  background: "#f3f4f6",
  color: "#374151",
  fontWeight: "bold",
  fontSize: 14,
};

const tableRow = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr 1.3fr 1fr 1.3fr 1.3fr",
  gap: 12,
  alignItems: "center",
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
};

const greenText = {
  color: "#16a34a",
  fontWeight: "bold",
};

const redText = {
  color: "#dc2626",
  fontWeight: "bold",
};

const tableHeaderEvolution = {
  display: "grid",
  gridTemplateColumns: "1fr 1.2fr 1.5fr 1.5fr",
  gap: 12,
  padding: "12px 14px",
  borderRadius: 12,
  background: "#ecfeff",
  color: "#0f172a",
  fontWeight: "bold",
  fontSize: 14,
};

const tableRowEvolution = {
  display: "grid",
  gridTemplateColumns: "1fr 1.2fr 1.5fr 1.5fr",
  gap: 12,
  alignItems: "center",
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
};

const compactList = {
  display: "grid",
  gap: 10,
};

const compactRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 0",
  borderBottom: "1px solid #e5e7eb",
};

const smallText = {
  color: "#6b7280",
  margin: "6px 0 0",
};

const rightSide = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const badge = {
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
};
