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
  const { data: tasks } = await supabase
    .from("tasks")
    .select(`
      *,
      clients(id, name, nif),
      policies(policy_number, branch, license_plate)
    `)
    .order("due_date", { ascending: true });

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("*")
    .order("next_followup", { ascending: true });

  const { data: policies } = await supabase
    .from("policies")
    .select(`
      *,
      clients(id, name, nif),
      insurers(name)
    `)
    .neq("status", "anulada")
    .order("renewal_date", { ascending: true });

  return {
    props: {
      tasks: tasks || [],
      opportunities: opportunities || [],
      policies: policies || [],
    },
  };
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-PT").format(new Date(date));
}

function isBetween(date, start, end) {
  if (!date) return false;
  return date >= start && date <= end;
}

export default function Agenda({ tasks, opportunities, policies }) {
  const today = todayISO();
  const next7 = addDays(7);
  const next30 = addDays(30);

  const openTasks = tasks.filter((t) => t.status !== "concluida");

  const overdueTasks = openTasks.filter(
    (t) => t.due_date && t.due_date < today
  );

  const todayTasks = openTasks.filter((t) => t.due_date === today);

  const upcomingTasks = openTasks.filter((t) =>
    isBetween(t.due_date, today, next7)
  );

  const followupsToday = opportunities.filter(
    (o) =>
      o.next_followup === today &&
      o.status !== "ganho" &&
      o.status !== "perdido"
  );

  const followupsSoon = opportunities.filter(
    (o) =>
      isBetween(o.next_followup, today, next7) &&
      o.status !== "ganho" &&
      o.status !== "perdido"
  );

  const renewalsSoon = policies.filter((p) =>
    isBetween(p.renewal_date, today, next30)
  );

  const nextPayments = policies.filter((p) =>
    isBetween(p.next_payment_date, today, next7)
  );

  return (
    <div style={page}>
      <Sidebar active="agenda" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Agenda Operacional</h1>
            <p style={subtitle}>
              Tarefas, cobranças, renovações e follow-ups comerciais.
            </p>
          </div>
        </header>

        <section style={statsGrid}>
          <StatCard title="Vencidas" value={overdueTasks.length} color="#dc2626" />
          <StatCard title="Hoje" value={todayTasks.length} color="#2563eb" />
          <StatCard title="Próx. 7 dias" value={upcomingTasks.length} color="#7c3aed" />
          <StatCard title="Follow-ups hoje" value={followupsToday.length} color="#0f766e" />
          <StatCard title="Renovações 30 dias" value={renewalsSoon.length} color="#f59e0b" />
          <StatCard title="Cobranças 7 dias" value={nextPayments.length} color="#16a34a" />
        </section>

        <section style={grid2}>
          <Panel title="Tarefas vencidas">
            <TaskList items={overdueTasks} />
          </Panel>

          <Panel title="Tarefas de hoje">
            <TaskList items={todayTasks} />
          </Panel>
        </section>

        <section style={grid2}>
          <Panel title="Próximas tarefas">
            <TaskList items={upcomingTasks} />
          </Panel>

          <Panel title="Follow-ups comerciais">
            <OpportunityList items={followupsSoon} />
          </Panel>
        </section>

        <section style={grid2}>
          <Panel title="Renovações próximas">
            <PolicyList items={renewalsSoon} type="renewal" />
          </Panel>

          <Panel title="Cobranças próximas">
            <PolicyList items={nextPayments} type="payment" />
          </Panel>
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

function Panel({ title, children }) {
  return (
    <section style={panel}>
      <h2 style={panelTitle}>{title}</h2>
      {children}
    </section>
  );
}

function TaskList({ items }) {
  if (items.length === 0) {
    return <p style={muted}>Sem registos.</p>;
  }

  return (
    <div style={list}>
      {items.slice(0, 8).map((task) => (
        <Link
          key={task.id}
          href={task.client_id ? `/clientes/${task.client_id}` : "/tarefas"}
          style={item}
        >
          <strong>{task.title}</strong>
          <span>
            {task.clients?.name || "Tarefa geral"} · {task.priority || "NORMAL"} ·{" "}
            {formatDate(task.due_date)}
          </span>
        </Link>
      ))}
    </div>
  );
}

function OpportunityList({ items }) {
  if (items.length === 0) {
    return <p style={muted}>Sem follow-ups.</p>;
  }

  return (
    <div style={list}>
      {items.slice(0, 8).map((item) => (
        <Link key={item.id} href="/oportunidades" style={itemStyle}>
          <strong>{item.name}</strong>
          <span>
            {item.contact_name || "-"} · {item.phone || "-"} ·{" "}
            {formatDate(item.next_followup)}
          </span>
        </Link>
      ))}
    </div>
  );
}

function PolicyList({ items, type }) {
  if (items.length === 0) {
    return <p style={muted}>Sem registos.</p>;
  }

  return (
    <div style={list}>
      {items.slice(0, 8).map((policy) => (
        <Link
          key={policy.id}
          href={`/clientes/${policy.client_id}`}
          style={item}
        >
          <strong>
            {policy.clients?.name || "-"} · {policy.policy_number || "-"}
          </strong>
          <span>
            {policy.branch || "-"} · {policy.license_plate || "-"} ·{" "}
            {type === "renewal"
              ? `Renovação: ${formatDate(policy.renewal_date)}`
              : `Cobrança: ${formatDate(policy.next_payment_date)}`}
          </span>
        </Link>
      ))}
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
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 16,
  marginBottom: 28,
};

const statCard = {
  background: "white",
  padding: 22,
  borderRadius: 18,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const cardLabel = {
  color: "#6b7280",
  margin: 0,
};

const cardValue = {
  fontSize: 30,
  marginTop: 10,
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 24,
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
  marginBottom: 18,
};

const list = {
  display: "grid",
  gap: 12,
};

const item = {
  background: "#f9fafb",
  padding: 16,
  borderRadius: 12,
  textDecoration: "none",
  color: "#111827",
  display: "grid",
  gap: 6,
};

const itemStyle = item;

const muted = {
  color: "#6b7280",
};
