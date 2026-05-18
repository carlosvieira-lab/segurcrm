import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "../../components/Sidebar";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function getServerSideProps({ params }) {
  const { id } = params;

  const { data: claim } = await supabase
    .from("claims")
    .select(`
      *,
      clients(id, name, nif, phone, email)
    `)
    .eq("id", id)
    .single();

  return {
    props: {
      claim,
    },
  };
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("pt-PT");
}

function formatDateTime(date) {
  if (!date) return "-";
  return new Date(date).toLocaleString("pt-PT");
}

function formatNow() {
  const now = new Date();

  return (
    now.toLocaleDateString("pt-PT") +
    " " +
    now.toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

export default function SinistroFicha({ claim }) {
  if (!claim) {
    return <div>Sinistro não encontrado.</div>;
  }

  async function updateStatus(status) {
    const previous = claim.procedure_notes || "";

    const action =
      status === "ABERTO"
        ? "Sinistro passou para ABERTO"
        : status === "PENDENTE"
        ? "Sinistro passou para PENDENTE"
        : "Sinistro ENCERRADO";

    const updatedNotes = previous
      ? `${previous}\n\n${formatNow()} - ${action}`
      : `${formatNow()} - ${action}`;

    const updateData = {
      status,
      procedure_notes: updatedNotes,
      updated_at: new Date().toISOString(),
    };

    if (status === "ENCERRADO") {
      updateData.closed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("claims")
      .update(updateData)
      .eq("id", claim.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function addProcedure() {
    const note = prompt("Novo procedimento");

    if (!note) return;

    const previous = claim.procedure_notes || "";

    const updatedNotes = previous
      ? `${previous}\n\n${formatNow()} - ${note}`
      : `${formatNow()} - ${note}`;

    const { error } = await supabase
      .from("claims")
      .update({
        procedure_notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", claim.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  return (
    <div style={page}>
      <Sidebar active="sinistros" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Ficha de Sinistro</h1>

            <p style={subtitle}>
              {claim.client_name || claim.clients?.name || "Sem cliente"} ·{" "}
              {claim.claim_branch || "Sem ramo"} ·{" "}
              {claim.insurer_name || "Sem seguradora"}
            </p>
          </div>

          <Link href="/sinistros" style={backButton}>
            Voltar aos sinistros
          </Link>
        </header>

        <section style={card}>
          <div style={topLine}>
            <h2>Resumo</h2>

            <span
              style={{
                ...statusBadge,
                background:
                  claim.status === "ENCERRADO"
                    ? "#dcfce7"
                    : claim.status === "PENDENTE"
                    ? "#fef3c7"
                    : "#dbeafe",
                color:
                  claim.status === "ENCERRADO"
                    ? "#166534"
                    : claim.status === "PENDENTE"
                    ? "#92400e"
                    : "#1d4ed8",
              }}
            >
              {claim.status || "ABERTO"}
            </span>
          </div>

          <Timeline status={claim.status || "ABERTO"} />

          <div style={infoGrid}>
            <Info label="Nome do cliente" value={claim.client_name || claim.clients?.name} />
            <Info label="NIF" value={claim.client_nif || claim.clients?.nif} />
            <Info label="Telefone" value={claim.clients?.phone} />
            <Info label="Email" value={claim.clients?.email} />
            <Info label="Seguradora" value={claim.insurer_name} />
            <Info label="Nº sinistro" value={claim.claim_number} />
            <Info label="Ramo" value={claim.claim_branch} />
            <Info label="Data do sinistro" value={formatDate(claim.claim_date)} />
            <Info label="Envio à seguradora" value={formatDate(claim.submitted_date)} />
            <Info label="Criado em" value={formatDateTime(claim.created_at)} />
            <Info label="Atualizado em" value={formatDateTime(claim.updated_at)} />
            <Info label="Encerrado em" value={formatDateTime(claim.closed_at)} />
          </div>

          {claim.client_id && (
            <Link href={`/clientes/${claim.client_id}`} style={clientButton}>
              Abrir ficha do cliente
            </Link>
          )}
        </section>

        <section style={card}>
          <h2>Procedimentos</h2>

          <div style={procedureBox}>
            <pre style={procedureText}>{claim.procedure_notes || "-"}</pre>
          </div>

          <div style={buttonGroup}>
            <button
              style={{ ...smallButton, background: "#2563eb" }}
              onClick={() => updateStatus("ABERTO")}
            >
              Aberto
            </button>

            <button
              style={{ ...smallButton, background: "#f59e0b" }}
              onClick={() => updateStatus("PENDENTE")}
            >
              Pendente
            </button>

            <button
              style={{ ...smallButton, background: "#7c3aed" }}
              onClick={addProcedure}
            >
              Adicionar procedimento
            </button>

            <button
              style={{ ...smallButton, background: "#16a34a" }}
              onClick={() => updateStatus("ENCERRADO")}
            >
              Encerrar
            </button>
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

function Timeline({ status }) {
  const steps = ["ABERTO", "PENDENTE", "ENCERRADO"];

  return (
    <div style={timeline}>
      {steps.map((step, index) => {
        const active = step === status || steps.indexOf(status) > index;

        return (
          <div key={step} style={timelineStep}>
            <div
              style={{
                ...timelineCircle,
                background: active ? "#2563eb" : "#e5e7eb",
                color: active ? "white" : "#6b7280",
              }}
            >
              {index + 1}
            </div>

            <span style={timelineLabel}>{step}</span>
          </div>
        );
      })}
    </div>
  );
}

const page = {
  display: "flex",
  minHeight: "100vh",
  background: "#f3f4f6",
  fontFamily: "Arial, sans-serif",
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
  fontSize: 42,
  margin: 0,
};

const subtitle = {
  color: "#6b7280",
  marginTop: 10,
};

const backButton = {
  background: "#111827",
  color: "white",
  padding: "12px 18px",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: "bold",
};

const card = {
  background: "white",
  borderRadius: 18,
  padding: 24,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const topLine = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const statusBadge = {
  padding: "8px 14px",
  borderRadius: 999,
  fontWeight: "bold",
  fontSize: 13,
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 16,
  marginTop: 22,
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

const clientButton = {
  background: "#0f766e",
  color: "white",
  padding: "10px 14px",
  borderRadius: 8,
  textDecoration: "none",
  display: "inline-block",
  marginTop: 20,
};

const timeline = {
  display: "flex",
  gap: 14,
  margin: "20px 0",
};

const timelineStep = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const timelineCircle = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: "bold",
};

const timelineLabel = {
  fontSize: 12,
  fontWeight: "bold",
  color: "#374151",
};

const procedureBox = {
  background: "#f9fafb",
  borderRadius: 12,
  padding: 16,
};

const procedureText = {
  whiteSpace: "pre-wrap",
  fontFamily: "Arial",
  margin: 0,
};

const buttonGroup = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 20,
};

const smallButton = {
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};
