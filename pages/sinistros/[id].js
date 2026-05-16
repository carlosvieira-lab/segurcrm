import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleString("pt-PT");
}

export async function getServerSideProps(context) {
  const { id } = context.params;

  const { data: claim } = await supabase
    .from("claims")
    .select("*")
    .eq("id", id)
    .single();

  return {
    props: {
      claim: claim || null,
    },
  };
}

export default function ClaimDetail({ claim }) {
  if (!claim) {
    return (
      <div style={page}>
        <h1>Sinistro não encontrado.</h1>
      </div>
    );
  }

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
          <Link href="/sinistros" style={activeLink}>Sinistros</Link>
        </nav>
      </aside>

      <main style={main}>
        <div style={topBar}>
          <div>
            <h1 style={title}>
              Ficha de Sinistro
            </h1>

            <p style={subtitle}>
              Processo individual do sinistro.
            </p>
          </div>

          <Link href="/sinistros" style={backButton}>
            Voltar
          </Link>
        </div>

        <section style={card}>
          <div style={headerRow}>
            <div>
              <h2 style={{ margin: 0 }}>
                {claim.client_name}
              </h2>

              <p style={smallText}>
                {claim.claim_branch} · {claim.insurer_name}
              </p>
            </div>

            <span
              style={{
                ...statusBadge,
                background:
                  claim.status === "ABERTO"
                    ? "#dbeafe"
                    : claim.status === "PENDENTE"
                    ? "#fef3c7"
                    : "#dcfce7",

                color:
                  claim.status === "ABERTO"
                    ? "#1d4ed8"
                    : claim.status === "PENDENTE"
                    ? "#92400e"
                    : "#166534",
              }}
            >
              {claim.status}
            </span>
          </div>

          <div style={infoGrid}>
            <Info label="NIF Cliente" value={claim.client_nif} />
            <Info label="Nº Sinistro" value={claim.claim_number} />
            <Info label="Seguradora" value={claim.insurer_name} />
            <Info label="Ramo" value={claim.claim_branch} />
            <Info
              label="Data Sinistro"
              value={formatDate(claim.claim_date)}
            />
            <Info
              label="Envio à seguradora"
              value={formatDate(claim.submitted_date)}
            />
          </div>

          <div style={procedureBox}>
            <h3>Procedimentos / Histórico</h3>

            <pre style={procedureText}>
              {claim.procedure_notes || "Sem procedimentos."}
            </pre>
          </div>

          <div style={dates}>
            <p>
              <strong>Criado:</strong>{" "}
              {formatDate(claim.created_at)}
            </p>

            <p>
              <strong>Atualizado:</strong>{" "}
              {formatDate(claim.updated_at)}
            </p>

            {claim.closed_at && (
              <p>
                <strong>Encerrado:</strong>{" "}
                {formatDate(claim.closed_at)}
              </p>
            )}
          </div>
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

const topBar = {
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

const backButton = {
  background: "#111827",
  color: "white",
  textDecoration: "none",
  padding: "12px 18px",
  borderRadius: 10,
};

const card = {
  background: "white",
  borderRadius: 20,
  padding: 30,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 24,
};

const smallText = {
  color: "#6b7280",
  marginTop: 8,
};

const statusBadge = {
  padding: "8px 16px",
  borderRadius: 999,
  fontWeight: "bold",
  fontSize: 13,
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 16,
  marginBottom: 30,
};

const infoCard = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
};

const infoLabel = {
  color: "#6b7280",
  marginBottom: 8,
};

const procedureBox = {
  background: "#f9fafb",
  borderRadius: 16,
  padding: 20,
  marginBottom: 30,
};

const procedureText = {
  whiteSpace: "pre-wrap",
  fontFamily: "Arial",
  lineHeight: 1.6,
};

const dates = {
  color: "#6b7280",
  lineHeight: 1.8,
};
