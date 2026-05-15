import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

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
    `)
    .eq("status", "ativa");

  return {
    props: {
      policies: policies || [],
    },
  };
}

function daysUntil(date) {
  if (!date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function formatDate(date) {
  if (!date) return "Sem data";

  return new Intl.DateTimeFormat("pt-PT").format(new Date(date));
}

function getPriority(policy) {
  const days = daysUntil(policy.renewal_date);

  if (days === null) return "semData";
  if (days < 0) return "urgentes";
  if (days <= 15) return "urgentes";
  if (days <= 30) return "proximos";
  return "futuras";
}

function getNextPaymentText(policy) {
  if (!policy.renewal_date) return "Sem data";

  const frequency = policy.payment_frequency || "anual";
  const base = new Date(policy.renewal_date);

  if (frequency === "mensal") {
    base.setMonth(base.getMonth() + 1);
  } else if (frequency === "trimestral") {
    base.setMonth(base.getMonth() + 3);
  } else if (frequency === "semestral") {
    base.setMonth(base.getMonth() + 6);
  } else {
    base.setFullYear(base.getFullYear() + 1);
  }

  return formatDate(base);
}

export default function Renovacoes({ policies }) {
  const groups = {
    urgentes: policies.filter((p) => getPriority(p) === "urgentes"),
    proximos: policies.filter((p) => getPriority(p) === "proximos"),
    futuras: policies.filter((p) => getPriority(p) === "futuras"),
    semData: policies.filter((p) => getPriority(p) === "semData"),
  };

  return (
    <div style={page}>
      <aside style={sidebar}>
        <h2 style={logo}>SegurCRM</h2>

        <nav style={nav}>
          <Link href="/" style={link}>Dashboard</Link>
          <Link href="/clientes" style={link}>Clientes</Link>
          <Link href="/apolices" style={link}>Apólices</Link>
          <Link href="/renovacoes" style={activeLink}>Renovações</Link>
          <Link href="/financeiro" style={link}>Financeiro</Link>
        </nav>
      </aside>

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Renovações Inteligentes</h1>
            <p style={subtitle}>
              Prioridades comerciais, renovações e próximas cobranças.
            </p>
          </div>
        </header>

        <section style={summaryGrid}>
          <SummaryCard title="Urgentes" value={groups.urgentes.length} color="#dc2626" />
          <SummaryCard title="Próximos 30 dias" value={groups.proximos.length} color="#f59e0b" />
          <SummaryCard title="Futuras" value={groups.futuras.length} color="#16a34a" />
          <SummaryCard title="Sem data" value={groups.semData.length} color="#6b7280" />
        </section>

        <RenewalSection
          title="🔴 Urgentes"
          description="Vencidas ou a renovar nos próximos 15 dias."
          policies={groups.urgentes}
          badgeColor="#dc2626"
        />

        <RenewalSection
          title="🟠 Próximos 30 dias"
          description="Renovações que exigem acompanhamento este mês."
          policies={groups.proximos}
          badgeColor="#f59e0b"
        />

        <RenewalSection
          title="🟢 Futuras"
          description="Renovações com mais margem de acompanhamento."
          policies={groups.futuras}
          badgeColor="#16a34a"
        />

        <RenewalSection
          title="⚪ Sem data"
          description="Apólices que precisam de completar informação."
          policies={groups.semData}
          badgeColor="#6b7280"
        />
      </main>
    </div>
  );
}

function SummaryCard({ title, value, color }) {
  return (
    <div style={summaryCard}>
      <p style={summaryLabel}>{title}</p>
      <h2 style={{ ...summaryValue, color }}>{value}</h2>
    </div>
  );
}

function RenewalSection({ title, description, policies, badgeColor }) {
  return (
    <section style={section}>
      <div style={sectionHeader}>
        <div>
          <h2 style={sectionTitle}>{title}</h2>
          <p style={sectionDescription}>{description}</p>
        </div>

        <span style={{ ...countBadge, background: badgeColor }}>
          {policies.length}
        </span>
      </div>

      {policies.length === 0 ? (
        <p style={emptyText}>Sem apólices nesta categoria.</p>
      ) : (
        <div style={cardsGrid}>
          {policies.map((policy) => {
            const days = daysUntil(policy.renewal_date);

            return (
              <div key={policy.id} style={policyCard}>
                <div style={policyHeader}>
                  <h3 style={policyTitle}>{policy.branch || "Sem ramo"}</h3>

                  <span style={{ ...statusBadge, background: badgeColor }}>
                    {days === null
                      ? "Sem data"
                      : days < 0
                      ? "Vencida"
                      : `${days} dias`}
                  </span>
                </div>

                <p><strong>Cliente:</strong> {policy.clients?.name || "-"}</p>
                <p><strong>Seguradora:</strong> {policy.insurers?.name || "-"}</p>
                <p><strong>Apólice:</strong> {policy.policy_number || "-"}</p>
                <p><strong>Prémio anual:</strong> {Number(policy.annual_premium || 0).toFixed(2)} €</p>
                <p><strong>Fracionamento:</strong> {policy.payment_frequency || "anual"}</p>
                <p><strong>Renovação:</strong> {formatDate(policy.renewal_date)}</p>
                <p><strong>Próxima cobrança estimada:</strong> {getNextPaymentText(policy)}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
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

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 16,
  marginBottom: 30,
};

const summaryCard = {
  background: "white",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const summaryLabel = {
  margin: 0,
  color: "#6b7280",
};

const summaryValue = {
  margin: "10px 0 0",
  fontSize: 34,
};

const section = {
  background: "white",
  borderRadius: 16,
  padding: 24,
  marginBottom: 24,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
};

const sectionTitle = {
  margin: 0,
  fontSize: 24,
};

const sectionDescription = {
  margin: "8px 0 0",
  color: "#6b7280",
};

const countBadge = {
  color: "white",
  padding: "8px 14px",
  borderRadius: 999,
  fontWeight: "bold",
};

const emptyText = {
  color: "#6b7280",
};

const cardsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
  gap: 16,
};

const policyCard = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 18,
  background: "#ffffff",
};

const policyHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
};

const policyTitle = {
  margin: 0,
};

const statusBadge = {
  color: "white",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
};

Depois:

Commit changes
espera a Vercel ficar Ready
abre /renovacoes
