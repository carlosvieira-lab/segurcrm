import { useState } from "react";
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

  const { data: dashboardAlerts } =
    await supabase
      .from("dashboard_alerts")
      .select("*")
      .neq("status", "concluido")
      .lte("alert_date", today)
      .order("alert_date", { ascending: true })
      .order("alert_time", { ascending: true });

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

  const activePolicies =
    (policies || []).filter(
      (policy) =>
        policy.status !== "anulada"
    );

  const activeClientIds =
    new Set(
      activePolicies
        .map((policy) => policy.client_id)
        .filter(Boolean)
    );

  const activeClients =
    activeClientIds.size;

  const potentialClients =
    (clients?.length || 0) -
    activeClients;

  const policyRatio =
    activeClients > 0
      ? (
          activePolicies.length /
          activeClients
        ).toFixed(2)
      : "0.00";

  return {
    props: {
      totalClients:
        clients?.length || 0,
      totalPolicies:
        policies?.length || 0,
      activeClients,
      potentialClients,
      activePolicies:
        activePolicies.length,
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
      dashboardAlerts:
        dashboardAlerts || [],
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

function formatDate(date) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("pt-PT").format(
    new Date(`${date}T00:00:00`)
  );
}

function escapeCalendarText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function buildCalendarUrl(alert) {
  const title = alert?.title || "Alerta CRM";
  const date = alert?.alert_date || new Date().toISOString().split("T")[0];
  const time = alert?.alert_time || "09:00";
  const cleanTime = time.length === 5 ? `${time}:00` : time;
  const startDate = new Date(`${date}T${cleanTime}`);
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

  const formatCalendarDate = (value) => {
    const pad = (number) => String(number).padStart(2, "0");

    return `${value.getFullYear()}${pad(value.getMonth() + 1)}${pad(value.getDate())}T${pad(value.getHours())}${pad(value.getMinutes())}${pad(value.getSeconds())}`;
  };

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SegurCRM//Dashboard Alert//PT",
    "BEGIN:VEVENT",
    `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@segurcrm`,
    `DTSTAMP:${formatCalendarDate(new Date())}`,
    `DTSTART:${formatCalendarDate(startDate)}`,
    `DTEND:${formatCalendarDate(endDate)}`,
    `SUMMARY:${escapeCalendarText(title)}`,
    `DESCRIPTION:${escapeCalendarText(alert?.notes || "Criado no SegurCRM")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(calendar)}`;
}

function buildInitialAlertForm() {
  return {
    title: "",
    alert_date: new Date().toISOString().split("T")[0],
    alert_time: "09:00",
    notes: "",
  };
}

export default function Dashboard({
  totalClients,
  totalPolicies,
  activeClients,
  potentialClients,
  activePolicies,
  policyRatio,
  overdueTasks,
  todayTasks,
  renewal30,
  opportunitiesAlert,
  birthdaysToday,
  dashboardAlerts,
}) {
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [savingAlert, setSavingAlert] = useState(false);
  const [personalAlerts, setPersonalAlerts] = useState(dashboardAlerts || []);
  const [alertForm, setAlertForm] = useState(buildInitialAlertForm);

  async function saveDashboardAlert(event) {
    event.preventDefault();

    if (!alertForm.title.trim()) {
      alert("Preenche o título do alerta.");
      return;
    }

    if (!alertForm.alert_date) {
      alert("Escolhe a data do alerta.");
      return;
    }

    setSavingAlert(true);

    const payload = {
      title: alertForm.title.trim(),
      alert_date: alertForm.alert_date,
      alert_time: alertForm.alert_time || "09:00",
      notes: alertForm.notes || null,
      status: "pendente",
    };

    const { data, error } = await supabase
      .from("dashboard_alerts")
      .insert(payload)
      .select("*")
      .single();

    setSavingAlert(false);

    if (error) {
      alert(error.message);
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    if (data && data.alert_date <= today) {
      setPersonalAlerts((current) => [...current, data]);
    }

    setAlertForm(buildInitialAlertForm());
    setShowAlertForm(false);
  }

  async function completeDashboardAlert(item) {
    const ok = window.confirm(`Marcar como concluído: ${item.title}?`);
    if (!ok) return;

    const { error } = await supabase
      .from("dashboard_alerts")
      .update({
        status: "concluido",
        completed_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      alert(error.message);
      return;
    }

    setPersonalAlerts((current) =>
      current.filter((alertItem) => alertItem.id !== item.id)
    );
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
              Visão geral do
              SegurCRM.
            </p>
          </div>

          <button
            type="button"
            style={newAlertButton}
            onClick={() => setShowAlertForm(true)}
          >
            + Criar alerta
          </button>
        </div>

        {showAlertForm && (
          <div style={modalOverlay}>
            <div style={alertModal}>
              <div style={modalHeader}>
                <div>
                  <h2 style={personalAlertTitle}>
                    🟣 Novo alerta pessoal
                  </h2>
                  <p style={modalSubtitle}>
                    Cria um lembrete para aparecer no Dashboard quando chegar o dia.
                  </p>
                </div>

                <button
                  type="button"
                  style={modalCloseButton}
                  onClick={() => setShowAlertForm(false)}
                >
                  Fechar
                </button>
              </div>

              <form style={alertFormGrid} onSubmit={saveDashboardAlert}>
                <label style={fieldLabel}>
                  Título do alerta
                  <input
                    style={input}
                    value={alertForm.title}
                    onChange={(event) =>
                      setAlertForm({
                        ...alertForm,
                        title: event.target.value,
                      })
                    }
                    placeholder="Ex: Pagar PC Zurich"
                    required
                  />
                </label>

                <label style={fieldLabel}>
                  Data
                  <input
                    type="date"
                    style={input}
                    value={alertForm.alert_date}
                    onChange={(event) =>
                      setAlertForm({
                        ...alertForm,
                        alert_date: event.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label style={fieldLabel}>
                  Hora
                  <input
                    type="time"
                    style={input}
                    value={alertForm.alert_time}
                    onChange={(event) =>
                      setAlertForm({
                        ...alertForm,
                        alert_time: event.target.value,
                      })
                    }
                  />
                </label>

                <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
                  Notas
                  <textarea
                    style={textarea}
                    value={alertForm.notes}
                    onChange={(event) =>
                      setAlertForm({
                        ...alertForm,
                        notes: event.target.value,
                      })
                    }
                    placeholder="Notas opcionais sobre este alerta..."
                  />
                </label>

                <div style={modalActions}>
                  <button
                    type="submit"
                    style={saveAlertButton}
                    disabled={savingAlert}
                  >
                    {savingAlert ? "A guardar..." : "Guardar alerta"}
                  </button>

                  <a
                    href={buildCalendarUrl(alertForm)}
                    download="alerta-segurcrm.ics"
                    style={calendarButton}
                  >
                    📅 Adicionar à agenda
                  </a>
                </div>
              </form>
            </div>
          </div>
        )}

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

        {personalAlerts.length > 0 && (
          <div style={personalAlertCard}>
            <div style={personalAlertHeader}>
              <div>
                <h2 style={personalAlertTitle}>
                  🟣 Alertas pessoais
                </h2>

                <p style={personalAlertText}>
                  Tens {personalAlerts.length} alerta(s) pendente(s). Só desaparecem quando marcares como concluído.
                </p>
              </div>
            </div>

            <div style={personalAlertList}>
              {personalAlerts.map((item) => (
                <div key={item.id} style={personalAlertItem}>
                  <div>
                    <strong>{item.title}</strong>
                    <p style={personalAlertMeta}>
                      {formatDate(item.alert_date)} · {item.alert_time || "09:00"}
                    </p>

                    {item.notes && (
                      <p style={personalAlertNotes}>{item.notes}</p>
                    )}
                  </div>

                  <div style={personalAlertActions}>
                    <a
                      href={buildCalendarUrl(item)}
                      download="alerta-segurcrm.ics"
                      style={smallCalendarButton}
                    >
                      📅 Agenda
                    </a>

                    <button
                      type="button"
                      style={completeButton}
                      onClick={() => completeDashboardAlert(item)}
                    >
                      ✓ Concluído
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
            title="Clientes em vigor"
            value={
              activeClients
            }
            color="#2563eb"
          />

          <Card
            title="Clientes potenciais"
            value={
              potentialClients
            }
            color="#f59e0b"
          />

          <Card
            title="Apólices em vigor"
            value={
              activePolicies
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

          <Card
            title="Alertas pessoais"
            value={
              personalAlerts.length
            }
            color="#7c3aed"
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
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 18,
};

const title = {
  fontSize: 42,
  margin: 0,
};

const subtitle = {
  color: "#6b7280",
  marginTop: 10,
};

const newAlertButton = {
  background: "#7c3aed",
  color: "white",
  border: "none",
  borderRadius: 12,
  padding: "14px 18px",
  fontWeight: "bold",
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(124,58,237,0.25)",
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

const personalAlertCard = {
  background:
    "linear-gradient(135deg,#ddd6fe,#c4b5fd)",
  border: "2px solid #7c3aed",
  borderRadius: 18,
  padding: 24,
  marginBottom: 30,
  color: "#111827",
};

const personalAlertHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 18,
};

const personalAlertTitle = {
  margin: 0,
  color: "#4c1d95",
};

const personalAlertText = {
  marginTop: 10,
  color: "#4c1d95",
};

const personalAlertList = {
  display: "grid",
  gap: 12,
  marginTop: 18,
};

const personalAlertItem = {
  background: "rgba(255,255,255,0.72)",
  border: "1px solid rgba(124,58,237,0.35)",
  borderRadius: 14,
  padding: 16,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 18,
};

const personalAlertMeta = {
  margin: "6px 0 0",
  color: "#5b21b6",
  fontWeight: "bold",
};

const personalAlertNotes = {
  margin: "8px 0 0",
  color: "#374151",
};

const personalAlertActions = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const completeButton = {
  background: "#166534",
  color: "white",
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: "bold",
  cursor: "pointer",
};

const smallCalendarButton = {
  background: "#4c1d95",
  color: "white",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: "bold",
  textDecoration: "none",
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

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(17,24,39,0.64)",
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const alertModal = {
  width: "min(820px, 96vw)",
  background: "linear-gradient(135deg,#f5f3ff,#ede9fe)",
  border: "2px solid #7c3aed",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 24px 70px rgba(17,24,39,0.32)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 18,
  marginBottom: 20,
};

const modalSubtitle = {
  color: "#5b21b6",
  marginTop: 8,
};

const modalCloseButton = {
  background: "#6b7280",
  color: "white",
  border: "none",
  borderRadius: 10,
  padding: "11px 14px",
  fontWeight: "bold",
  cursor: "pointer",
};

const alertFormGrid = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr",
  gap: 14,
};

const fieldLabel = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontWeight: "bold",
  color: "#374151",
};

const input = {
  border: "1px solid #c4b5fd",
  borderRadius: 10,
  padding: "12px 13px",
  fontSize: 15,
  background: "white",
};

const textarea = {
  border: "1px solid #c4b5fd",
  borderRadius: 10,
  padding: "12px 13px",
  fontSize: 15,
  background: "white",
  minHeight: 120,
  resize: "vertical",
};

const modalActions = {
  gridColumn: "1 / -1",
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 4,
};

const saveAlertButton = {
  background: "#7c3aed",
  color: "white",
  border: "none",
  borderRadius: 10,
  padding: "12px 16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const calendarButton = {
  background: "#111827",
  color: "white",
  borderRadius: 10,
  padding: "12px 16px",
  fontWeight: "bold",
  textDecoration: "none",
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
  minHeight: 130,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
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
