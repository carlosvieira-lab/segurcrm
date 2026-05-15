import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function getServerSideProps({ params }) {
  const { id } = params;

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  const { data: policies } = await supabase
    .from("policies")
    .select(`
      *,
      insurers(name)
    `)
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  return {
    props: {
      client,
      policies: policies || [],
    },
  };
}

export default function ClientePage({ client, policies }) {
  if (!client) {
    return <div>Cliente não encontrado.</div>;
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
        </nav>
      </aside>

      <main style={main}>
        <div style={header}>
          <div>
            <h1 style={title}>{client.name}</h1>

            <p style={subtitle}>
              {client.nif || "Sem NIF"} · {client.phone || "Sem telefone"}
            </p>
          </div>

          <button style={button}>
            + Nova Apólice
          </button>
        </div>

        <section style={card}>
          <h2>Dados do Cliente</h2>

          <div style={infoGrid}>
            <Info label="Nome" value={client.name} />
            <Info label="NIF" value={client.nif} />
            <Info label="Telefone" value={client.phone} />
            <Info label="Email" value={client.email} />
            <Info label="Cidade" value={client.city} />
            <Info label="Estado" value={client.status} />
          </div>
        </section>

        <section style={card}>
          <div style={sectionHeader}>
            <h2>Apólices</h2>
          </div>

          {policies.length === 0 ? (
            <p>Este cliente ainda não tem apólices.</p>
          ) : (
            <div style={policiesGrid}>
              {policies.map((policy) => (
                <div key={policy.id} style={policyCard}>
                  <div style={policyTop}>
                    <h3>{policy.branch}</h3>

                    <span style={badge}>
                      {policy.status}
                    </span>
                  </div>

                  <p>
                    <strong>Apólice:</strong>{" "}
                    {policy.policy_number || "-"}
                  </p>

                  <p>
                    <strong>Seguradora:</strong>{" "}
                    {policy.insurers?.name || "-"}
                  </p>

                  <p>
                    <strong>Prémio:</strong>{" "}
                    {policy.annual_premium || 0} €
                  </p>

                  <p>
                    <strong>Renovação:</strong>{" "}
                    {policy.renewal_date || "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div style={infoCard}>
      <p style={infoLabel}>{label}</p>
      <strong>{value || "-"}</strong>
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

const button = {
  background: "#111827",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
};

const card = {
  background: "white",
  borderRadius: 16,
  padding: 24,
  marginBottom: 24,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 16,
  marginTop: 20,
};

const infoCard = {
  background: "#f9fafb",
  padding: 16,
  borderRadius: 12,
};

const infoLabel = {
  color: "#6b7280",
  marginBottom: 8,
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
};

const policiesGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 20,
};

const policyCard = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 20,
};

const policyTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const badge = {
  background: "#dcfce7",
  color: "#166534",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
};
