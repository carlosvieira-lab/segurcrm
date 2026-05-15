import { createClient } from "@supabase/supabase-js";
import { useState } from "react";

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
  const [saving, setSaving] = useState(false);

  async function createClientRecord(event) {
    event.preventDefault();
    setSaving(true);

    await supabase.from("clients").insert({
      type: "particular",
      status: "ativo",
      name,
      phone,
      email,
    });

    window.location.reload();
  }

  return (
    <main style={{ padding: 40, fontFamily: "Arial", background: "#f3f4f6", minHeight: "100vh" }}>
      <h1>SegurCRM</h1>
      <p>CRM para mediação de seguros.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 30 }}>
        <Card title="Clientes" value={clients.length} />
        <Card title="Apólices" value={policies} />
        <Card title="Tarefas" value={tasks} />
      </div>

      <section style={{ marginTop: 40, background: "white", padding: 24, borderRadius: 12 }}>
        <h2>Novo Cliente</h2>

        <form onSubmit={createClientRecord} style={{ display: "grid", gap: 12, maxWidth: 500 }}>
          <input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
          <input placeholder="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />

          <button disabled={saving} style={buttonStyle}>
            {saving ? "A guardar..." : "Guardar cliente"}
          </button>
        </form>
      </section>

      <section style={{ marginTop: 30, background: "white", padding: 24, borderRadius: 12 }}>
        <h2>Clientes</h2>

        {clients.length === 0 ? (
          <p>Ainda não existem clientes.</p>
        ) : (
          <ul>
            {clients.map((client) => (
              <li key={client.id}>
                <strong>{client.name}</strong> — {client.phone || "sem telefone"} — {client.email || "sem email"}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Card({ title, value }) {
  return (
    <div style={{ background: "white", padding: 20, borderRadius: 12 }}>
      <h2>{title}</h2>
      <p>{value}</p>
    </div>
  );
}

const inputStyle = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid #ccc",
};

const buttonStyle = {
  padding: 12,
  borderRadius: 8,
  border: "none",
  background: "#111827",
  color: "white",
  cursor: "pointer",
};
    


     
     
     
