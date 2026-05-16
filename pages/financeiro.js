import Link from "next/link";
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

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-PT").format(new Date(date));
}

function receiptValue(policy) {
  const premium = Number(policy.annual_premium || 0);
  const frequency = policy.payment_frequency || "anual";

  if (frequency === "mensal") return premium / 12;
  if (frequency === "trimestral") return premium / 4;
  if (frequency === "semestral") return premium / 2;
  return premium;
}

export async function getServerSideProps() {
  const { data: policies } = await supabase
    .from("policies")
    .select(`
      *,
      clients(name),
      insurers(name)
    `)
    .order("next_payment_date", { ascending: true });

  const safePolicies = policies || [];
  const activePolicies = safePolicies.filter((p) => p.status === "ativa");

  const totalAnnualPremium = activePolicies.reduce(
    (sum, p) => sum + Number(p.annual_premium || 0),
    0
  );

  const expectedReceipts = activePolicies.reduce(
    (sum, p) => sum + receiptValue(p),
    0
  );

  const overdue = activePolicies.filter((p) => {
    const days = daysUntil(p.next_payment_date);
    return days !== null && days < 0;
  });

  const dueThisMonth = activePolicies.filter((p) => {
    const days = daysUntil(p.next_payment_date);
    return days !== null && days >= 0 && days <= 30;
  });

  const overdueValue = overdue.reduce((sum, p) => sum + receiptValue(p), 0);
  const monthValue = dueThisMonth.reduce((sum, p) => sum + receiptValue(p), 0);

  const insurerTotals = {};

  activePolicies.forEach((p) => {
    const insurer = p.insurers?.name || "Sem seguradora";

    if (!insurerTotals[insurer]) {
      insurerTotals[insurer] = {
        name: insurer,
        annual: 0,
        receipts: 0,
        policies: 0,
      };
    }

    insurerTotals[insurer].annual += Number(p.annual_premium || 0);
    insurerTotals[insurer].receipts += receiptValue(p);
    insurerTotals[insurer].policies += 1;
  });

  const insurerRows = Object.values(insurerTotals).sort(
    (a, b) => b.annual - a.annual
  );

  return {
    props: {
      policies: activePolicies,
      totalAnnualPremium,
      expectedReceipts,
      overdueCount: overdue.length,
      overdueValue,
      monthCount: dueThisMonth.length,
      monthValue,
      insurerRows,
      overdue,
      dueThisMonth,
    },
  };
}

export default function Financeiro({
  policies,
  totalAnnualPremium,
  expectedReceipts,
  overdueCount,
  overdueValue,
  monthCount,
  monthValue,
  insurerRows,
  overdue,
  dueThisMonth,
}) {
  return (
    <div style={page}>
      <aside style={sidebar}>
        <h2 style={logo}>SegurCRM</h2>

        <nav style={nav}>
          <Link href="/" style={link}>Dashboard</Link>
          <Link href="/clientes" style={link}>Clientes</Link>
          <Link href="/apolices" style={link}>Apólices</Link>
          <Link href="/renovacoes" style={link}>Renovações</Link>
          <Link href="/financeiro" style={activeLink}>Financeiro</Link>
        </nav>
      </aside>

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Financeiro PRO</h1>
            <p style={subtitle}>
              Produção, recibos previstos, cobranças vencidas e carteira ativa.
            </p>
          </div>
        </header>

        <section style={cards}>
          <Card title="Prémio anual em vigor" value={formatEuro(totalAnnualPremium)} />
          <Card title="Receita prevista por ciclo" value={formatEuro(expectedReceipts)} />
          <Card title="Cobranças vencidas" value={overdueCount} />
          <Card title="Valor vencido" value={formatEuro(overdueValue)} />
          <Card title="Cobranças 30 dias" value={monthCount} />
          <Card title="Valor 30 dias" value={formatEuro(monthValue)} />
        </section>

        <section style={panel}>
          <h2>Cobranças vencidas</h2>

          {overdue.length === 0 ? (
            <p style={muted}>Não existem cobranças vencidas.</p>
          ) : (
            <FinancialTable rows={overdue} />
          )}
        </section>

        <section style={panel}>
          <h2>Cobranças dos próximos 30 dias</h2>

          {dueThisMonth.length === 0 ? (
            <p style={muted}>Não existem cobranças previstas nos próximos 30 dias.</p>
          ) : (
            <FinancialTable rows={dueThisMonth} />
          )}
        </section>

        <section style={panel}>
          <h2>Produção por seguradora</h2>

          {insurerRows.length === 0 ? (
            <p style={muted}>Sem dados financeiros ainda.</p>
          ) : (
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Seguradora</th>
                  <th style={th}>Apólices</th>
                  <th style={th}>Prémio anual</th>
                  <th style={th}>Receita por ciclo</th>
                </tr>
              </thead>

              <tbody>
                {insurerRows.map((row) => (
                  <tr key={row.name}>
                    <td style={td}>{row.name}</td>
                    <td style={td}>{row.policies}</td>
                    <td style={td}>{formatEuro(row.annual)}</td>
                    <td style={td}>{formatEuro(row.receipts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}

function FinancialTable({ rows }) {
  return (
    <table style={table}>
      <thead>
        <tr>
          <th style={th}>Cliente</th>
          <th style={th}>Ramo</th>
          <th style={th}>Seguradora</th>
          <th style={th}>Fracionamento</th>
          <th style={th}>Próxima cobrança</th>
          <th style={th}>Valor recibo</th>
        </tr>
      </thead>

      <tbody>
        {rows.map((policy) => (
          <tr key={policy.id}>
            <td style={td}>{policy.clients?.name || "-"}</td>
            <td style={td}>{policy.branch || "-"}</td>
            <td style={td}>{policy.insurers?.name || "-"}</td>
            <td style={td}>{policy.payment_frequency || "anual"}</td>
            <td style={td}>{formatDate(policy.next_payment_date)}</td>
            <td style={td}>{formatEuro(receiptValue(policy))}</td>
          </tr>
        ))}
      </tbody>
    </table>
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

const cards = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 16,
  marginBottom: 30,
};

const card = {
  background: "white",
  padding: 22,
  borderRadius: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const cardLabel = {
  color: "#6b7280",
  margin: 0,
};

const cardValue = {
  fontSize: 28,
  margin: "10px 0 0",
};

const panel = {
  background: "white",
  borderRadius: 16,
  padding: 24,
  marginBottom: 24,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const muted = {
  color: "#6b7280",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 20,
};

const th = {
  textAlign: "left",
  padding: 14,
  background: "#f9fafb",
  borderBottom: "1px solid #e5e7eb",
};

const td = {
  padding: 14,
  borderBottom: "1px solid #e5e7eb",
};
