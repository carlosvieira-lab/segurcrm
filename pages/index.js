import { createClient } from "@supabase/supabase-js";
import Sidebar from "../components/Sidebar";
import Link from "next/link";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

function daysUntil(date) {
  if (!date) return null;

  const today = new Date();
  const target = new Date(date);

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diff = target - today;

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export async function getServerSideProps() {
  const { data: clients } = await supabase.from("clients").select("*");

  const { data: policies } = await supabase
    .from("policies")
    .select("*");

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*");

  const { data: opportunities } = await supabase
    .from("external_policies")
    .select("*");

  const safeClients = clients || [];
  const safePolicies = policies || [];
  const safeTasks = tasks || [];
  const safeOpportunities = opportunities || [];

  const activePolicies = safePolicies.filter(
    (p) => p.status === "ativa"
  );

  const cancelledPolicies = safePolicies.filter(
    (p) => p.status === "anulada"
  );

  const overdue = activePolicies.filter((p) => {
    const days = daysUntil(p.next_payment_date);
    return days !== null && days < 0;
  });

  const dueToday = activePolicies.filter((p) => {
    const days = daysUntil(p.next_payment_date);
    return days === 0;
  });

  const next7Days = activePolicies.filter((p) => {
    const days = daysUntil(p.next_payment_date);
    return days !== null && days > 0 && days <= 7;
  });

  const next30Days = activePolicies.filter((p) => {
    const days = daysUntil(p.next_payment_date);
    return days !== null && days > 7 && days <= 30;
  });

  const totalPremium = activePolicies.reduce(
    (sum, p) => sum + (Number(p.premium) || 0),
    0
  );

  const estimatedMonthlyRevenue = totalPremium / 12;

  const normalTasks = safeTasks.filter(
    (t) =>
      t.priority === "NORMAL" &&
      t.status !== "concluida"
  ).length;

  const urgentTasks = safeTasks.filter(
    (t) =>
      t.priority === "URGENTE" &&
      t.status !== "concluida"
  ).length;

  const veryUrgentTasks = safeTasks.filter(
    (t) =>
      t.priority === "MUITO URGENTE" &&
      t.status !== "concluida"
  ).length;

  const alerts = [
    ...overdue,
    ...dueToday,
    ...next7Days,
  ].slice(0, 6);

  return {
    props: {
      clients: safeClients.length,
      activePoliciesCount: activePolicies.length,
      cancelledPoliciesCount: cancelledPolicies.length,
      overdueCount: overdue.length,
      dueTodayCount: dueToday.length,
      next7DaysCount: next7Days.length,
      next30DaysCount: next30Days.length,
      totalPremium,
      estimatedMonthlyRevenue,
      alerts,
      normalTasks,
      urgentTasks,
      veryUrgentTasks,
      opportunitiesCount: safeOpportunities.length,
    },
  };
}

export default function Dashboard(props) {
  return (
    <div style={page}>
      <Sidebar active="dashboard" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Dashboard Inteligente</h1>

            <p style={subtitle}>
              Visão operacional da carteira,
              cobranças, tarefas e atividade comercial.
            </p>
          </div>

          <Link href="/tarefas" style={button}>
            Ver tarefas
          </Link>
        </header>

        <section style={stats}>
          <StatCard
            title="Vencidas"
            value={props.overdueCount}
            color="#b91c1c"
          />

          <StatCard
            title="Hoje"
            value={props.dueTodayCount}
            color="#dc2626"
          />

          <StatCard
            title="7 dias"
            value={props.next7DaysCount}
            color="#f59e0b"
          />

          <StatCard
            title="30 dias"
            value={props.next30DaysCount}
            color="#2563eb"
          />
        </section>

        <section style={stats}>
          <StatCard
            title="Tarefas normais"
            value={props.normalTasks}
            color="#64748b"
          />

          <StatCard
            title="Tarefas urgentes"
            value={props.urgentTasks}
            color="#f59e0b"
          />

          <StatCard
            title="Muito urgentes"
            value={props.veryUrgentTasks}
            color="#dc2626"
          />
        </section>

        <section style={stats}>
          <StatCard
            title="Clientes"
            value={props.clients}
          />

          <StatCard
            title="Apólices ativas"
            value={props.activePoliciesCount}
          />

          <StatCard
            title="Apólices anuladas"
            value={props.cancelledPoliciesCount}
          />

          <StatCard
            title="Prémio em vigor"
            value={`${props.totalPremium.toFixed(2)} €`}
          />

          <StatCard
            title="Receita mensal estimada"
            value={`${props.estimatedMonthlyRevenue.toFixed(2)} €`}
          />

          <StatCard
            title="Oportunidades"
            value={props.opportunitiesCount}
          />
        </section>

        <section style={panel}>
          <h2 style={panelTitle}>
            Oportunidades a contactar
          </h2>

          {props.alerts.length === 0 ? (
            <p style={muted}>
              Não existem alertas operacionais.
            </p>
          ) : (
            <div style={list}>
              {props.alerts.map((alert) => (
                <div key={alert.id} style={alertCard}>
                  <div>
                    <strong>
                      {alert.client_name ||
                        "Cliente"}
                    </strong>

                    <p style={smallText}>
                      {alert.type} ·{" "}
                      {alert.insurer}
                    </p>
                  </div>

                  <span style={dangerBadge}>
                    CONTACTAR
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  color = "#111827",
}) {
  return (
    <div style={card}>
      <p style={cardTitle}>{title}</p>

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
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
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

const button = {
  background: "#0f172a",
  color: "white",
  padding: "14px 22px",
  borderRadius: 14,
  textDecoration: "none",
  fontWeight: "bold",
};

const stats = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(200px,1fr))",
  gap: 18,
  marginBottom: 22,
};

const card = {
  background: "white",
  borderRadius: 18,
  padding: 22,
  boxShadow:
    "0 1px 4px rgba(0,0,0,0.08)",
};

const cardTitle = {
  color: "#6b7280",
  marginBottom: 10,
};

const cardValue = {
  fontSize: 24,
  fontWeight: "bold",
};

const panel = {
  background: "white",
  borderRadius: 18,
  padding: 24,
  marginTop: 30,
  boxShadow:
    "0 1px 4px rgba(0,0,0,0.08)",
};

const panelTitle = {
  marginTop: 0,
  marginBottom: 20,
};

const muted = {
  color: "#6b7280",
};

const list = {
  display: "grid",
  gap: 14,
};

const alertCard = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 18,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const smallText = {
  color: "#6b7280",
  marginTop: 4,
};

const dangerBadge = {
  background: "#fee2e2",
  color: "#b91c1c",
  padding: "8px 14px",
  borderRadius: 999,
  fontWeight: "bold",
  fontSize: 12,
};
