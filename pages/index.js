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

  return {
    props: {
      totalClients:
        clients?.length || 0,
      totalPolicies:
        policies?.length || 0,
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
