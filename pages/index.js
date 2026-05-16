import Link from "next/link";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

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
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function formatEuro(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function monthlyValue(policy) {
  const premium = Number(policy.annual_premium || 0);
  const frequency = policy.payment_frequency || "anual";

  if (frequency === "mensal") return premium / 12;
  if (frequency === "trimestral") return premium / 4;
  if (frequency === "semestral") return premium / 2;
  return premium / 12;
}

export async function getServerSideProps() {
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: policies } = await supabase
    .from("policies")
    .select(`
      *,
      clients(name),
      insurers(name)
    `)
    .order("created_at", { ascending: false });

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*");

  const safeClients = clients || [];
  const safePolicies = policies || [];
  const safeTasks = tasks || [];

  const activePolicies = safePolicies.filter((p) => p.status === "ativa");
  const cancelledPolicies = safePolicies.filter((p) => p.status === "anulada");

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
    (sum, policy) => sum + Number(policy.annual_premium || 0),
    0
  );

  const estimatedMonthlyRevenue = activePolicies.reduce(
    (sum, policy) => sum + monthlyValue(policy),
    0
  );

  const normalTasks = safeTasks.filter(
    (t) => t.priority === "NORMAL" && t.status !== "concluida"
  ).length;

  const urgentTasks = safeTasks.filter(
    (t) => t.priority === "URGENTE" && t.status !== "concluida"
  ).length;

  const veryUrgentTasks = safeTasks.filter(
    (t) => t.priority === "MUITO URGENTE" && t.status !== "concluida"
  ).length;

  return {
    props: {
      clients: safeClients,
      activePoliciesCount: activePolicies.length,
      cancelledPoliciesCount: cancelledPolicies.length,
      overdueCount: overdue.length,
      dueTodayCount: dueToday.length,
      next7DaysCount: next7Days.length,
      next30DaysCount: next30Days.length,
      totalPremium,
      estimatedMonthlyRevenue,
      alerts: [...overdue, ...dueToday, ...next7Days].slice(0, 6),
      normalTasks,
      urgentTasks,
      veryUrgentTasks,
    },
  };
}

export default function Home({
  clients,
  activePoliciesCount,
  cancelledPoliciesCount,
  overdueCount,
  dueTodayCount,
  next7DaysCount,
  next30DaysCount,
  totalPremium,
  estimatedMonthlyRevenue,
  alerts,
  normalTasks,
  urgentTasks,
  veryUrgentTasks,
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [nif, setNif] = useState("");
  const [address, setAddress] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [licenseDate, setLicenseDate] = useState("");
  const [iban, setIban] = useState("");
  const [saving, setSaving] = useState(false);

  async function createClientRecord(event) {
    event.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("clients").insert({
      type: "particular",
      status: "ativo",
      name,
      phone,
      email,
      nif,
      address,
      birth_date: birthDate || null,
      driving_license_start_date: licenseDate || null,
      iban,
    });

    if (error) {
      alert("Erro ao guardar cliente: " + error.message);
      setSaving(false);
      return;
    }

    window.location.reload();
  }

  return (
    <div style={page}>
      <aside style={sidebar}>
        <h2 style={logo}>SegurCRM</h2>

        <nav style={nav}>
          <Link href="/" style={activeLink}>Dashboard</Link>
          <Link href="/clientes" style={link}>Clientes</Link>
          <Link href="/apolices" style={link}>Apólices</Link>
          <Link href="/renovacoes" style={link}>Renovações</Link>
          <Link href="/financeiro" style={link}>Financeiro</Link>
          <Link href="/tarefas" style={link}>Tarefas</Link>
        </nav>
      </aside>

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Dashboard Inteligente</h1>
            <p style={subtitle}>
              Visão operacional da carteira, cobranças, tarefas e atividade comercial.
            </p>
          </div>

          <Link href="/tarefas" style={headerButton}>
            Ver tarefas
          </Link>
        </header>

        <section style={alertGrid}>
          <AlertCard title="Vencidas" value={overdueCount} color="#991b1b" />
          <AlertCard title="Hoje" value={dueTodayCount} color="#dc2626" />
          <AlertCard title="7 dias" value={next7DaysCount} color="#f59e0b" />
          <AlertCard title="30 dias" value={next30DaysCount} color="#2563eb" />
        </section>

        <section style={taskGrid}>
          <AlertCard title="Tarefas normais" value={normalTasks} color="#6b7280" />
          <AlertCard title="Tarefas urgentes" value={urgentTasks} color="#f59e0b" />
          <AlertCard title="Muito urgentes" value={veryUrgentTasks} color="#dc2626" />
        </section>

        <section style={cards}>
          <Card title="Clientes" value={clients.length} />
          <Card title="Apólices ativas" value={activePoliciesCount} />
          <Card title="Apólices anuladas" value={cancelledPoliciesCount} />
          <Card title="Prémio em vigor" value={formatEuro(totalPremium)} />
          <Card title="Receita mensal estimada" value={formatEuro(estimatedMonthlyRevenue)} />
        </section>

        <section style={grid}>
          <div style={panel}>
            <h2>Novo Cliente</h2>

            <form onSubmit={createClientRecord} style={form}>
              <input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} required style={input} />
              <input placeholder="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} style={input} />
              <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={input} />
              <input placeholder="NIF" value={nif} onChange={(e) => setNif(e.target.value)} style={input} />
              <input placeholder="Morada" value={address} onChange={(e) => setAddress(e.target.value)} style={input} />
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} style={input} />
              <input type="date" value={licenseDate} onChange={(e) => setLicenseDate(e.target.value)} style={input} />
              <input placeholder="IBAN" value={iban} onChange={(e) => setIban(e.target.value)} style={input} />

              <button disabled={saving} style={button}>
                {saving ? "A guardar..." : "Guardar cliente"}
              </button>
            </form>
          </div>

          <div style={panel}>
            <h2>Alertas rápidos</h2>

            {alerts.length === 0 ? (
              <p style={muted}>Sem cobranças urgentes neste momento.</p>
            ) : (
              <div style={list}>
                {alerts.map((policy) => {
                  const days = daysUntil(policy.next_payment_date);

                  return (
                    <div key={policy.id} style={alertRow}>
                      <div>
                        <strong>{policy.clients?.name || "Cliente"}</strong>
                        <p style={smallText}>
                          {policy.branch || "Sem ramo"} · {policy.insurers?.name || "Sem seguradora"}
                        </p>
                        <p style={smallText}>
                          Próxima cobrança: {policy.next_payment_date || "-"}
                        </p>
                      </div>

                      <span style={badge}>
                        {days < 0 ? "Vencida" : days === 0 ? "Hoje" : `${days} dias`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section style={panel}>
          <h2>Clientes recentes</h2>

          {clients.length === 0 ? (
            <p style={muted}>Ainda não existem clientes.</p>
          ) : (
            <div style={clientList}>
              {clients.slice(0, 8).map((client) => (
                <div key={client.id} style={clientRow}>
                  <div>
                    <Link href={`/clientes/${client.id}`} style={clientLink}>
                      {client.name}
                    </Link>

                    <p style={smallText}>
                      {client.nif || "Sem NIF"} · {client.phone || "Sem telefone"} · {client.email || "Sem email"}
                    </p>
                  </div>

                  <span style={statusBadge}>{client.status || "ativo"}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={card}>
      <p style={cardLabel}>{title}</p>
      <h2 style={cardValue}>{value}</h2>
    </div>
  );
}

function AlertCard({ title, value, color }) {
  return (
    <div style={alertCard}>
      <p style={cardLabel}>{title}</p>
      <h2 style={{ ...cardValue, color }}>{value}</h2>
    </div>
  );
}

const page = {
  display: "flex",
  minHeight: "100vh",
  background: "#f3f4f6",
  fontFamily: "Arial, sans-serif",
};

const sidebar = {
  width: 240,
  background: "#111827",
  color: "white",
  padding: 24,
};

const logo = {
  marginBottom: 40,
};

const nav = {
  display: "grid",
  gap: 12,
};

const link = {
  color: "#cbd5e1",
  textDecoration: "none",
  padding: "12px 14px",
  borderRadius: 10,
};

const activeLink = {
  ...link,
  background: "#2563eb",
  color: "white",
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
  fontSize: 40,
  margin: 0,
};

const subtitle = {
  color: "#6b7280",
  marginTop: 10,
};

const headerButton = {
  background: "#111827",
  color: "white",
  textDecoration: "none",
  padding: "12px 18px",
  borderRadius: 10,
};

const alertGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 16,
  marginBottom: 20,
};

const taskGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 16,
  marginBottom: 20,
};

const cards = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 16,
  marginBottom: 30,
};

const card = {
  background: "white",
  padding: 20,
  borderRadius: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const alertCard = {
  ...card,
  borderLeft: "6px solid #e5e7eb",
};

const cardLabel = {
  color: "#6b7280",
  margin: 0,
};

const cardValue = {
  fontSize: 28,
  margin: "10px 0 0",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "420px 1fr",
  gap: 24,
  marginBottom: 24,
};

const panel = {
  background: "white",
  padding: 24,
  borderRadius: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const form = {
  display: "grid",
  gap: 12,
};

const input = {
  padding: 13,
  borderRadius: 10,
  border: "1px solid #d1d5db",
};

const button = {
  padding: 13,
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const list = {
  display: "grid",
  gap: 12,
};

const alertRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 14,
  border: "1px solid #e5e7eb",
  borderRadius: 12,
};

const badge = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
};

const clientList = {
  display: "grid",
  gap: 12,
};

const clientRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 14,
  border: "1px solid #e5e7eb",
  borderRadius: 12,
};

const clientLink = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: "bold",
};

const smallText = {
  color: "#6b7280",
  margin: "6px 0 0",
};

const muted = {
  color: "#6b7280",
};

const statusBadge = {
  background: "#dcfce7",
  color: "#166534",
  padding: "5px 10px",
  borderRadius: 999,
  fontSize: 12,
};
  
