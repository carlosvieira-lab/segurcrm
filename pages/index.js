import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "../components/Sidebar";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

export async function getServerSideProps() {
  const { data: clients } =
    await supabase
      .from("clients")
      .select("*");

  const { data: policies } =
    await supabase
      .from("policies")
      .select("*");

  const { data: claims } =
    await supabase
      .from("claims")
      .select("*");

  const { data: tasks } =
    await supabase
      .from("tasks")
      .select("*");

  return {
    props: {
      clients: clients || [],
      policies: policies || [],
      claims: claims || [],
      tasks: tasks || [],
    },
  };
}

export default function Dashboard({
  clients,
  policies,
  claims,
  tasks,
}) {
  const activePolicies =
    policies.filter(
      (p) => p.status !== "anulada"
    );

  const totalPremium =
    activePolicies.reduce(
      (sum, p) =>
        sum +
        Number(
          p.annual_premium || 0
        ),
      0
    );

  const openClaims =
    claims.filter(
      (c) =>
        c.status !== "ENCERRADO"
    );

  const openTasks =
    tasks.filter(
      (t) => t.status !== "fechada"
    );

  async function generateRenewalTasks() {
    const response =
      await fetch(
        "/api/generate-renewal-tasks",
        {
          method: "POST",
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      alert(
        result.error ||
          "Erro ao gerar tarefas"
      );
      return;
    }

    alert(
      `Tarefas criadas: ${result.created}`
    );

    window.location.reload();
  }

  return (
    <div style={page}>
      <Sidebar active="dashboard" />

      <main style={main}>
        <div style={header}>
          <div>
            <h1 style={title}>
              Dashboard
            </h1>

            <p style={subtitle}>
              Visão global da operação da mediadora.
            </p>

            <button
              style={
                automationButton
              }
              onClick={
                generateRenewalTasks
              }
            >
              Gerar tarefas de renovação
            </button>
          </div>
        </div>

        <section style={grid}>
          <Card
            title="Clientes"
            value={clients.length}
            color="#2563eb"
          />

          <Card
            title="Apólices ativas"
            value={
              activePolicies.length
            }
            color="#16a34a"
          />

          <Card
            title="Prémios anuais"
            value={`${totalPremium.toFixed(
              2
            )} €`}
            color="#7c3aed"
          />

          <Card
            title="Sinistros abertos"
            value={
              openClaims.length
            }
            color="#dc2626"
          />

          <Card
            title="Tarefas abertas"
            value={
              openTasks.length
            }
            color="#f59e0b"
          />
        </section>

        <section style={section}>
          <div style={sectionTop}>
            <h2>
              Últimos clientes
            </h2>

            <Link
              href="/clientes"
              style={linkButton}
            >
              Ver todos
            </Link>
          </div>

          <div style={list}>
            {clients
              .slice(0, 5)
              .map((client) => (
                <Link
                  key={client.id}
                  href={`/clientes/${client.id}`}
                  style={item}
                >
                  <strong>
                    {client.name}
                  </strong>

                  <span>
                    {client.nif ||
                      "-"}
                  </span>
                </Link>
              ))}
          </div>
        </section>

        <section style={section}>
          <div style={sectionTop}>
            <h2>
              Tarefas recentes
            </h2>

            <Link
              href="/tarefas"
              style={linkButton}
            >
              Ver tarefas
            </Link>
          </div>

          <div style={list}>
            {tasks
              .slice(0, 5)
              .map((task) => (
                <div
                  key={task.id}
                  style={item}
                >
                  <strong>
                    {task.title}
                  </strong>

                  <span>
                    {task.priority ||
                      "-"}
                  </span>
                </div>
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Card({
  title,
  value,
  color,
}) {
  return (
    <div
      style={{
        ...card,
        borderTop: `6px solid ${color}`,
      }}
    >
      <p style={cardTitle}>
        {title}
      </p>

      <h2 style={cardValue}>
        {value}
      </h2>
    </div>
  );
}

const page = {
  display: "flex",
  minHeight: "100vh",
  background: "#f3f4f6",
  fontFamily:
    "Arial, sans-serif",
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

const automationButton = {
  marginTop: 16,
  background: "#7c3aed",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 20,
  marginBottom: 30,
};

const card = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  boxShadow:
    "0 1px 4px rgba(0,0,0,0.08)",
};

const cardTitle = {
  color: "#6b7280",
  marginBottom: 12,
};

const cardValue = {
  margin: 0,
  fontSize: 32,
};

const section = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  boxShadow:
    "0 1px 4px rgba(0,0,0,0.08)",
};

const sectionTop = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  marginBottom: 18,
};

const linkButton = {
  background: "#111827",
  color: "white",
  padding: "10px 14px",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: "bold",
};

const list = {
  display: "grid",
  gap: 12,
};

const item = {
  background: "#f9fafb",
  padding: 16,
  borderRadius: 12,
  display: "flex",
  justifyContent:
    "space-between",
  textDecoration: "none",
  color: "#111827",
};
