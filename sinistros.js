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

function buildInitialClaimForm() {
  return {
    claim_date: "",
    submitted_date: "",
    insurer_name: "",
    claim_number: "",
    claim_branch: "automóvel",
    client_name: "",
    client_nif: "",
    status: "ABERTO",
    procedure_notes: "",
  };
}

function buildClaimForm(claim) {
  if (!claim) return buildInitialClaimForm();

  return {
    claim_date: claim.claim_date || "",
    submitted_date: claim.submitted_date || "",
    insurer_name: claim.insurer_name || "",
    claim_number: claim.claim_number || "",
    claim_branch: claim.claim_branch || "automóvel",
    client_name: claim.client_name || "",
    client_nif: claim.client_nif || "",
    status: claim.status || "ABERTO",
    procedure_notes: claim.procedure_notes || "",
  };
}

export async function getServerSideProps() {
  const { data: claims } = await supabase
    .from("claims")
    .select("*")
    .order("created_at", { ascending: false });

  return {
    props: {
      claims: claims || [],
    },
  };
}

export default function Sinistros({ claims }) {
  const [claimDate, setClaimDate] = useState("");
  const [submittedDate, setSubmittedDate] = useState("");
  const [insurerName, setInsurerName] = useState("");
  const [claimNumber, setClaimNumber] = useState("");
  const [claimBranch, setClaimBranch] = useState("automóvel");
  const [clientName, setClientName] = useState("");
  const [clientNif, setClientNif] = useState("");
  const [procedureNotes, setProcedureNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingClaim, setEditingClaim] = useState(null);
  const [editForm, setEditForm] = useState(buildInitialClaimForm);

  const [procedureClaim, setProcedureClaim] = useState(null);
  const [newProcedureNote, setNewProcedureNote] = useState("");

  const abertos = claims.filter((c) => c.status === "ABERTO");
  const pendentes = claims.filter((c) => c.status === "PENDENTE");
  const encerrados = claims.filter((c) => c.status === "ENCERRADO");

  async function createClaim(e) {
    e.preventDefault();
    setSaving(true);

    const initialProcedure = procedureNotes
      ? `${formatNow()} - ${procedureNotes}`
      : "";

    const { error } = await supabase.from("claims").insert({
      claim_date: claimDate || null,
      submitted_date: submittedDate || null,
      insurer_name: insurerName,
      claim_number: claimNumber,
      claim_branch: claimBranch,
      client_name: clientName,
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

    if (status !== "ENCERRADO") {
      updateData.closed_at = null;
    }

    const { error } = await supabase.from("claims").update(updateData).eq("id", claim.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  function openEditClaim(claim) {
    setEditingClaim(claim);
    setEditForm(buildClaimForm(claim));
  }

  function closeEditClaim() {
    setEditingClaim(null);
    setEditForm(buildInitialClaimForm());
  }

  async function saveEditedClaim(e) {
    e.preventDefault();

    if (!editingClaim) return;

    if (!editForm.client_name.trim()) {
      alert("Preenche o nome do cliente.");
      return;
    }

    setSaving(true);

    const updateData = {
      claim_date: editForm.claim_date || null,
      submitted_date: editForm.submitted_date || null,
      insurer_name: editForm.insurer_name || null,
      claim_number: editForm.claim_number || null,
      claim_branch: editForm.claim_branch || null,
      client_name: editForm.client_name || null,
      client_nif: editForm.client_nif || null,
      status: editForm.status || "ABERTO",
      procedure_notes: editForm.procedure_notes || null,
      updated_at: new Date().toISOString(),
    };

    if (editForm.status === "ENCERRADO" && !editingClaim.closed_at) {
      updateData.closed_at = new Date().toISOString();
    }

    if (editForm.status !== "ENCERRADO") {
      updateData.closed_at = null;
    }

    const { error } = await supabase
      .from("claims")
      .update(updateData)
      .eq("id", editingClaim.id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    closeEditClaim();
    window.location.reload();
  }

  function openProcedureModal(claim) {
    setProcedureClaim(claim);
    setNewProcedureNote("");
  }

  function closeProcedureModal() {
    setProcedureClaim(null);
    setNewProcedureNote("");
  }

  async function saveProcedure(e) {
    e.preventDefault();

    if (!procedureClaim) return;

    if (!newProcedureNote.trim()) {
      alert("Escreve o procedimento.");
      return;
    }

    setSaving(true);

    const previous = procedureClaim.procedure_notes || "";

    const updatedNotes = previous
      ? `${previous}\n\n${formatNow()} - ${newProcedureNote.trim()}`
      : `${formatNow()} - ${newProcedureNote.trim()}`;

    const { error } = await supabase
      .from("claims")
      .update({
        procedure_notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", procedureClaim.id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    closeProcedureModal();
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
        {editingClaim && (
          <div style={modalOverlay}>
            <section style={editModal}>
              <div style={modalHeader}>
                <div>
                  <h2 style={modalTitle}>Editar sinistro</h2>
                  <p style={modalSubtitle}>
                    Atualiza os dados principais, estado e procedimentos do sinistro.
                  </p>
                </div>

                <button type="button" style={grayButton} onClick={closeEditClaim}>
                  Fechar
                </button>
              </div>

              <form onSubmit={saveEditedClaim} style={editFormGrid}>
                <label style={fieldLabel}>
                  Data do sinistro
                  <input
                    type="date"
                    value={editForm.claim_date}
                    onChange={(e) => setEditForm({ ...editForm, claim_date: e.target.value })}
                    style={input}
                  />
                </label>

                <label style={fieldLabel}>
                  Data de envio à seguradora
                  <input
                    type="date"
                    value={editForm.submitted_date}
                    onChange={(e) => setEditForm({ ...editForm, submitted_date: e.target.value })}
                    style={input}
                  />
                </label>

                <label style={fieldLabel}>
                  Seguradora
                  <input
                    value={editForm.insurer_name}
                    onChange={(e) => setEditForm({ ...editForm, insurer_name: e.target.value })}
                    style={input}
                  />
                </label>

                <label style={fieldLabel}>
                  Nº do sinistro
                  <input
                    value={editForm.claim_number}
                    onChange={(e) => setEditForm({ ...editForm, claim_number: e.target.value })}
                    style={input}
                  />
                </label>

                <label style={fieldLabel}>
                  Ramo
                  <select
                    value={editForm.claim_branch}
                    onChange={(e) => setEditForm({ ...editForm, claim_branch: e.target.value })}
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
                </label>

                <label style={fieldLabel}>
                  Estado
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    style={input}
                  >
                    <option value="ABERTO">ABERTO</option>
                    <option value="PENDENTE">PENDENTE</option>
                    <option value="ENCERRADO">ENCERRADO</option>
                  </select>
                </label>

                <label style={fieldLabel}>
                  Nome do cliente
                  <input
                    value={editForm.client_name}
                    onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                    required
                    style={input}
                  />
                </label>

                <label style={fieldLabel}>
                  NIF do cliente
                  <input
                    value={editForm.client_nif}
                    onChange={(e) => setEditForm({ ...editForm, client_nif: e.target.value })}
                    style={input}
                  />
                </label>

                <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
                  Procedimentos
                  <textarea
                    value={editForm.procedure_notes}
                    onChange={(e) => setEditForm({ ...editForm, procedure_notes: e.target.value })}
                    style={largeTextarea}
                  />
                </label>

                <div style={modalActions}>
                  <button type="submit" style={button} disabled={saving}>
                    {saving ? "A guardar..." : "Guardar alterações"}
                  </button>

                  <button type="button" style={grayButton} onClick={closeEditClaim}>
                    Cancelar
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {procedureClaim && (
          <div style={modalOverlay}>
            <section style={procedureModal}>
              <div style={modalHeader}>
                <div>
                  <h2 style={modalTitle}>Novo procedimento</h2>
                  <p style={modalSubtitle}>
                    {procedureClaim.client_name || "Sem cliente"} · {procedureClaim.claim_number || "Sem nº sinistro"}
                  </p>
                </div>

                <button type="button" style={grayButton} onClick={closeProcedureModal}>
                  Fechar
                </button>
              </div>

              <form onSubmit={saveProcedure} style={form}>
                <label style={fieldLabel}>
                  Procedimento
                  <textarea
                    value={newProcedureNote}
                    onChange={(e) => setNewProcedureNote(e.target.value)}
                    placeholder="Ex: Contactei seguradora, enviado orçamento, aguardamos peritagem..."
                    style={procedureTextarea}
                    autoFocus
                  />
                </label>

                <div style={modalActions}>
                  <button type="submit" style={purpleButton} disabled={saving}>
                    {saving ? "A guardar..." : "Guardar procedimento"}
                  </button>

                  <button type="button" style={grayButton} onClick={closeProcedureModal}>
                    Cancelar
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        <header style={header}>
          <div>
            <h1 style={title}>Sinistros</h1>
            <p style={subtitle}>
              Gestão de participações, estados e procedimentos.
            </p>
          </div>
        </header>

        <section style={stats}>
          <StatCard title="Abertos" value={abertos.length} color="#2563eb" />
          <StatCard title="Pendentes" value={pendentes.length} color="#f59e0b" />
          <StatCard title="Encerrados" value={encerrados.length} color="#16a34a" />
        </section>

        <section style={grid}>
          <div style={panel}>
            <h2>Novo sinistro</h2>

            <form onSubmit={createClaim} style={form}>
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

              <input
                placeholder="Nome do cliente"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                style={input}
              />

              <input
                placeholder="NIF do cliente"
                value={clientNif}
                onChange={(e) => setClientNif(e.target.value)}
                style={input}
              />

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
                    onProcedure={openProcedureModal}
                    onEdit={openEditClaim}
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
                  onProcedure={openProcedureModal}
                  onEdit={openEditClaim}
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

function ClaimCard({ claim, onStatus, onProcedure, onEdit, closed = false }) {
  return (
    <div style={claimCard}>
      <div style={claimTop}>
        <div>
          <h3 style={{ margin: 0 }}>
            {claim.client_name || "Sem cliente"}
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

      <p><strong>NIF:</strong> {claim.client_nif || "-"}</p>
      <p><strong>Nº sinistro:</strong> {claim.claim_number || "-"}</p>
      <p><strong>Data sinistro:</strong> {formatDate(claim.claim_date)}</p>
      <p><strong>Envio à seguradora:</strong> {formatDate(claim.submitted_date)}</p>

      <div style={procedureBox}>
        <strong>Procedimentos</strong>
        <pre style={procedureText}>{claim.procedure_notes || "-"}</pre>
      </div>

      <p style={smallText}>Criado em: {formatDate(claim.created_at)}</p>
      <p style={smallText}>Atualizado em: {formatDate(claim.updated_at)}</p>

      {claim.closed_at && (
        <p style={smallText}>Encerrado em: {formatDate(claim.closed_at)}</p>
      )}

      <div style={buttons}>
        <button
          style={{ ...smallButton, background: "#0f172a" }}
          onClick={() => onEdit(claim)}
        >
          ✏️ Editar sinistro
        </button>

        {!closed && (
          <>
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
              📝 Novo procedimento
            </button>

            <button
              style={{ ...smallButton, background: "#16a34a" }}
              onClick={() => onStatus(claim, "ENCERRADO")}
            >
              Encerrar
            </button>
          </>
        )}
      </div>
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
  marginBottom: 24,
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

const muted = {
  color: "#6b7280",
};

const list = {
  display: "grid",
  gap: 16,
};

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

const fieldLabel = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  fontSize: 13,
  color: "#374151",
  fontWeight: "bold",
};

const largeTextarea = {
  minHeight: 260,
  padding: 13,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  resize: "vertical",
};

const procedureTextarea = {
  minHeight: 180,
  padding: 13,
  borderRadius: 10,
  border: "1px solid #c4b5fd",
  resize: "vertical",
};

const purpleButton = {
  padding: 14,
  borderRadius: 10,
  border: "none",
  background: "#7c3aed",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const grayButton = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "none",
  background: "#6b7280",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(17,24,39,0.65)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const editModal = {
  width: "min(980px, 96vw)",
  maxHeight: "88vh",
  overflowY: "auto",
  background: "white",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 25px 80px rgba(0,0,0,0.35)",
};

const procedureModal = {
  width: "min(720px, 96vw)",
  background: "linear-gradient(135deg,#f5f3ff,#ede9fe)",
  border: "2px solid #7c3aed",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 25px 80px rgba(0,0,0,0.35)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 22,
};

const modalTitle = {
  margin: 0,
  color: "#111827",
};

const modalSubtitle = {
  marginTop: 8,
  color: "#6b7280",
};

const editFormGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
};

const modalActions = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 6,
  gridColumn: "1 / -1",
};
