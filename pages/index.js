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

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthStart = new Date(currentYear, currentMonth, 1)
    .toISOString()
    .split("T")[0];
  const monthEnd = new Date(currentYear, currentMonth + 1, 0)
    .toISOString()
    .split("T")[0];

  const { data: clients } =
    await supabase
      .from("clients")
      .select("*");

  async function fetchPoliciesRange(from, to) {
    const { data, error } =
      await supabase
        .from("policies")
        .select("*")
        .range(from, to);

    if (error) {
      console.log(
        "Erro ao carregar apólices no Dashboard:",
        error.message
      );
      return [];
    }

    return data || [];
  }

  const firstPoliciesBatch =
    await fetchPoliciesRange(0, 999);

  const secondPoliciesBatch =
    await fetchPoliciesRange(1000, 1999);

  const thirdPoliciesBatch =
    await fetchPoliciesRange(2000, 2999);

  const policies = [
    ...firstPoliciesBatch,
    ...secondPoliciesBatch,
    ...thirdPoliciesBatch,
  ];

  const { data: tasks } =
    await supabase
      .from("tasks")
      .select("*");

  const { data: opportunities } =
    await supabase
      .from("opportunities")
      .select("*");

  const { data: dueDashboardAlerts } =
    await supabase
      .from("dashboard_alerts")
      .select("*")
      .eq("status", "pendente")
      .lte("alert_date", today)
      .order("alert_date", { ascending: true })
      .order("alert_time", { ascending: true });

  const { data: upcomingDashboardAlerts } =
    await supabase
      .from("dashboard_alerts")
      .select("*")
      .eq("status", "pendente")
      .gt("alert_date", today)
      .order("alert_date", { ascending: true })
      .order("alert_time", { ascending: true })
      .limit(10);

  const { data: completedDashboardAlerts } =
    await supabase
      .from("dashboard_alerts")
      .select("*")
      .eq("status", "concluido")
      .order("completed_at", { ascending: false })
      .limit(8);

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
        policy.status === "ativa"
    );

  const effectiveClientIds =
    new Set(
      (policies || [])
        .map((policy) => policy.client_id)
        .filter(Boolean)
    );

  const activeClients =
    effectiveClientIds.size;

  const potentialClients =
    Math.max(
      (clients?.length || 0) -
        activeClients,
      0
    );

  const policyRatio =
    activeClients > 0
      ? (
          activePolicies.length /
          activeClients
        ).toFixed(2)
      : "0.00";

  const portfolioAnnualPremium =
    activePolicies.reduce(
      (sum, policy) =>
        sum +
        getPolicyPremium(policy),
      0
    );

  const portfolioAnnualCommission =
    activePolicies.reduce(
      (sum, policy) =>
        sum +
        getPolicyCommission(policy),
      0
    );

  const monthlyPolicies =
    activePolicies.filter((policy) => {
      if (!policy.start_date) {
        return false;
      }

      const cleanDate =
        String(policy.start_date).slice(0, 10);

      return (
        cleanDate >= monthStart &&
        cleanDate <= monthEnd
      );
    });

  const monthlyPremium =
    monthlyPolicies.reduce(
      (sum, policy) =>
        sum +
        getPolicyPremium(policy),
      0
    );

  const monthlyCommission =
    monthlyPolicies.reduce(
      (sum, policy) =>
        sum +
        getPolicyCommission(policy),
      0
    );

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
      dueDashboardAlerts:
        dueDashboardAlerts || [],
      upcomingDashboardAlerts:
        upcomingDashboardAlerts || [],
      completedDashboardAlerts:
        completedDashboardAlerts || [],
      portfolioAnnualPremium,
      portfolioAnnualCommission,
      portfolioMonthlyCommissionEstimate:
        portfolioAnnualCommission / 12,
      monthlyPolicies:
        monthlyPolicies.length,
      monthlyPremium,
      monthlyCommission,
      currentMonthLabel:
        new Intl.DateTimeFormat("pt-PT", {
          month: "long",
          year: "numeric",
        }).format(now),
    },
  };
}

function getPolicyPremium(policy) {
  return Number(
    policy.annual_premium ??
      policy.total_premium ??
      policy.premium ??
      policy.prize ??
      policy.valor_premio ??
      policy.premio_anual ??
      policy.premio ??
      0
  ) || 0;
}

function getFrequencyMultiplier(frequency) {
  const value = String(frequency || "anual").toLowerCase();

  if (value === "mensal") return 12;
  if (value === "trimestral") return 4;
  if (value === "semestral") return 2;

  return 1;
}

function getPolicyCommission(policy) {
  const commissionPerPayment =
    Number(policy.commission_per_payment || 0);

  return (
    commissionPerPayment *
    getFrequencyMultiplier(policy.payment_frequency)
  );
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

function formatEuro(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-PT").format(new Date(date));
}

function buildInitialAlertForm() {
  const now = new Date();

  return {
    title: "",
    alert_date: now.toISOString().split("T")[0],
    alert_time: "09:00",
    notes: "",
  };
}

function buildGoogleCalendarUrl(alert) {
  const date = String(alert.alert_date || "").replace(/-/g, "");
  const time = String(alert.alert_time || "09:00").slice(0, 5).replace(":", "");
  const start = `${date}T${time}00`;
  const endHour = String(Number(time.slice(0, 2)) + 1).padStart(2, "0");
  const end = `${date}T${endHour}${time.slice(2)}00`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: alert.title || "Alerta CRM",
    details: alert.notes || "Alerta criado no SegurCRM.",
    dates: `${start}/${end}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
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
  dueDashboardAlerts,
  upcomingDashboardAlerts,
  completedDashboardAlerts,
  portfolioAnnualPremium,
  portfolioAnnualCommission,
  portfolioMonthlyCommissionEstimate,
  monthlyPolicies,
  monthlyPremium,
  monthlyCommission,
  currentMonthLabel,
}) {
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showUpcomingAlertsModal, setShowUpcomingAlertsModal] = useState(false);
  const [showCompletedAlerts, setShowCompletedAlerts] = useState(false);
  const [alertForm, setAlertForm] = useState(buildInitialAlertForm);
  const [saving, setSaving] = useState(false);
  const [completionModalAlert, setCompletionModalAlert] = useState(null);
  const [completionNote, setCompletionNote] = useState("");

  async function saveDashboardAlert(openCalendar = false) {
    if (!alertForm.title.trim()) {
      alert("Preenche o título do alerta.");
      return;
    }

    if (!alertForm.alert_date) {
      alert("Escolhe a data do alerta.");
      return;
    }

    setSaving(true);

    const payload = {
      title: alertForm.title.trim(),
      alert_date: alertForm.alert_date,
      alert_time: alertForm.alert_time || null,
      notes: alertForm.notes || null,
      status: "pendente",
      google_calendar_created: openCalendar,
      google_calendar_opened_at: openCalendar ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("dashboard_alerts")
      .insert(payload);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    if (openCalendar) {
      window.open(buildGoogleCalendarUrl(payload), "_blank", "noopener,noreferrer");
    }

    setShowAlertModal(false);
    setAlertForm(buildInitialAlertForm());

    window.location.reload();
  }

  async function markGoogleCalendarCreated(alertItem) {
    const { error } = await supabase
      .from("dashboard_alerts")
      .update({
        google_calendar_created: true,
        google_calendar_opened_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", alertItem.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.open(buildGoogleCalendarUrl(alertItem), "_blank", "noopener,noreferrer");
    window.location.reload();
  }

  function openCompleteAlertModal(alertItem) {
    setCompletionModalAlert(alertItem);
    setCompletionNote("");
  }

  function closeCompleteAlertModal() {
    setCompletionModalAlert(null);
    setCompletionNote("");
  }

  async function completeDashboardAlert() {
    if (!completionModalAlert) return;

    setSaving(true);

    const { error } = await supabase
      .from("dashboard_alerts")
      .update({
        status: "concluido",
        completion_note: completionNote.trim() || null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", completionModalAlert.id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    closeCompleteAlertModal();
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
              Visão geral do
              SegurCRM.
            </p>
          </div>

          <button
            type="button"
            style={newAlertButton}
            onClick={() => setShowAlertModal(true)}
          >
            + Criar alerta
          </button>
        </div>

        {showAlertModal && (
          <div style={modalOverlay}>
            <div style={alertModal}>
              <div style={modalHeader}>
                <div>
                  <h2 style={personalAlertTitle}>
                    🟣 Novo alerta pessoal
                  </h2>

                  <p style={subtitle}>
                    Cria um lembrete para aparecer no Dashboard e, se quiseres, adiciona ao Google Calendar para sincronizar com o S22.
                  </p>
                </div>

                <button
                  type="button"
                  style={grayButton}
                  onClick={() => setShowAlertModal(false)}
                >
                  Fechar
                </button>
              </div>

              <div style={alertFormGrid}>
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
              </div>

              <div style={modalActions}>
                <button
                  type="button"
                  style={purpleButton}
                  disabled={saving}
                  onClick={() => saveDashboardAlert(false)}
                >
                  {saving ? "A guardar..." : "Guardar só no CRM"}
                </button>

                <button
                  type="button"
                  style={darkButton}
                  disabled={saving}
                  onClick={() => saveDashboardAlert(true)}
                >
                  📅 Guardar + Google Calendar
                </button>
              </div>
            </div>
          </div>
        )}

        {completionModalAlert && (
          <div style={modalOverlay}>
            <div style={completionAlertModal}>
              <div style={modalHeader}>
                <div>
                  <h2 style={completionAlertTitle}>
                    ✅ Concluir alerta
                  </h2>

                  <p style={subtitle}>
                    {completionModalAlert.title}
                  </p>
                </div>

                <button
                  type="button"
                  style={grayButton}
                  onClick={closeCompleteAlertModal}
                >
                  Fechar
                </button>
              </div>

              <label style={fieldLabel}>
                Comentário de conclusão
                <textarea
                  style={textarea}
                  value={completionNote}
                  onChange={(event) => setCompletionNote(event.target.value)}
                  placeholder="Ex: Paguei no dia 18/06 por MB, confirmei com o cliente, assunto resolvido..."
                  autoFocus
                />
              </label>

              <div style={modalActions}>
                <button
                  type="button"
                  style={purpleButton}
                  disabled={saving}
                  onClick={completeDashboardAlert}
                >
                  {saving ? "A guardar..." : "Guardar conclusão"}
                </button>

                <button
                  type="button"
                  style={grayButton}
                  onClick={closeCompleteAlertModal}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {showUpcomingAlertsModal && (
          <div style={modalOverlay}>
            <div style={upcomingAlertsModal}>
              <div style={modalHeader}>
                <div>
                  <h2 style={upcomingAlertTitle}>
                    🔵 Próximos alertas
                  </h2>

                  <p style={subtitle}>
                    Alertas futuros já guardados no CRM. Aqui confirmas o que está criado sem ocupar espaço no Dashboard.
                  </p>
                </div>

                <button
                  type="button"
                  style={grayButton}
                  onClick={() => setShowUpcomingAlertsModal(false)}
                >
                  Fechar
                </button>
              </div>

              {upcomingDashboardAlerts.length === 0 ? (
                <p style={mutedText}>
                  Não existem alertas futuros criados.
                </p>
              ) : (
                <div style={modalAlertList}>
                  {upcomingDashboardAlerts.map((item) => (
                    <AlertRow
                      key={item.id}
                      item={item}
                      onComplete={openCompleteAlertModal}
                      onCalendar={markGoogleCalendarCreated}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <section style={alertsControlPanel}>
          <div>
            <h2 style={alertsControlTitle}>🟣 Gestão de alertas pessoais</h2>
            <p style={alertsControlText}>
              Confirma aqui se os alertas ficaram guardados no CRM e se já foram enviados para o Google Calendar.
            </p>
          </div>

          <div style={alertsControlButtons}>
            <button
              type="button"
              style={toggleButton}
              onClick={() => setShowUpcomingAlertsModal(true)}
            >
              Ver próximos: {upcomingDashboardAlerts.length}
            </button>

            <button
              type="button"
              style={showCompletedAlerts ? activeToggleButton : toggleButton}
              onClick={() => setShowCompletedAlerts(!showCompletedAlerts)}
            >
              Concluídos: {completedDashboardAlerts.length}
            </button>
          </div>
        </section>

        {dueDashboardAlerts.length > 0 && (
          <section style={personalAlertCard}>
            <div>
              <h2 style={personalAlertTitle}>
                🟣 Alertas de hoje / atrasados
              </h2>

              <p style={personalAlertText}>
                Tens{" "}
                <strong>
                  {dueDashboardAlerts.length}
                </strong>{" "}
                alerta(s) pessoal(is) para tratar.
              </p>
            </div>

            <div style={personalAlertList}>
              {dueDashboardAlerts.map((item) => (
                <AlertRow
                  key={item.id}
                  item={item}
                  onComplete={openCompleteAlertModal}
                  onCalendar={markGoogleCalendarCreated}
                  important
                />
              ))}
            </div>
          </section>
        )}

        {showCompletedAlerts && (
          <section style={completedAlertCard}>
            <div>
              <h2 style={completedAlertTitle}>
                ⚫ Últimos alertas concluídos
              </h2>

              <p style={completedAlertText}>
                Histórico recente de alertas fechados no CRM.
              </p>
            </div>

            {completedDashboardAlerts.length === 0 ? (
              <p style={mutedText}>
                Ainda não existem alertas concluídos.
              </p>
            ) : (
              <div style={personalAlertList}>
                {completedDashboardAlerts.map((item) => (
                  <div key={item.id} style={completedAlertItem}>
                    <div>
                      <strong>{item.title}</strong>

                      <p style={completedAlertMeta}>
                        Alerta: {formatDate(item.alert_date)}
                        {item.alert_time ? ` · ${String(item.alert_time).slice(0, 5)}` : ""}
                      </p>

                      <p style={completedAlertMeta}>
                        Concluído: {formatDate(item.completed_at)}
                      </p>

                      {item.completion_note && (
                        <div style={completedNoteBox}>
                          <strong>Comentário:</strong>
                          <p style={completedNoteText}>{item.completion_note}</p>
                        </div>
                      )}
                    </div>

                    <div style={statusBadgeRow}>
                      <span style={statusDoneBadge}>CRM: Concluído</span>
                      <span style={item.google_calendar_created ? calendarYesBadge : calendarNoBadge}>
                        Google Calendar: {item.google_calendar_created ? "Sim" : "Não"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
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

        <section style={portfolioPanel}>
          <div>
            <h2 style={panelTitle}>
              📊 Indicador Global da Carteira
            </h2>

            <p style={panelSubtitle}>
              Visão rápida da dimensão atual da carteira ativa.
            </p>
          </div>

          <div style={portfolioGrid}>
            <PortfolioMetric title="Clientes efetivos" value={activeClients} />
            <PortfolioMetric title="Apólices ativas" value={activePolicies} />
            <PortfolioMetric title="Prémio anual" value={formatEuro(portfolioAnnualPremium)} />
            <PortfolioMetric
              title="Comissão anual"
              value={formatEuro(portfolioAnnualCommission)}
              subvalue={`Estimativa mensal: ${formatEuro(portfolioMonthlyCommissionEstimate)}`}
            />
          </div>
        </section>

        <section style={productionPanel}>
          <div>
            <h2 style={panelTitle}>
              📈 Produção do Mês
            </h2>

            <p style={panelSubtitle}>
              Produção registada em {currentMonthLabel}.
            </p>
          </div>

          <div style={productionGrid}>
            <ProductionMetric title="Novas apólices" value={monthlyPolicies} />
            <ProductionMetric title="Prémio produzido" value={formatEuro(monthlyPremium)} />
            <ProductionMetric title="Comissão prevista" value={formatEuro(monthlyCommission)} />
          </div>

          <div style={productionFooter}>
            <Link href="/apolices" style={productionButton}>
              Ver Produção
            </Link>
          </div>
        </section>

        <section style={grid}>
          <Card
            title="Clientes efetivos"
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

function AlertRow({ item, onComplete, onCalendar, important = false }) {
  return (
    <div style={important ? personalAlertItemImportant : personalAlertItem}>
      <div>
        <strong>{item.title}</strong>

        <p style={personalAlertMeta}>
          {formatDate(item.alert_date)}
          {item.alert_time ? ` · ${String(item.alert_time).slice(0, 5)}` : ""}
        </p>

        {item.notes && (
          <p style={personalAlertNotes}>
            {item.notes}
          </p>
        )}

        <div style={statusBadgeRow}>
          <span style={statusPendingBadge}>CRM: Pendente</span>
          <span style={item.google_calendar_created ? calendarYesBadge : calendarNoBadge}>
            Google Calendar: {item.google_calendar_created ? "Sim" : "Não"}
          </span>
        </div>
      </div>

      <div style={personalAlertActions}>
        <button
          type="button"
          style={smallPurpleButton}
          onClick={() => onComplete(item)}
        >
          ✓ Concluído
        </button>

        <button
          type="button"
          style={smallDarkButton}
          onClick={() => onCalendar(item)}
        >
          📅 Google Calendar
        </button>
      </div>
    </div>
  );
}

function PortfolioMetric({ title, value, subvalue }) {
  return (
    <div style={portfolioMetric}>
      <span style={portfolioMetricLabel}>{title}</span>
      <strong style={portfolioMetricValue}>{value}</strong>

      {subvalue && (
        <span style={portfolioMetricSubvalue}>
          {subvalue}
        </span>
      )}
    </div>
  );
}

function ProductionMetric({ title, value }) {
  return (
    <div style={productionMetric}>
      <span style={productionMetricLabel}>{title}</span>
      <strong style={productionMetricValue}>{value}</strong>
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
  gap: 20,
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
  background: "#4c1d95",
  color: "white",
  border: "none",
  borderRadius: 12,
  padding: "14px 20px",
  fontWeight: "bold",
  cursor: "pointer",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(17,24,39,0.65)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const alertModal = {
  width: "min(900px, 96vw)",
  background: "linear-gradient(135deg,#f5f3ff,#ede9fe)",
  border: "2px solid #7c3aed",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 25px 80px rgba(0,0,0,0.35)",
};

const completionAlertModal = {
  width: "min(760px, 96vw)",
  background: "linear-gradient(135deg,#ecfdf5,#dcfce7)",
  border: "2px solid #16a34a",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 25px 80px rgba(0,0,0,0.35)",
};

const completionAlertTitle = {
  margin: 0,
  color: "#166534",
};

const upcomingAlertsModal = {
  width: "min(980px, 96vw)",
  maxHeight: "86vh",
  overflowY: "auto",
  background: "linear-gradient(135deg,#eff6ff,#dbeafe)",
  border: "2px solid #2563eb",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 25px 80px rgba(0,0,0,0.35)",
};

const modalAlertList = {
  display: "grid",
  gap: 12,
  marginTop: 18,
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 20,
};

const grayButton = {
  background: "#6b7280",
  color: "white",
  border: "none",
  borderRadius: 10,
  padding: "12px 16px",
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
  gap: 8,
  fontWeight: "bold",
  color: "#374151",
};

const input = {
  border: "1px solid #c4b5fd",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 15,
  background: "white",
};

const textarea = {
  border: "1px solid #c4b5fd",
  borderRadius: 10,
  padding: 14,
  fontSize: 15,
  minHeight: 130,
  resize: "vertical",
  background: "white",
};

const modalActions = {
  display: "flex",
  gap: 12,
  marginTop: 18,
  flexWrap: "wrap",
};

const purpleButton = {
  background: "#6d28d9",
  color: "white",
  border: "none",
  borderRadius: 10,
  padding: "13px 18px",
  fontWeight: "bold",
  cursor: "pointer",
};

const darkButton = {
  background: "#111827",
  color: "white",
  border: "none",
  borderRadius: 10,
  padding: "13px 18px",
  fontWeight: "bold",
  cursor: "pointer",
};

const personalAlertCard = {
  background: "linear-gradient(135deg,#ddd6fe,#c4b5fd)",
  border: "2px solid #7c3aed",
  borderRadius: 18,
  padding: 24,
  marginBottom: 30,
  color: "#111827",
};

const personalAlertTitle = {
  margin: 0,
  color: "#4c1d95",
};

const personalAlertText = {
  marginTop: 10,
};

const personalAlertList = {
  display: "grid",
  gap: 12,
  marginTop: 18,
};

const personalAlertItem = {
  background: "rgba(255,255,255,0.75)",
  borderRadius: 14,
  padding: 16,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
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
  alignItems: "center",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const smallPurpleButton = {
  background: "#6d28d9",
  color: "white",
  border: "none",
  borderRadius: 10,
  padding: "10px 12px",
  fontWeight: "bold",
  cursor: "pointer",
};

const smallDarkLink = {
  background: "#111827",
  color: "white",
  borderRadius: 10,
  padding: "10px 12px",
  fontWeight: "bold",
  textDecoration: "none",
};

const alertsControlPanel = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 20,
  marginBottom: 24,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const alertsControlTitle = {
  margin: 0,
  color: "#4c1d95",
};

const alertsControlText = {
  margin: "8px 0 0",
  color: "#6b7280",
};

const alertsControlButtons = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const toggleButton = {
  background: "#f3f4f6",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: "bold",
  cursor: "pointer",
};

const activeToggleButton = {
  background: "#4c1d95",
  color: "white",
  border: "1px solid #4c1d95",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: "bold",
  cursor: "pointer",
};

const upcomingAlertCard = {
  background: "linear-gradient(135deg,#dbeafe,#bfdbfe)",
  border: "2px solid #2563eb",
  borderRadius: 18,
  padding: 24,
  marginBottom: 30,
  color: "#111827",
};

const completedAlertCard = {
  background: "linear-gradient(135deg,#e5e7eb,#d1d5db)",
  border: "2px solid #374151",
  borderRadius: 18,
  padding: 24,
  marginBottom: 30,
  color: "#111827",
};

const upcomingAlertTitle = {
  margin: 0,
  color: "#1d4ed8",
};

const completedAlertTitle = {
  margin: 0,
  color: "#111827",
};

const upcomingAlertText = {
  marginTop: 10,
};

const completedAlertText = {
  marginTop: 10,
};

const mutedText = {
  color: "#6b7280",
};

const personalAlertItemImportant = {
  background: "rgba(255,255,255,0.86)",
  border: "2px solid rgba(76,29,149,0.25)",
  borderRadius: 14,
  padding: 16,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
};

const completedAlertItem = {
  background: "rgba(255,255,255,0.72)",
  borderRadius: 14,
  padding: 16,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
};

const completedNoteBox = {
  background: "rgba(255,255,255,0.75)",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: 10,
  marginTop: 10,
};

const completedNoteText = {
  margin: "6px 0 0",
  color: "#111827",
  whiteSpace: "pre-wrap",
};

const completedAlertMeta = {
  margin: "6px 0 0",
  color: "#374151",
};

const statusBadgeRow = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 10,
};

const statusPendingBadge = {
  background: "#ede9fe",
  color: "#4c1d95",
  border: "1px solid #c4b5fd",
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 12,
  fontWeight: "bold",
};

const statusDoneBadge = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #86efac",
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 12,
  fontWeight: "bold",
};

const calendarYesBadge = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #86efac",
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 12,
  fontWeight: "bold",
};

const calendarNoBadge = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fca5a5",
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 12,
  fontWeight: "bold",
};

const smallDarkButton = {
  background: "#111827",
  color: "white",
  border: "none",
  borderRadius: 10,
  padding: "10px 12px",
  fontWeight: "bold",
  cursor: "pointer",
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

const portfolioPanel = {
  background: "linear-gradient(135deg,#ecfeff,#cffafe)",
  border: "2px solid #0891b2",
  borderRadius: 18,
  padding: 24,
  marginBottom: 30,
};

const productionPanel = {
  background: "linear-gradient(135deg,#ecfdf5,#bbf7d0)",
  border: "2px solid #16a34a",
  borderRadius: 18,
  padding: 24,
  marginBottom: 30,
};

const panelTitle = {
  margin: 0,
  color: "#0f172a",
};

const panelSubtitle = {
  marginTop: 8,
  color: "#475569",
};

const portfolioGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 14,
  marginTop: 18,
};

const portfolioMetric = {
  background: "rgba(255,255,255,0.78)",
  borderRadius: 14,
  padding: 18,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const portfolioMetricLabel = {
  display: "block",
  color: "#475569",
  marginBottom: 10,
};

const portfolioMetricValue = {
  fontSize: 28,
  color: "#0e7490",
};

const portfolioMetricSubvalue = {
  display: "block",
  marginTop: 8,
  color: "#64748b",
  fontSize: 14,
  fontWeight: "bold",
};

const productionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
  marginTop: 18,
};

const productionMetric = {
  background: "rgba(255,255,255,0.8)",
  borderRadius: 14,
  padding: 18,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const productionMetricLabel = {
  display: "block",
  color: "#475569",
  marginBottom: 10,
};

const productionMetricValue = {
  fontSize: 28,
  color: "#15803d",
};

const productionFooter = {
  marginTop: 18,
};

const productionButton = {
  display: "inline-block",
  background: "#15803d",
  color: "white",
  textDecoration: "none",
  borderRadius: 10,
  padding: "12px 16px",
  fontWeight: "bold",
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
