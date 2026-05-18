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
      insurers(name)
    `);

  const { data: claims } = await supabase
    .from("claims")
    .select("*");

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*");

  const { data: opportunities } = await supabase
    .from("opportunities")
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

export default function Dashboard({
  policies,
  claims,
  tasks,
  opportunities,
}) {
  const activePolicies = policies.filter(
    (p) => p.status !== "anulada"
  );

  const cancelledPolicies = policies.filter(
    (p) => p.status === "anulada"
  );

  const openClaims = claims.filter(
    (c) => c.status !== "ENCERRADO"
  );

  const openTasks = tasks.filter(
    (t) => t.status !== "concluida"
  );

  const openOpportunities = opportunities.filter(
    (o) => o.status !== "fechada"
  );

  const activeRevenue = activePolicies.reduce(
    (sum, p) => sum + Number(p.annual_premium || 0),
    0
  );

  const lostRevenue = cancelledPolicies.reduce(
    (sum, p) => sum + Number(p.annual_premium || 0),
    0
  );

  const insurerStats = {};

  activePolicies.forEach((policy) => {
    const insurer = policy.insurers?.name || "Sem seguradora";

    if (!insurerStats[insurer]) {
      insurerStats[insurer] = {
        count: 0,
        premium: 0,
      };
    }

    insurerStats[insurer].count += 1;
    insurerStats[insurer].premium += Number(
      policy.annual_premium || 0
    );
  });

  const topInsurers = Object.entries(insurerStats)
    .sort((a, b) => b[1].premium - a[1].premium)
    .slice(0, 5);

  return (
    <div style={page}>
      <Sidebar active="dashboard" />

      <main style={main}>
        <div style={header}>
          <div>
            <h1 style={title}>Dashboard Executivo</h1>

            <p style={subtitle}>
              Visão global da operação da mediadora.
            </p>
          </div>
        </div>

        <section style={statsGrid}>
          <StatCard
            title="Apólices em vigor"
            value={activePolicies.length}
            color="#166534"
          />

          <StatCard
            title="Apólices anuladas"
            value={cancelledPolicies.length}
            color="#991b1b"
          />

          <StatCard
            title="Receita ativa"
            value={formatEuro(activeRevenue)}
            color="#166534"
          />

          <StatCard
            title="Receita perdida"
            value={formatEuro(lostRevenue)}
            color="#991b1b"
          />

          <StatCard
            title="Sinistros abertos"
            value={openClaims.length}
            color="#1d4ed8"
          />

          <StatCard
            title="Tarefas abertas"
            value={openTasks.length}
            color="#9a3412"
          />

          <StatCard
            title="Oportunidades"
            value={openOpportunities.length}
            color="#9d174d"
          />
        </section>

        <section style={panel}>
          <h2 style={panelTitle}>Top Seguradoras</h2>

          {topInsurers.length === 0 ? (
            <p>Sem dados.</p>
          ) : (
            <div style={table}>
              <div style={tableHeader}>
                <span>Seguradora</span>
                <span>Apólices</span>
                <span>Receita</span>
              </div>

              {topInsurers.map(([name, data]) => (
                <div key={name} style={tableRow}>
                  <strong>{name}</strong>

                  <span>{data.count}</span>

                  <strong style={{ color: "#166534" }}>
                    {formatEuro(data.premium)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={panel}>
          <h2 style={panelTitle}>Resumo Operacional</h2>

          <div style={resumeGrid}>
            <div style={resumeCard}>
              <h3>Retenção</h3>

              <p style={resumeValue}>
                {policies.length === 0
                  ? "0%"
                  : `${Math.round(
                      (activePolicies.length /
                        policies.length) *
                        100
                    )}%`}
              </p>
            </div>

            <div style={resumeCard}>
              <h3>Prémio médio</h3>

              <p style={resumeValue}>
                {formatEuro(
                  activePolicies.length === 0
                    ? 0
                    : activeRevenue / activePolicies.length
                )}
              </p>
            </div>

            <div style={resumeCard}>
              <h3>Saldo líquido</h3>

              <p
                style={{
                  ...resumeValue,
                  color:
                    activeRevenue - lostRevenue >= 0
                      ? "#166534"
                      : "#991b1b",
                }}
              >
                {formatEuro(activeRevenue - lostRevenue)}
              </p>
            </div>
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

      <h2 style={{ ...cardValue, color }}>
        {value}
      </h2>
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
  fontSize: 30,
  marginTop: 12,
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

const table = {
  display: "grid",
  gap: 8,
};

const tableHeader = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr",
  gap: 12,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
};

const tableRow = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr",
  gap: 12,
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
  alignItems: "center",
};

const resumeGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 18,
};

const resumeCard = {
  background: "#f9fafb",
  padding: 24,
  borderRadius: 16,
};

const resumeValue = {
  fontSize: 32,
  fontWeight: "bold",
  marginTop: 16,
};
   
