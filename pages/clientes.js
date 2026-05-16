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

export async function getServerSideProps() {
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  return {
    props: {
      clients: clients || [],
    },
  };
}

export default function Clientes({ clients }) {
  const [search, setSearch] = useState("");

const filteredClients = clients.filter((client) => {
  const term = search.toLowerCase();

  return (
    client.name?.toLowerCase().includes(term) ||
    client.nif?.toLowerCase().includes(term) ||
    client.phone?.toLowerCase().includes(term) ||
    client.email?.toLowerCase().includes(term)
  );
});
  return (
    <div style={page}>
      <aside style={sidebar}>
        <h2 style={logo}>SegurCRM</h2>

        <nav style={nav}>
  <Link href="/" style={link}>Dashboard</Link>
  <Link href="/clientes" style={link}>Clientes</Link>
  <Link href="/apolices" style={link}>Apólices</Link>
  <Link href="/renovacoes" style={link}>Renovações</Link>
  <Link href="/financeiro" style={link}>Financeiro</Link>
  <Link href="/tarefas" style={link}>Tarefas</Link>
  <Link href="/oportunidades" style={link}>Oportunidades</Link>
  <Link href="/sinistros" style={link}>Sinistros</Link>
</nav>
          <Link href="/" style={link}>
            Dashboard
          </Link>

          <Link href="/clientes" style={activeLink}>
            Clientes
          </Link>

          <a style={link}>Apólices</a>
          <a style={link}>Renovações</a>
          <a style={link}>Tarefas</a>
          <a style={link}>Sinistros</a>
        </nav>
      </aside>

      <main style={main}>
        <div style={header}>
          <div>
            <h1 style={title}>Clientes</h1>
            <p style={subtitle}>
              Gestão completa da carteira de clientes.
            </p>
          </div>

          <button style={button}>+ Novo cliente</button>
        </div>
<input
  placeholder="Pesquisar por nome, NIF, telefone ou email..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  style={{
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "1px solid #d1d5db",
    marginBottom: 20,
    fontSize: 16,
  }}
/>
        <div style={tableCard}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Nome</th>
                <th style={th}>Telefone</th>
                <th style={th}>Email</th>
                <th style={th}>Estado</th>
              </tr>
            </thead>

            <tbody>
             {filteredClients.map((client) => (
                <tr key={client.id}>
                 <td style={td}>
  <Link
    href={`/clientes/${client.id}`}
    style={{
      color: "#2563eb",
      textDecoration: "none",
      fontWeight: "bold",
    }}
  >
    {client.name}
  </Link>
</td>

                  <td style={td}>{client.phone || "-"}</td>

                  <td style={td}>{client.email || "-"}</td>

                  <td style={td}>
                    <span style={badge}>
                      {client.status || "ativo"}
                    </span>
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
