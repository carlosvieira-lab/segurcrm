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
      clients (
        name
      ),
      insurers (
        name
      )
    `)
    .order("created_at", { ascending: false });

  return {
    props: {
      policies: policies || [],
    },
  };
}

export default function Apolices({ policies }) {
  return (
    <div style={page}>
      <aside style={sidebar}>
        <h2 style={logo}>SegurCRM</h2>

        <nav style={nav}>
          <Link href="/" style={link}>Dashboard</Link>
          <Link href="/clientes" style={link}>Clientes</Link>
          <Link href="/apolices" style={activeLink}>Apólices</Link>
          <a style={link}>Renovações</a>
          <a style={link}>Tarefas</a>
          <a style={link}>Sinistros</a>
        </nav>
      </aside>

      <main style={main}>
        <div style={header}>
          <div>
            <h1 style={title}>Apólices</h1>
            <p style={subtitle}>Gestão das apólices dos clientes.</p>
          </div>

          <button style={button}>+ Nova apólice</button>
        </div>

        <div style={tableCard}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Nº Apólice</th>
                <th style={th}>Cliente</th>
                <th style={th}>Seguradora</th>
                <th style={th}>Ramo</th>
                <th style={th}>Renovação</th>
                <th style={th}>Prémio</th>
                <th style={th}>Estado</th>
              </tr>
            </thead>

            <tbody>
              {policies.map((policy) => (
                <tr key={policy.id}>
                  <td style={td}><strong>{policy.policy_number || "-"}</strong></td>
                  <td style={td}>{policy.clients?.name || "-"}</td>
                  <td style={td}>{policy.insurers?.name || "-"}</td>
                  <td style={td}>{policy.branch || "-"}</td>
                  <td style={td}>{policy.renewal_date || "-"}</td>
                  <td style={td}>{policy.annual_premium || 0} €</td>
                  <td style={td}>
                    <span style={badge}>{policy.status || "ativa"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
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
  fontSize: 34,
  margin: 0,
};

const subtitle = {
  color: "#6b7280",
};

const button = {
  background: "#111827",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
};

const tableCard = {
  background: "white",
  borderRadius: 16,
  overflow: "hidden",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  textAlign: "left",
  padding: 18,
  background: "#f9fafb",
  borderBottom: "1px solid #e5e7eb",
};

const td = {
  padding: 18,
  borderBottom: "1px solid #e5e7eb",
};

const badge = {
  background: "#dcfce7",
  color: "#166534",
  padding: "5px 10px",
  borderRadius: 999,
  fontSize: 12,
};
