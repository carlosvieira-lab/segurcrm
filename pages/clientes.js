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
  const [name, setName] = useState("");
  const [nif, setNif] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [iban, setIban] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [licenseDate, setLicenseDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function createClientRecord(e) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("clients").insert({
      type: "particular",
      status: "ativo",
      name,
      nif,
      phone,
      email,
      address,
      city,
      iban,
      birth_date: birthDate || null,
      driving_license_start_date: licenseDate || null,
    });

    if (error) {
      alert(error.message);
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
          <Link href="/" style={link}>Dashboard</Link>
          <Link href="/clientes" style={activeLink}>Clientes</Link>
          <Link href="/apolices" style={link}>Apólices</Link>
          <Link href="/renovacoes" style={link}>Renovações</Link>
          <Link href="/financeiro" style={link}>Financeiro</Link>
          <Link href="/tarefas" style={link}>Tarefas</Link>
          <Link href="/oportunidades" style={link}>Oportunidades</Link>
          <Link href="/sinistros" style={link}>Sinistros</Link>
        </nav>
      </aside>

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Clientes</h1>
            <p style={subtitle}>Gestão da carteira de clientes.</p>
          </div>
        </header>

        <section style={stats}>
          <StatCard title="Total de clientes" value={clients.length} />
          <StatCard
            title="Ativos"
            value={clients.filter((c) => c.status === "ativo").length}
          />
          <StatCard
            title="Potenciais"
            value={clients.filter((c) => c.status === "potencial").length}
          />
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
                placeholder="NIF"
                value={nif}
                onChange={(e) => setNif(e.target.value)}
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
                placeholder="Morada"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={input}
              />

              <input
                placeholder="Cidade"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={input}
              />

              <input
                placeholder="IBAN"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                style={input}
              />

              <label style={label}>Data de nascimento</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                style={input}
              />

              <label style={label}>Início da carta de condução</label>
              <input
                type="date"
                value={licenseDate}
                onChange={(e) => setLicenseDate(e.target.value)}
                style={input}
              />

              <button style={button} disabled={saving}>
                {saving ? "A guardar..." : "Guardar cliente"}
              </button>
            </form>
          </div>

          <div style={panel}>
            <h2>Lista de clientes</h2>

            {clients.length === 0 ? (
              <p style={muted}>Ainda não existem clientes.</p>
            ) : (
              <div style={list}>
                {clients.map((client) => (
                  <div key={client.id} style={clientCard}>
                    <div>
                      <Link href={`/clientes/${client.id}`} style={clientName}>
                        {client.name}
                      </Link>

                      <p style={smallText}>
                        {client.nif || "Sem NIF"} ·{" "}
                        {client.phone || "Sem telefone"} ·{" "}
                        {client.email || "Sem email"}
                      </p>

                      <p style={smallText}>
                        {client.city || "Sem cidade"}
                      </p>
                    </div>

                    <span style={statusBadge}>
                      {client.status || "ativo"}
                    </span>
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

function StatCard({ title, value }) {
  return (
    <div style={statCard}>
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
  fontSize: 42,
  margin: 0,
};

const subtitle = {
  color: "#6b7280",
  marginTop: 10,
};

const stats = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 16,
  marginBottom: 30,
};

const statCard = {
  background: "white",
  padding: 22,
  borderRadius: 16,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const cardLabel = {
  color: "#6b7280",
  margin: 0,
};

const cardValue = {
  fontSize: 30,
  margin: "10px 0 0",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "420px 1fr",
  gap: 24,
};

const panel = {
  background: "white",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const form = {
  display: "grid",
  gap: 12,
};

const label = {
  fontSize: 13,
  color: "#6b7280",
};

const input = {
  padding: 13,
  borderRadius: 10,
  border: "1px solid #d1d5db",
};

const button = {
  padding: 14,
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const muted = {
  color: "#6b7280",
};

const list = {
  display: "grid",
  gap: 14,
};

const clientCard = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
};

const clientName = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: 18,
};

const smallText = {
  color: "#6b7280",
  margin: "6px 0",
};

const statusBadge = {
  background: "#dcfce7",
  color: "#166534",
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
};
