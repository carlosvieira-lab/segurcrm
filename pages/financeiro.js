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
    `);

  const activePolicies = (policies || []).filter((p) => p.status === "ativa");
  const cancelledPolicies = (policies || []).filter((p) => p.status === "anulada");

  const totalPremium = activePolicies.reduce(
    (sum, policy) => sum + Number(policy.annual_premium || 0),
    0
  );

  const insurerTotals = {};

  activePolicies.forEach((policy) => {
    const insurerName = policy.insurers?.name || "Sem seguradora";
    insurerTotals[insurerName] =
      (insurerTotals[insurerName] || 0) + Number(policy.annual_premium || 0);
  });

  const insurerRows = Object.entries(insurerTotals)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  return {
    props: {
      totalPremium,
      activeCount: activePolicies.length,
      cancelledCount: cancelledPolicies.length,
      averagePremium:
        activePolicies.length > 0 ? totalPremium / activePolicies.length : 0,
      insurerRows,
    },
  };
}

export default function Financeiro({
  totalPremium,
  activeCount,
  cancelledCount,
  averagePremium,
  insurerRows,
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
            <h1 style={title}>Dashboard Financeiro</h1>
            <p style={subtitle}>Visão financeira da carteira em vigor.</p>
          </div>
        </header>

        <section style={cards}>
          <Card title="Prémio total em vigor" value={formatEuro(totalPremium)} />
          <Card title="Apólices ativas" value={activeCount} />
          <Card title="Apólices anuladas" value={cancelledCount} />
          <Card title="Prémio médio" value={formatEuro(averagePremium)} />
        </section>

        <section style={panel}>
          <h2>Produção por seguradora</h2>

          {insurerRows.length === 0 ? (
            <p>Sem dados financeiros ainda.</p>
          ) : (
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Seguradora</th>
                  <th style={th}>Prémio em vigor</th>
                </tr>
              </thead>

              <tbody>
                {insurerRows.map((row) => (
                  <tr key={row.name}>
                    <td style={td}>{row.name}</td>
                    <td style={td}>{formatEuro(row.total)}</td>
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

function Card({ title, value }) {
  return (
    <div style={card}>
      <p style={cardLabel}>{title}</p>
      <h2 style={cardValue}>{value}</h2>
    </div>
  );
}

function formatEuro(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

const page = {
  display: "flex",
  minHeight: "100vh",
  background: "#f3f4f6",
  fontFamily: "Arial",
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
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 20,
  marginBottom: 30,
};

const card = {
  background: "white",
  padding: 24,
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
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 20,
};

const th = {
  textAlign: "left",
  padding: 16,
  background: "#f9fafb",
  borderBottom: "1px solid #e5e7eb",
};

const td = {
  padding: 16,
  borderBottom: "1px solid #e5e7eb",
};
