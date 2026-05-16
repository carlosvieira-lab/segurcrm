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

function daysSince(date) {
  if (!date) return null;

  const today = new Date();
  const target = new Date(date);

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.floor((today - target) / (1000 * 60 * 60 * 24));
}

export async function getServerSideProps() {
  const { data: claims } = await supabase
    .from("claims")
    .select(`
      *,
      clients(name, nif, phone, email)
    `)
    .order("created_at", { ascending: false });

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, nif, phone, email");

  return {
    props: {
      claims: claims || [],
      clients: clients || [],
    },
  };
}

export default function Sinistros({ claims, clients }) {
  const [claimDate, setClaimDate] = useState("");
  const [submittedDate, setSubmittedDate] = useState("");
  const [insurerName, setInsurerName] = useState("");
  const [claimNumber, setClaimNumber] = useState("");
  const [claimBranch, setClaimBranch] = useState("automóvel");
  const [clientName, setClientName] = useState("");
  const [clientNif, setClientNif] = useState("");
  const [procedureNotes, setProcedureNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const cleanNif = clientNif.replace(/\s/g, "");

  const matchedClient = clients.find(
    (client) =>
      client.nif &&
      client.nif.replace(/\s/g, "") === cleanNif &&
      cleanNif.length > 0
  );

  const abertos = claims.filter((c) => c.status === "ABERTO");
  const pendentes = claims.filter((c) => c.status === "PENDENTE");
  const encerrados = claims.filter((c) => c.status === "ENCERRADO");
const insurerStats = {};
const branchStats = {};

claims.forEach((claim) => {
  const insurer = claim.insurer_name || "Sem seguradora";
  const branch = claim.claim_branch || "Sem ramo";

  insurerStats[insurer] =
    (insurerStats[insurer] || 0) + 1;

  branchStats[branch] =
    (branchStats[branch] || 0) + 1;
});
  const alertas = claims.filter((claim) => {
    if (claim.status === "ENCERRADO") return false;

    const semEnvio =
      claim.status === "ABERTO" && !claim.submitted_date;

    const pendenteHaMuito =
      claim.status === "PENDENTE" &&
      daysSince(claim.updated_at || claim.created_at) >= 15;

    const semAtualizacao =
      claim.status !== "ENCERRADO" &&
      daysSince(claim.updated_at || claim.created_at) >= 30;

    return semEnvio || pendenteHaMuito || semAtualizacao;
  });

  async function createClaim(e) {
    e.preventDefault();
    setSaving(true);

    const initialProcedure = procedureNotes
      ? `${formatNow()} - ${procedureNotes}`
      : "";

    const { error } = await supabase.from("claims").insert({
      client_id: matchedClient?.id || null,
      claim_date: claimDate || null,
      submitted_date: submittedDate || null,
      insurer_name: insurerName,
      claim_number: claimNumber,
      claim_branch: claimBranch,
      client_name: matchedClient?.name || clientName,
      client_nif: clientNif,
      status: "ABERTO",
      procedure_notes: initialProcedure,
    });

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    window.location.reload();
  }

  async function updateStatus(claim, status) {
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

    await supabase.from("claims").update(updateData).eq("id", claim.id);

    window.location.reload();
  }

  async function addProcedure(claim) {
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
        <header style={header}>
          <div>
            <h1 style={title}>Sinistros</h1>
            <p style={subtitle}>
              Gestão de participações, fases, alertas e procedimentos.
            </p>
          </div>
        </header>

        <section style={stats}>
          <StatCard title="Abertos" value={abertos.length} color="#2563eb" />
          <StatCard title="Pendentes" value={pendentes.length} color="#f59e0b" />
          <StatCard title="Encerrados" value={encerrados.length} color="#16a34a" />
          <StatCard title="Alertas" value={alertas.length} color="#dc2626" />
        </section>

        {alertas.length > 0 && (
          <section style={alertPanel}>
            <h2>Alertas de sinistros</h2>

            <div style={list}>
              {alertas.map((claim) => (
                <div key={claim.id} style={alertItem}>
                  <div>
                    <strong>{claim.client_name}</strong>
                    <p style={smallText}>
                      {claim.claim_branch} · {claim.insurer_name || "-"}
                    </p>
                  </div>

                  <span style={alertTag}>
                    {claim.status === "ABERTO" && !claim.submitted_date
                      ? "SEM ENVIO"
                      : claim.status === "PENDENTE"
                      ? "PENDENTE +15 DIAS"
                      : "SEM ATUALIZAÇÃO"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={grid}>
          <div style={panel}>
            <h2>Novo sinistro</h2>

            <form onSubmit={createClaim} style={form}>
              <label style={label}>NIF do cliente</label>
              <input
                placeholder="NIF"
                value={clientNif}
                onChange={(e) => setClientNif(e.target.value)}
                style={input}
              />

              {cleanNif.length > 0 && (
                <div style={matchedClient ? existingClientBox : newClientBox}>
                  {matchedClient ? (
                    <>
                      <strong>Cliente encontrado no CRM</strong>
                      <p style={boxText}>{matchedClient.name}</p>
                      <p style={boxText}>
                        {matchedClient.phone || "Sem telefone"} ·{" "}
                        {matchedClient.email || "Sem email"}
                      </p>
                    </>
                  ) : (
                    <>
                      <strong>Cliente não encontrado</strong>
                      <p style={boxText}>
                        O sinistro será criado com os dados manuais.
                      </p>
                    </>
                  )}
                </div>
              )}

              <label style={label}>Nome do cliente</label>
              <input
                placeholder="Nome do cliente"
                value={matchedClient?.name || clientName}
                onChange={(e) => setClientName(e.target.value)}
                disabled={!!matchedClient}
                required
                style={input}
              />

              <label style={label}>Data do sinistro</label>
              <input
                type="date"
                value={claimDate}
                onChange={(e) => setClaimDate(e.target.value)}
                style={input}
              />

              <label style={label}>Data de envio à seguradora</label>
              <input
                type="date"
                value={submittedDate}
                onChange={(e) => setSubmittedDate(e.target.value)}
                style={input}
              />

              <input
                placeholder="Seguradora"
                value={insurerName}
                onChange={(e) => setInsurerName(e.target.value)}
                style={input}
              />

              <input
                placeholder="Nº do sinistro"
                value={claimNumber}
                onChange={(e) => setClaimNumber(e.target.value)}
                style={input}
              />

              <select
                value={claimBranch}
                onChange={(e) => setClaimBranch(e.target.value)}
                style={input}
              >
                <option>automóvel</option>
                <option>casa</option>
                <option>MREmpresarial</option>
                <option>ATCO</option>
                <option>ATCP</option>
                <option>vida</option>
                <option>RC</option>
                <option>outros</option>
              </select>

              <textarea
                placeholder="Procedimento inicial"
                value={procedureNotes}
                onChange={(e) => setProcedureNotes(e.target.value)}
                style={textarea}
              />

              <button style={button} disabled={saving}>
                {saving ? "A guardar..." : "Criar sinistro"}
              </button>
            </form>
          </div>

          <div style={panel}>
            <h2>Sinistros ativos</h2>

            {[...abertos, ...pendentes].length === 0 ? (
              <p style={muted}>Não existem sinistros ativos.</p>
            ) : (
              <div style={list}>
                {[...abertos, ...pendentes].map((claim) => (
                  <ClaimCard
                    key={claim.id}
                    claim={claim}
                    onStatus={updateStatus}
                    onProcedure={addProcedure}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section style={panel}>
          <h2>Sinistros encerrados</h2>

          {encerrados.length === 0 ? (
            <p style={muted}>Ainda não existem sinistros encerrados.</p>
          ) : (
            <div style={list}>
              {encerrados.map((claim) => (
                <ClaimCard
                  key={claim.id}
                  claim={claim}
                  onStatus={updateStatus}
                  onProcedure={addProcedure}
                  closed
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ClaimCard({ claim, onStatus, onProcedure, closed = false }) {
  return (
    <div style={claimCard}>
      <div style={claimTop}>
        <div>
          <h3 style={{ margin: 0 }}>
            {claim.client_name || claim.clients?.name || "Sem cliente"}
          </h3>

          <p style={smallText}>
            {claim.claim_branch || "-"} · {claim.insurer_name || "-"}
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

      <Timeline status={claim.status} />

      <p><strong>NIF:</strong> {claim.client_nif || claim.clients?.nif || "-"}</p>
      <p><strong>Nº sinistro:</strong> {claim.claim_number || "-"}</p>
      <p><strong>Data sinistro:</strong> {formatDate(claim.claim_date)}</p>
      <p><strong>Envio à seguradora:</strong> {formatDate(claim.submitted_date)}</p>

      <div style={procedureBox}>
        <strong>Procedimentos</strong>
        <pre style={procedureText}>{claim.procedure_notes || "-"}</pre>
      </div>

      <p style={smallText}>Criado em: {formatDateTime(claim.created_at)}</p>
      <p style={smallText}>Atualizado em: {formatDateTime(claim.updated_at)}</p>

      {claim.client_id && (
        <Link href={`/clientes/${claim.client_id}`} style={clientButton}>
          Abrir cliente
        </Link>
      )}

      <Link href={`/sinistros/${claim.id}`} style={detailButton}>
        Abrir ficha
      </Link>

      {!closed && (
        <div style={buttons}>
          <button
            style={{ ...smallButton, background: "#2563eb" }}
            onClick={() => onStatus(claim, "ABERTO")}
          >
            Aberto
          </button>

          <button
            style={{ ...smallButton, background: "#f59e0b" }}
            onClick={() => onStatus(claim, "PENDENTE")}
          >
            Pendente
          </button>

          <button
            style={{ ...smallButton, background: "#7c3aed" }}
            onClick={() => onProcedure(claim)}
          >
            Adicionar procedimento
          </button>

          <button
            style={{ ...smallButton, background: "#16a34a" }}
            onClick={() => onStatus(claim, "ENCERRADO")}
          >
            Encerrar
          </button>
        </div>
      )}
    </div>
  );
}

function Timeline({ status }) {
  const steps = ["ABERTO", "PENDENTE", "ENCERRADO"];

  return (
    <div style={timeline}>
      {steps.map((step, index) => {
        const active =
          step === status ||
          steps.indexOf(status) > index;

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

function StatCard({ title, value, color }) {
  return (
    <div style={statCard}>
      <p style={cardLabel}>{title}</p>
      <h2 style={{ ...cardValue, color }}>{value}</h2>
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

const logo = { marginBottom: 40 };

const nav = { display: "grid", gap: 12 };

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

const main = { flex: 1, padding: 40 };

const header = { marginBottom: 30 };

const title = { fontSize: 42, margin: 0 };

const subtitle = {
  color: "#6b7280",
  marginTop: 10,
};

const stats = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 16,
  marginBottom: 30,
};

const statCard = {
  background: "white",
  padding: 22,
  borderRadius: 16,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const cardLabel = { color: "#6b7280", margin: 0 };

const cardValue = {
  fontSize: 30,
  margin: "10px 0 0",
};

const alertPanel = {
  background: "white",
  borderRadius: 16,
  padding: 24,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const alertItem = {
  border: "1px solid #fecaca",
  background: "#fff1f2",
  borderRadius: 12,
  padding: 14,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const alertTag = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "6px 12px",
  borderRadius: 999,
  fontWeight: "bold",
  fontSize: 12,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "420px 1fr",
  gap: 24,
  marginBottom: 24,
};

const panel = {
  background: "white",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const form = { display: "grid", gap: 12 };

const label = {
  fontSize: 13,
  color: "#6b7280",
};

const input = {
  padding: 13,
  borderRadius: 10,
  border: "1px solid #d1d5db",
};

const textarea = {
  minHeight: 120,
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

const existingClientBox = {
  background: "#dcfce7",
  color: "#166534",
  padding: 14,
  borderRadius: 12,
};

const newClientBox = {
  background: "#fef3c7",
  color: "#92400e",
  padding: 14,
  borderRadius: 12,
};

const boxText = { margin: "6px 0 0" };

const muted = { color: "#6b7280" };

const list = { display: "grid", gap: 16 };

const claimCard = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 18,
};

const claimTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
};

const smallText = {
  color: "#6b7280",
  margin: "6px 0",
};

const statusBadge = {
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
};

const timeline = {
  display: "flex",
  gap: 14,
  margin: "16px 0",
};

const timelineStep = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const timelineCircle = {
  width: 26,
  height: 26,
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
  padding: 14,
  marginTop: 16,
  marginBottom: 16,
};

const procedureText = {
  whiteSpace: "pre-wrap",
  fontFamily: "Arial",
  margin: "10px 0 0",
};

const buttons = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 16,
};

const smallButton = {
  border: "none",
  color: "white",
  padding: "10px 12px",
  borderRadius: 8,
  cursor: "pointer",
};

const clientButton = {
  background: "#0f766e",
  color: "white",
  padding: "10px 14px",
  borderRadius: 8,
  textDecoration: "none",
  display: "inline-block",
  marginTop: 10,
  marginRight: 8,
};

const detailButton = {
  background: "#111827",
  color: "white",
  padding: "10px 14px",
  borderRadius: 8,
  textDecoration: "none",
  display: "inline-block",
  marginTop: 10,
};
              

