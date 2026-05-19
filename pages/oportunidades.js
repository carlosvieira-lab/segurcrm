import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "../components/Sidebar";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function getServerSideProps() {
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("*, clients(id, name, nif, phone)")
    .order("contact_date", { ascending: true });

  return {
    props: {
      opportunities: opportunities || [],
    },
  };
}

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-PT").format(new Date(date));
}

function todayText() {
  return new Date().toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function calculateContactDate(renewalDate) {
  if (!renewalDate) return null;

  const date = new Date(renewalDate);
  date.setMonth(date.getMonth() - 1);

  return date.toISOString().split("T")[0];
}

export default function Oportunidades({ opportunities }) {
  async function createOpportunity() {
    const clientNif = prompt("NIF do cliente, se existir em carteira");

    let client_id = null;
    let clientName = "";
    let clientPhone = "";

    if (clientNif) {
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id, name, nif, phone")
        .eq("nif", clientNif)
        .maybeSingle();

      if (existingClient) {
        client_id = existingClient.id;
        clientName = existingClient.name || "";
        clientPhone = existingClient.phone || "";
      }
    }

    if (!clientName) {
      clientName = prompt("Nome do cliente") || "";
    }

    if (!clientPhone) {
      clientPhone = prompt("Telefone do cliente") || "";
    }

    if (!clientName) return;

    const insuranceType = prompt(
      "Seguro a captar (Casa, Automóvel, Vida, Saúde, etc.)"
    );

    const currentInsurer = prompt("Companhia atual");

    const renewalDate = prompt("Data de vencimento (AAAA-MM-DD)");

    const contactDate = calculateContactDate(renewalDate);

    const notes = prompt("Procedimento inicial / observações");

    const initialProcedure = notes
      ? `${todayText()} - ${notes}`
      : `${todayText()} - Oportunidade criada.`;

    const { error } = await supabase.from("opportunities").insert({
      client_id,
      client_nif: clientNif || null,
      client_phone: clientPhone || null,
      name: clientName,
      insurance_type: insuranceType || null,
      current_insurer: currentInsurer || null,
      renewal_date: renewalDate || null,
      contact_date: contactDate || null,
      status: "por contactar",
      procedure_notes: initialProcedure,
    });

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function addProcedure(opportunity) {
    const note = prompt("Novo procedimento");

    if (!note) return;

    const previous = opportunity.procedure_notes || "";

    const updatedNotes = previous
      ? `${previous}\n\n${todayText()} - ${note}`
      : `${todayText()} - ${note}`;

    const { error } = await supabase
      .from("opportunities")
      .update({
        procedure_notes: updatedNotes,
      })
      .eq("id", opportunity.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function editOpportunity(opportunity) {
    const name = prompt("Nome do cliente", opportunity.name || "");
    if (name === null) return;

    const client_nif = prompt("NIF", opportunity.client_nif || "");
    if (client_nif === null) return;

    const client_phone = prompt("Telefone", opportunity.client_phone || "");
    if (client_phone === null) return;

    const insurance_type = prompt(
      "Seguro a captar",
      opportunity.insurance_type || ""
    );
    if (insurance_type === null) return;

    const current_insurer = prompt(
      "Companhia atual",
      opportunity.current_insurer || ""
    );
    if (current_insurer === null) return;

    const renewal_date = prompt(
      "Data de vencimento (AAAA-MM-DD)",
      opportunity.renewal_date || ""
    );
    if (renewal_date === null) return;

    const contact_date = prompt(
      "Data para contactar (AAAA-MM-DD)",
      opportunity.contact_date || calculateContactDate(renewal_date) || ""
    );
    if (contact_date === null) return;

    const status = prompt(
      "Estado (por contactar, contactado, ganho, perdido)",
      opportunity.status || "por contactar"
    );
    if (status === null) return;

    let client_id = opportunity.client_id || null;

    if (client_nif) {
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("nif", client_nif)
        .maybeSingle();

      if (existingClient) {
        client_id = existingClient.id;
      }
    }

    const { error } = await supabase
      .from("opportunities")
      .update({
        client_id,
        name,
        client_nif: client_nif || null,
        client_phone: client_phone || null,
        insurance_type: insurance_type || null,
        current_insurer: current_insurer || null,
        renewal_date: renewal_date || null,
        contact_date: contact_date || null,
        status: status || "por contactar",
      })
      .eq("id", opportunity.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function updateStatus(id, status) {
    const { error } = await supabase
      .from("opportunities")
      .update({
        status,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  const today = new Date().toISOString().split("T")[0];

  const toContact = opportunities.filter(
    (o) =>
      o.status !== "ganho" &&
      o.status !== "perdido" &&
      o.contact_date &&
      o.contact_date <= today
  );

  const future = opportunities.filter(
    (o) =>
      o.status !== "ganho" &&
      o.status !== "perdido" &&
      o.contact_date &&
      o.contact_date > today
  );

  const won = opportunities.filter((o) => o.status === "ganho");
  const lost = opportunities.filter((o) => o.status === "perdido");

  return (
    <div style={page}>
      <Sidebar active="oportunidades" />

      <main style={main}>
        <div style={header}>
          <div>
            <h1 style={title}>Agenda de Captação</h1>

            <p style={subtitle}>
              Seguros a captar, vencimentos noutras companhias e contactos
              programados.
            </p>
          </div>

          <button style={button} onClick={createOpportunity}>
            + Nova captação
          </button>
        </div>

        <section style={statsGrid}>
          <StatCard title="A contactar" value={toContact.length} color="#dc2626" />
          <StatCard title="Futuras" value={future.length} color="#2563eb" />
          <StatCard title="Ganhas" value={won.length} color="#16a34a" />
          <StatCard title="Perdidas" value={lost.length} color="#6b7280" />
        </section>

        <Section title="A contactar agora">
          <OpportunityGrid
            items={toContact}
            editOpportunity={editOpportunity}
            addProcedure={addProcedure}
            updateStatus={updateStatus}
          />
        </Section>

        <Section title="Contactos futuros">
          <OpportunityGrid
            items={future}
            editOpportunity={editOpportunity}
            addProcedure={addProcedure}
            updateStatus={updateStatus}
          />
        </Section>

        <Section title="Ganhas">
          <OpportunityGrid
            items={won}
            editOpportunity={editOpportunity}
            addProcedure={addProcedure}
            updateStatus={updateStatus}
          />
        </Section>

        <Section title="Perdidas">
          <OpportunityGrid
            items={lost}
            editOpportunity={editOpportunity}
            addProcedure={addProcedure}
            updateStatus={updateStatus}
          />
        </Section>
      </main>
    </div>
  );
}

function OpportunityGrid({
  items,
  editOpportunity,
  addProcedure,
  updateStatus,
}) {
  if (items.length === 0) {
    return <p style={muted}>Sem registos.</p>;
  }

  return (
    <div style={grid}>
      {items.map((item) => (
        <div key={item.id} style={card}>
          <div style={cardTop}>
            <h3>{item.name || "-"}</h3>

            <span style={statusBadge}>{item.status || "por contactar"}</span>
          </div>

          <p>
            <strong>NIF:</strong> {item.client_nif || item.clients?.nif || "-"}
          </p>

          <p>
            <strong>Telefone:</strong>{" "}
            {item.client_phone || item.clients?.phone || "-"}
          </p>

          <p>
            <strong>Seguro a captar:</strong> {item.insurance_type || "-"}
          </p>

          <p>
            <strong>Companhia atual:</strong> {item.current_insurer || "-"}
          </p>

          <p>
            <strong>Vencimento:</strong> {formatDate(item.renewal_date)}
          </p>

          <p>
            <strong>Contactar em:</strong> {formatDate(item.contact_date)}
          </p>

          {item.client_id && (
            <Link href={`/clientes/${item.client_id}`} style={clientLink}>
              Abrir ficha do cliente
            </Link>
          )}

          <div style={procedureBox}>
            <strong>Procedimentos / cronologia</strong>
            <pre style={procedureText}>{item.procedure_notes || "-"}</pre>
          </div>

          <div style={buttonGroup}>
            <button style={smallButton} onClick={() => editOpportunity(item)}>
              Editar
            </button>

            <button
              style={{ ...smallButton, background: "#7c3aed" }}
              onClick={() => addProcedure(item)}
            >
              + Procedimento
            </button>

            <button
              style={{ ...smallButton, background: "#2563eb" }}
              onClick={() => updateStatus(item.id, "contactado")}
            >
              Contactado
            </button>

            <button
              style={{ ...smallButton, background: "#16a34a" }}
              onClick={() => updateStatus(item.id, "ganho")}
            >
              Ganho
            </button>

            <button
              style={{ ...smallButton, background: "#dc2626" }}
              onClick={() => updateStatus(item.id, "perdido")}
            >
              Perdido
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={section}>
      <h2 style={sectionTitle}>{title}</h2>
      {children}
    </section>
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

const button = {
  background: "#111827",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 18,
  marginBottom: 30,
};

const statCard = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const cardLabel = {
  color: "#6b7280",
  margin: 0,
};

const cardValue = {
  fontSize: 32,
  marginTop: 12,
};

const section = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const sectionTitle = {
  marginTop: 0,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
  gap: 18,
};

const card = {
  background: "#f9fafb",
  padding: 20,
  borderRadius: 16,
};

const cardTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
};

const statusBadge = {
  background: "#e5e7eb",
  color: "#111827",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
};

const clientLink = {
  background: "#0f766e",
  color: "white",
  padding: "9px 12px",
  borderRadius: 8,
  textDecoration: "none",
  display: "inline-block",
  marginTop: 8,
  fontWeight: "bold",
};

const procedureBox = {
  background: "white",
  padding: 14,
  borderRadius: 12,
  marginTop: 16,
};

const procedureText = {
  whiteSpace: "pre-wrap",
  fontFamily: "Arial",
  margin: "10px 0 0",
};

const buttonGroup = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 16,
};

const smallButton = {
  background: "#111827",
  color: "white",
  border: "none",
  padding: "9px 12px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const muted = {
  color: "#6b7280",
};
