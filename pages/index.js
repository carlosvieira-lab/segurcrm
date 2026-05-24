mport Link from "next/link";
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
  const today = new Date()
    .toISOString()
    .split("T")[0];

  const { data: clients } =
    await supabase
      .from("clients")
      .select("*");

  const { data: policies } =
    await supabase
      .from("policies")
      .select("*");

  const { data: tasks } =
    await supabase
      .from("tasks")
      .select("*");

  const { data: opportunities } =
    await supabase
      .from("opportunities")
      .select("*");

  const overdueTasks =
    (tasks || []).filter(
      (task) =>
        task.status !==
          "concluida" &&
        task.due_date &&
        task.due_date < today
    );

  const todayTasks =
    (tasks || []).filter(
      (task) =>
        task.status !==
          "concluida" &&
        task.due_date === today
    );

  const renewal30 =
    (policies || []).filter(
      (policy) => {
        if (!policy.renewal_date)
          return false;

        const renewal =
          new Date(
            policy.renewal_date
          );

        const diff =
          Math.ceil(
            (renewal -
              new Date()) /
              (1000 *
                60 *
                60 *
                24)
          );

        return (
          diff >= 0 &&
          diff <= 30
        );
      }
    );

  const opportunitiesAlert =
    (opportunities || []).filter(
      (item) =>
        item.status !==
          "ganho" &&
        item.status !==
          "perdido" &&
        item.contact_date &&
        item.contact_date <=
          today
    );

  const todayDate = new Date();

  const birthdaysToday =
    (clients || []).filter((client) => {
      if (!client.birth_date) return false;

      const birthDate = new Date(client.birth_date);

      return (
        birthDate.getDate() === todayDate.getDate() &&
        birthDate.getMonth() === todayDate.getMonth()
      );
    });

  const policyRatio =
    clients?.length > 0
      ? (
          (policies?.length || 0) /
          clients.length
        ).toFixed(2)
      : "0.00";

  return {
    props: {
      totalClients:
        clients?.length || 0,
      totalPolicies:
        policies?.length || 0,
      policyRatio,
      overdueTasks:
        overdueTasks.length,
      todayTasks:
        todayTasks.length,
      renewal30:
        renewal30.length,
      opportunitiesAlert:
        opportunitiesAlert.length,
      birthdaysToday:
        birthdaysToday || [],
    },
  };
}

function calculateAge(date) {
  if (!date) return "-";

  const today = new Date();
  const birthDate = new Date(date);

  let age =
    today.getFullYear() -
    birthDate.getFullYear();

  const monthDifference =
    today.getMonth() -
    birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() <
        birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

export default function Dashboard({
  totalClients,
  totalPolicies,
  policyRatio,
  overdueTasks,
  todayTasks,
  renewal30,
  opportunitiesAlert,
  birthdaysToday,
}) {
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
              Visão geral do
              SegurCRM.
            </p>
          </div>
        </div>

        {opportunitiesAlert >
          0 && (
          <Link
            href="/oportunidades"
            style={
              alertCard
            }
          >
            <div>
              <h2
                style={
                  alertTitle
                }
              >
                ⚠️ Alertas de
                Captação
              </h2>

              <p
                style={
                  alertText
                }
              >
                Tens{" "}
                <strong>
                  {
                    opportunitiesAlert
                  }
                </strong>{" "}
                contacto(s)
                comercial(is)
                para fazer
                agora.
              </p>
            </div>

            <div
              style={
                alertButton
              }
            >
              Abrir Agenda
            </div>
          </Link>
        )}

        {birthdaysToday.length >
          0 && (
          <div style={birthdayCard}>
            <h2 style={birthdayTitle}>
              🎂 Aniversários de hoje
            </h2>

            <div style={birthdayList}>
              {birthdaysToday.map(
                (client) => (
                  <Link
                    key={client.id}
                    href={`/clientes/${client.id}`}
                    style={birthdayItem}
                  >
                    <strong>
                      {client.name ||
                        "Cliente sem nome"}
                    </strong>

                    <span>
                      {calculateAge(
                        client.birth_date
                      )}{" "}
                      anos
                    </span>
                  </Link>
                )
              )}
            </div>
          </div>
        )}

        <section style={grid}>
          <Card
            title="Clientes"
            value={
              totalClients
            }
            color="#2563eb"
          />

          <Card
            title="Apólices"
            value={
              totalPolicies
            }
            color="#0f766e"
          />

          <Card
            title="Rácio apólices/cliente"
            value={
              policyRatio
            }
            color="#0891b2"
          />

          <Card
            title="Tarefas vencidas"
            value={
              overdueTasks
            }
            color="#dc2626"
            href="/tarefas?filtro=vencidas"
          />

          <Card
            title="Tarefas hoje"
            value={
              todayTasks
            }
            color="#7c3aed"
            href="/tarefas?filtro=hoje"
          />

          <Card
            title="Renovações 30 dias"
            value={
              renewal30
            }
            color="#f59e0b"
          />

          <Card
            title="Contactos comerciais"
            value={
              opportunitiesAlert
            }
            color="#111827"
          />
        </section>

        <section style={quickGrid}>
          <QuickLink
            href="/clientes"
            title="Clientes"
            desc="Consultar carteira"
          />

          <QuickLink
            href="/apolices"
            title="Apólices"
            desc="Gestão de apólices"
          />

          <QuickLink
            href="/tarefas"
            title="Tarefas"
            desc="Agenda operacional"
          />

          <QuickLink
            href="/oportunidades"
            title="Agenda de Captação"
            desc="Contactos comerciais"
          />

          <QuickLink
            href="/renovacoes"
            title="Renovações"
            desc="Controlo de vencimentos"
          />

          <QuickLink
            href="/financeiro"
            title="Financeiro"
            desc="Comissões e cobranças"
          />
        </section>
      </main>
    </div>
  );
}

function Card({
  title,
  value,
  color,
  href,
}) {
  const content = (
    <>
      <p style={cardLabel}>
        {title}
      </p>

      <h2
        style={{
          ...cardValue,
          color,
        }}
      >
        {value}
      </h2>
    </>
  );

  const cardStyle = {
    ...card,
    borderTop: `6px solid ${color}`,
    textDecoration: "none",
    color: "#111827",
    cursor: href ? "pointer" : "default",
  };

  if (href) {
    return (
      <Link href={href} style={cardStyle}>
        {content}
      </Link>
    );
  }

  return (
    <div style={cardStyle}>
      {content}
    </div>
  );
}

function QuickLink({
  href,
  title,
  desc,
}) {
  return (
    <Link
      href={href}
      style={quickCard}
    >
      <h3>{title}</h3>
      <p>{desc}</p>
    </Link>
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

const alertCard = {
  background:
    "linear-gradient(135deg,#fee2e2,#fecaca)",
  border:
    "2px solid #dc2626",
  borderRadius: 18,
  padding: 24,
  marginBottom: 30,
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  textDecoration: "none",
  color: "#111827",
};

const alertTitle = {
  margin: 0,
  color: "#991b1b",
};

const alertText = {
  marginTop: 10,
};

const alertButton = {
  background: "#dc2626",
  color: "white",
  padding:
    "12px 18px",
  borderRadius: 10,
  fontWeight: "bold",
};

const birthdayCard = {
  background:
    "linear-gradient(135deg,#fef3c7,#fde68a)",
  border: "2px solid #f59e0b",
  borderRadius: 18,
  padding: 24,
  marginBottom: 30,
};

const birthdayTitle = {
  margin: 0,
  color: "#92400e",
};

const birthdayList = {
  marginTop: 18,
  display: "grid",
  gap: 12,
};

const birthdayItem = {
  background: "rgba(255,255,255,0.7)",
  padding: 14,
  borderRadius: 12,
  textDecoration: "none",
  color: "#111827",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 18,
  marginBottom: 30,
};

const card = {
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
  marginTop: 12,
  fontSize: 34,
};

const quickGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 18,
};

const quickCard = {
  background: "white",
  padding: 22,
  borderRadius: 18,
  textDecoration: "none",
  color: "#111827",
  boxShadow:
    "0 1px 4px rgba(0,0,0,0.08)",
};

