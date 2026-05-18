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
  const { data: policies } = await supabase
    .from("policies")
    .select(`
      *,
      clients(name),
      insurers(name)
    `);

  const { data: claims } = await supabase.from("claims").select("*");

  const { data: tasks } = await supabase.from("tasks").select("*");

  const { data: opportunities } = await supabase
    .from("external_policies")
    .select("*");

  return {
    props: {
      policies: policies || [],
      claims: claims || [],
      tasks: tasks || [],
      opportunities: opportunities || [],
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

function percent(value, max) {
  if (!max || max === 0) return "0%";
  return `${Math.max(5, Math.round((value / max) * 100))}%`;
}

export default function Dashboard({ policies, claims, tasks, opportunities }) {
  const activePolicies = policies.filter((p) => p.status !== "anulada");
  const cancelledPolicies = policies.filter((p) => p.status === "anulada");

  const activeRevenue = activePolicies.reduce(
    (sum, p) => sum + Number(p.annual_premium || 0),
    0
  );

  const lostRevenue = cancelledPolicies.reduce(
    (sum, p) => sum + Number(p.annual_premium || 0),
    0
  );

  const openClaims = claims.filter((c) => c.status !== "ENCERRADO");

  const urgentTasks = tasks.filter(
    (t) => t.priority === "URGENTE" || t.priority === "MUITO URGENTE"
  );

  const openOpportunities = opportunities.filter(
    (o) => o.status !== "ganho" && o.status !== "perdido"
  );

  const insurerStats = {};
  const yearlyStats = {};
  const branchStats = {};

  policies.forEach((policy) => {
    const insurer = policy.insurers?.name || "Sem seguradora";
    const branch = policy.branch || "Sem ramo";
    const premium = Number(policy.annual_premium || 0);

    if (!insurerStats[insurer]) insurerStats[insurer] = 0;
    if (policy.status !== "anulada") insurerStats[insurer] += premium;

    if (!branchStats[branch]) branchStats[branch] = 0;
    if (policy.status !== "anulada") branchStats[branch] += premium;

    const startYear = getYear(policy.start_date || policy.created_at);

    if (!yearlyStats[startYear]) {
      yearlyStats[startYear] = {
        newPremium: 0,
        cancelledPremium: 0,
      };
    }

    yearlyStats[startYear].newPremium += premium;

    if (policy.cancelled_at) {
      const cancelledYear = getYear(policy.cancelled_at);

      if (!yearlyStats[cancelledYear]) {
        yearlyStats[cancelledYear] = {
          newPremium: 0,
          cancelledPremium: 0,
        };
      }

      yearlyStats[cancelledYear].cancelledPremium += premium;
    }
  });

  const topInsurers = Object.entries(insurerStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topBranches = Object.entries(branchStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const years = Object.keys(yearlyStats).sort((a, b) => Number(b) - Number(a));

  const maxInsurerValue = Math.max(...topInsurers.map(([, value]) => value), 0);
  const maxBranchValue = Math.max(...topBranches.map(([, value]) => value), 0);
  const maxYearValue = Math.max(
    ...years.map((year) => yearlyStats[year].newPremium),
    0
  );

  return (
    <div style={page}>
      <Sidebar active="dashboard" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Dashboard Executivo</h1>
            <p style={subtitle}>Visão global da operação da mediadora.</p>
          </div>
        </header>

        <section style={statsGrid}>
          <StatCard title="Apólices em vigor" value={activePolicies.length} color="#166534" />
          <StatCard title="Apólices anuladas" value={cancelledPolicies.length} color="#991b1b" />
          <StatCard title="Receita ativa" value={formatEuro(activeRevenue)} color="#166534" />
          <StatCard title="Receita perdida" value={formatEuro(lostRevenue)} color="#991b1b" />
          <StatCard title="Sinistros abertos" value={openClaims.length} color="#1d4ed8" />
          <StatCard title="Tarefas urgentes" value={urgentTasks.length} color="#9a3412" />
          <StatCard title="Oportunidades" value={openOpportunities.length} color="#9d174d" />
        </section>

        <section style={grid2}>
          <ChartCard title="Receita por seguradora">
            {topInsurers.length === 0 ? (
              <p style={muted}>Sem dados.</p>
            ) : (
              topInsurers.map(([name, value]) => (
                <BarRow
                  key={name}
                  label={name}
                  value={formatEuro(value)}
                  width={percent(value, maxInsurerValue)}
                  color="#2563eb"
                />
              ))
            )}
          </ChartCard>

          <ChartCard title="Receita por ramo">
            {topBranches.length === 0 ? (
              <p style={muted}>Sem dados.</p>
            ) : (
              topBranches.map(([name, value]) => (
                <BarRow
                  key={name}
                  label={name}
                  value={formatEuro(value)}
                  width={percent(value, maxBranchValue)}
                  color="#16a34a"
                />
              ))
            )}
          </ChartCard>
        </section>

        <section style={panel}>
          <h2 style={panelTitle}>Produção anual</h2>

          {years.length === 0 ? (
            <p style={muted}>Sem dados anuais.</p>
          ) : (
            <div style={yearGrid}>
              {years.map((year) => (
                <div key={year} style={yearCard}>
                  <strong>{year}</strong>

                  <div style={barTrack}>
                    <div
                      style={{
                        ...barFill,
                        width: percent(yearlyStats[year].newPremium, maxYearValue),
                        background: "#16a34a",
                      }}
                    />
                  </div>

                  <p style={smallText}>
                    Nova: {formatEuro(yearlyStats[year].newPremium)}
                  </p>

                  <p style={smallTextRed}>
                    Anulada: {formatEuro(yearlyStats[year].cancelledPremium)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={panel}>
          <h2 style={panelTitle}>Alertas operacionais</h2>

          <div style={alertsGrid}>
            <AlertBox title="Tarefas urgentes" count={urgentTasks.length} />
            <AlertBox title="Sinistros abertos" count={openClaims.length} />
            <AlertBox title="Oportunidades abertas" count={openOpportunities.length} />
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div style={statCard}>
      <p style={cardLabel}>{title}</p>
      <h2 style={{ ...cardValue, color }}>{value}</h2>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <section style={panel}>
      <h2 style={panelTitle}>{title}</h2>
      <div style={chartList}>{children}</div>
    </section>
  );
}

function BarRow({ label, value, width, color }) {
  return (
    <div style={barRow}>
      <div style={barTop}>
        <strong>{label}</strong>
        <span>{value}</span>
      </div>

      <div style={barTrack}>
        <div style={{ ...barFill, width, background: color }} />
      </div>
    </div>
  );
}

function AlertBox({ title, count }) {
  return (
    <div style={alertBox}>
      <p>{title}</p>
      <strong>{count}</strong>
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

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 18,
  marginBottom: 30,
};

const statCard = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const cardLabel = {
  color: "#6b7280",
  margin: 0,
};

const cardValue = {
  fontSize: 28,
  marginTop: 12,
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 24,
};

const panel = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const panelTitle = {
  marginTop: 0,
  marginBottom: 20,
};

const chartList = {
  display: "grid",
  gap: 18,
};

const barRow = {
  display: "grid",
  gap: 8,
};

const barTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
};

const barTrack = {
  background: "#e5e7eb",
  borderRadius: 999,
  height: 12,
  overflow: "hidden",
};

const barFill = {
  height: "100%",
  borderRadius: 999,
};

const yearGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 16,
};

const yearCard = {
  background: "#f9fafb",
  borderRadius: 14,
  padding: 18,
};

const smallText = {
  color: "#166534",
  fontWeight: "bold",
};

const smallTextRed = {
  color: "#991b1b",
  fontWeight: "bold",
};

const alertsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const alertBox = {
  background: "#f9fafb",
  padding: 20,
  borderRadius: 14,
};

const muted = {
  color: "#6b7280",
};

