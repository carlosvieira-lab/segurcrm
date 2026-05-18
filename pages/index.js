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

  const { data: claims } = await supabase
    .from("claims")
    .select(`
      *,
      clients(name)
    `);

  const { data: tasks } = await supabase
    .from("tasks")
    .select(`
      *,
      clients(name)
    `);

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select(`
      *,
      clients(name)
    `);

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

function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("pt-PT");
}

function daysUntil(date) {
  if (!date) return null;

  const today = new Date();
  const target = new Date(date);

  const diff =
    target.getTime() - today.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
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

  const urgentTasks = tasks.filter(
    (t) =>
      t.priority === "URGENTE" ||
      t.priority === "MUITO URGENTE"
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

  const renewalsSoon = activePolicies.filter((p) => {
    const days = daysUntil(p.renewal_date);

    return days !== null && days <= 30 && days >= 0;
  });

  const insurerStats = {};

  activePolicies.forEach((policy) => {
    const insurer =
      policy.insurers?.name ||
      "Sem seguradora";

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

  const topInsurers = Object.entries(
    insurerStats
  )
    .sort(
      (a, b) =>
        b[1].premium - a[1].premium
    )
    .slice(0, 5);

  return (
    <div style={page}>
      <Sidebar active="dashboard" />

      <main style={main}>
        <div style={header}>
          <div>
            <h1 style={title}>
              Dashboard Executivo
            </h1>

            <p style={subtitle}>
              Operação global da mediadora
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
            title="Tarefas urgentes"
            value={urgentTasks.length}
            color="#9a3412"
          />

          <StatCard
            title="Oportunidades"
            value={openOpportunities.length}
            color="#9d174d"
          />
        </section>

        <section style={panel}>
          <h2 style={panelTitle}>
            🔔 Alertas Operacionais
          </h2>

          <div style={alertsGrid}>
            <div style={alertCard}>
              <h3>Renovações próximas</h3>

              {renewalsSoon.length === 0 ? (
                <p>Sem renovações próximas.</p>
              ) : (
                renewalsSoon.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    style={alertItem}
                  >
                    <strong>
                      {p.clients?.name || "-"}
                    </strong>

                    <span>
                      {p.branch || "-"} ·{" "}
                      {formatDate(
                        p.renewal_date
                      )}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div style={alertCard}>
              <h3>Tarefas urgentes</h3>

              {urgentTasks.length === 0 ? (
                <p>Sem tarefas urgentes.</p>
              ) : (
                urgentTasks
                  .slice(0, 5)
                  .map((task) => (
                    <div
                      key={task.id}
                      style={alertItem}
                    >
                      <strong>
                        {task.title}
                      </strong>

                      <span>
                        {task.clients?.name ||
                          "-"}
                      </span>
                    </div>
                  ))
              )}
            </div>

            <div style={alertCard}>
              <h3>Sinistros pendentes</h3>

              {openClaims.length === 0 ? (
                <p>
                  Sem sinistros pendentes.
                </p>
              ) : (
                openClaims
                  .slice(0, 5)
                  .map((claim) => (
                    <div
                      key={claim.id}
                      style={alertItem}
                    >
                      <strong>
                        {claim.claim_number ||
                          "-"}
                      </strong>

                      <span>
                        {claim.clients?.name ||
                          "-"}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </section>

        <section style={panel}>
          <h2 style={panelTitle}>
            Top Seguradoras
          </h2>

          <div style={table}>
            <div style={tableHeader}>
              <span>Seguradora</span>
              <span>Apólices</span>
              <span>Receita</span>
            </div>

            {topInsurers.map(
              ([name, data]) => (
                <div
                  key={name}
                  style={tableRow}
                >
                  <strong>{name}</strong>

                  <span>{data.count}</span>

                  <strong
                    style={{
                      color: "#166534",
                    }}
                  >
                    {formatEuro(
                      data.premium
                    )}
                  </strong>
                </div>
              )
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  color,
}) {
  return (
    <div style={statCard}>
      <p style={cardLabel}>{title}</p>

      <h2
        style={{
          ...cardValue,
          color,
        }}
      >
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
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 18,
  marginBottom: 30,
};

const statCard = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  boxShadow:
    "0 1px 4px rgba(0,0,0,0.08)",
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
  boxShadow:
    "0 1px 4px rgba(0,0,0,0.08)",
};

const panelTitle = {
  marginTop: 0,
  marginBottom: 20,
};

const alertsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 20,
};

const alertCard = {
  background: "#f9fafb",
  padding: 20,
  borderRadius: 14,
};

const alertItem = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "10px 0",
  borderBottom:
    "1px solid #e5e7eb",
};

const table = {
  display: "grid",
  gap: 8,
};

const tableHeader = {
  display: "grid",
  gridTemplateColumns:
    "2fr 1fr 1fr",
  gap: 12,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
};

const tableRow = {
  display: "grid",
  gridTemplateColumns:
    "2fr 1fr 1fr",
  gap: 12,
  padding: "14px",
  borderBottom:
    "1px solid #e5e7eb",
  alignItems: "center",
};
   
