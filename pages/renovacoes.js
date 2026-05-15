import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

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
    .order("renewal_date", { ascending: true });

  return {
    props: {
      policies: policies || [],
    },
  };
}

export default function Renovacoes({ policies }) {
  return (
    <div style={page}>
      <aside style={sidebar}>
        <h2 style={logo}>SegurCRM</h2>

        <nav style={nav}>
          <Link href="/" style={link}>Dashboard</Link>
          <Link href="/clientes" style={link}>Clientes</Link>
          <Link href="/apolices" style={link}>Apólices</Link>
          <Link href="/renovacoes" style={activeLink}>Renovações</Link>
          <a style={link}>Tarefas</a>
          <a style={link}>Sinistros</a>
        </nav>
      </aside>

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Renovações</h1>
            <p style={subtitle}>
              Controlo das próximas renovações de apólices.
            </p>
          </div>
        </header>

        <section style={tableCard}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Apólice</th>
                <th style={th}>Cliente</th>
                <th style={th}>Seguradora</th>
                <th style={th}>Renovação</th>
                <th style={th}>Prémio</th>
                <th style={th}>Estado</th>
              </tr>
            </thead>

            <tbody>
              {policies.map((policy) => (
                <tr key={policy.id}>
                  <td style={td}>{policy.policy_number}</td>
                  <td style={td}>
                    {policy.clients?.name || "-"}
                  </td>
                  <td style={td}>
                    {policy.insurers?.name || "-"}
                  </td>
                  <td style={td}>{policy.renewal_date}</td>
                  <td style={td}>
                    {policy.annual_premium} €
                  </td>
                  <td style={td}>
                    <span style={badge}>
                      próxima
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

const page = {
  display: "flex",
  minHeight: "100vh",
  background: "#f3f4f6",
  fontFamily: "Arial",
};

const sidebar = {
  width: "260px",
  background: "#0f172a",
  color: "white",
  padding: "32px 24px",
};

const logo = {
  fontSize: "44px",
  marginBottom: "40px",
};

const nav = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const link = {
  color: "#fff",
  textDecoration: "none",
  padding: "14px 16px",
  borderRadius: "12px",
};

const activeLink = {
  ...link,
  background: "#2563eb",
};

const main = {
  flex: 1,
  padding: "48px",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "32px",
};

const title = {
  fontSize: "56px",
  margin: 0,
};

const subtitle = {
  color: "#555",
  marginTop: "10px",
  fontSize: "28px",
};

const tableCard = {
  background: "white",
  borderRadius: "24px",
  overflow: "hidden",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  textAlign: "left",
  padding: "24px",
  background: "#fff",
  fontSize: "24px",
};

const td = {
  padding: "24px",
  borderTop: "1px solid #eee",
  fontSize: "22px",
};

const badge = {
  background: "#dbeafe",
  color: "#1d4ed8",
  padding: "8px 14px",
  borderRadius: "999px",
  fontSize: "18px",
};
