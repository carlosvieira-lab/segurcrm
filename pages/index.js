import { createClient } from "@supabase/supabase-js";
import { useState } from "react";
import Link from "next/link";
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

  const { count: policies } = await supabase
    .from("policies")
    .select("*", { count: "exact", head: true });

  const { count: tasks } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true });

  return {
    props: {
      clients: clients || [],
      policies: policies || 0,
      tasks: tasks || 0,
    },
  };
}

export default function Home({ clients, policies, tasks }) {
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
birth_date: birthDate,
driving_license_start_date: licenseDate,
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
          <a style={activeLink}>Dashboard</a>
         <Link href="/clientes" style={link}>
  Clientes
</Link>
    <Link href="/apolices" style={link}>
  Apólices
</Link>
  <Link href="/renovacoes" style={link}>
  Renovações
</Link>                
          <a style={link}>Tarefas</a>
          <a style={link}>Sinistros</a>
        </nav>
      </aside>

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Dashboard</h1>
            <p style={subtitle}>Visão geral da carteira de seguros.</p>
          </div>

          <button style={topButton}>+ Novo cliente</button>
        </header>

        <section style={cards}>
          <Card title="Clientes" value={clients.length} />
          <Card title="Apólices" value={policies} />
          <Card title="Tarefas" value={tasks} />
        </section>

        <section style={grid}>
          <div style={panel}>
            <h2>Novo Cliente</h2>

            <form onSubmit={createClientRecord} style={form}>
              <input
                placeholder="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={input}
              />

              <input
                placeholder="Telefone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={input}
              />

              <input
                placeholder="Email"
                  value={email}
  onChange={(e) => setEmail(e.target.value)}
  style={input}
/>
  <input
  placeholder="NIF"
  value={nif}
  onChange={(e) => setNif(e.target.value)}
  style={input}
/>

<input
  placeholder="Morada"
  value={address}
  onChange={(e) => setAddress(e.target.value)}
  style={input}
/>

<input
  type="date"
  placeholder="Data Nascimento"
  value={birthDate}
  onChange={(e) => setBirthDate(e.target.value)}
  style={input}
/>

<input
  type="date"
  placeholder="Início Carta Condução"
  value={licenseDate}
  onChange={(e) => setLicenseDate(e.target.value)}
  style={input}
/>

<input
  placeholder="IBAN"
  value={iban}
  onChange={(e) => setIban(e.target.value)}
  style={input}
/>
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={input}
              />

              <button disabled={saving} style={button}>
                {saving ? "A guardar..." : "Guardar cliente"}
              </button>
            </form>
          </div>

          <div style={panel}>
            <h2>Clientes recentes</h2>

            {clients.length === 0 ? (
              <p>Ainda não existem clientes.</p>
            ) : (
              <div style={clientList}>
                {clients.map((client) => (
                  <div key={client.id} style={clientRow}>
                    <div>
                      <strong>{client.name}</strong>
                      <p style={smallText}>
                        {client.phone || "Sem telefone"} ·{" "}
                        {client.email || "Sem email"}
                      </p>
                    </div>

                    <span style={badge}>{client.status || "ativo"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
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
  cursor: "pointer",
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

const topButton = {
  background: "#111827",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
};

const cards = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
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
  fontSize: 32,
  margin: "10px 0 0",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "420px 1fr",
  gap: 24,
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

const smallText = {
  color: "#6b7280",
  margin: "6px 0 0",
};

const badge = {
  background: "#dcfce7",
  color: "#166534",
  padding: "5px 10px",
  borderRadius: 999,
  fontSize: 12,
};


     
     
     
