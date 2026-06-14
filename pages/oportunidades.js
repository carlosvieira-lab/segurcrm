import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
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

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, nif, phone")
    .order("name", { ascending: true });

  return {
    props: {
      opportunities: opportunities || [],
      clients: clients || [],
    },
  };
}

function cleanText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function onlyNumbers(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-PT").format(new Date(date));
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function toIsoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isValidDateParts(year, month, day) {
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function parseSmartRenewalDate(value) {
  const text = String(value || "").trim();

  if (!text) return "";
  if (isIsoDate(text)) return text;

  const match = text.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?$/);

  if (!match) return "";

  const day = Number(match[1]);
  const month = Number(match[2]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let year = match[3]
    ? Number(match[3].length === 2 ? `20${match[3]}` : match[3])
    : today.getFullYear();

  if (!isValidDateParts(year, month, day)) return "";

  let candidate = new Date(year, month - 1, day);
  candidate.setHours(0, 0, 0, 0);

  if (!match[3] && candidate < today) {
    year += 1;
  }

  return toIsoDate(year, month, day);
}

function formatSmartDateHelp(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("pt-PT").format(new Date(date));
}

function addMonths(dateString, months) {
  if (!dateString) return "";
  const date = new Date(dateString);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split("T")[0];
}

function todayText() {
  return new Date().toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function buildWhatsappLink(phone) {
  const numbers = onlyNumbers(phone);
  if (!numbers) return "";
  if (numbers.startsWith("351")) return `https://wa.me/${numbers}`;
  return `https://wa.me/351${numbers}`;
}

export default function Oportunidades({ opportunities, clients }) {
  const router = useRouter();
  const [clientNif, setClientNif] = useState("");
  const [clientId, setClientId] = useState(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [opportunityText, setOpportunityText] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [renewalDateInput, setRenewalDateInput] = useState("");
  const [contactDate, setContactDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [clientFound, setClientFound] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setContactDate(addMonths(renewalDate, -1));
  }, [renewalDate]);

  function handleRenewalDateInput(value) {
    setRenewalDateInput(value);

    const parsed = parseSmartRenewalDate(value);

    if (parsed) {
      setRenewalDate(parsed);
      return;
    }

    if (!value) {
      setRenewalDate("");
    }
  }

  useEffect(() => {
    async function loadClientFromQuery() {
      const clientId = router.query.cliente;

      if (!clientId) return;

      const localClient = clients.find((client) => client.id === clientId);

      if (localClient) {
        selectClient(localClient);
        return;
      }

      const { data, error } = await supabase
        .from("clients")
        .select("id, name, nif, phone")
        .eq("id", clientId)
        .maybeSingle();

      if (error || !data) return;

      selectClient(data);
    }

    loadClientFromQuery();
  }, [router.query.cliente, clients]);

  useEffect(() => {
    const nifClean = onlyNumbers(clientNif);

    if (nifClean.length < 8) {
      setClientFound(false);
      setClientId(null);
      return;
    }

    const timer = setTimeout(() => {
      const found = findClientLocal({
        nif: clientNif,
        phone: "",
        name: "",
      });

      if (found) {
        selectClient(found);
      } else {
        setClientFound(false);
        setClientId(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [clientNif]);

  function findClientLocal({ nif, phone, name }) {
    const nifClean = onlyNumbers(nif);
    const phoneClean = onlyNumbers(phone);
    const nameClean = cleanText(name);

    return (
      clients.find((client) => nifClean && onlyNumbers(client.nif) === nifClean) ||
      clients.find((client) => phoneClean && onlyNumbers(client.phone) === phoneClean) ||
      clients.find((client) => nameClean && cleanText(client.name) === nameClean) ||
      null
    );
  }

  async function findClient({ nif, phone, name }) {
    const local = findClientLocal({ nif, phone, name });
    if (local) return local;

    const { data, error } = await supabase
      .from("clients")
      .select("id, name, nif, phone");

    if (error || !data) return null;

    const nifClean = onlyNumbers(nif);
    const phoneClean = onlyNumbers(phone);
    const nameClean = cleanText(name);

    return (
      data.find((client) => nifClean && onlyNumbers(client.nif) === nifClean) ||
      data.find((client) => phoneClean && onlyNumbers(client.phone) === phoneClean) ||
      data.find((client) => nameClean && cleanText(client.name) === nameClean) ||
      null
    );
  }

  function selectClient(client) {
    setClientId(client.id);
    setClientName(client.name || "");
    setClientNif(client.nif || "");
    setClientPhone(client.phone || "");
    setClientFound(true);
  }

  async function searchClientByNif() {
    if (!clientNif) return;

    const found = await findClient({
      nif: clientNif,
      phone: clientPhone,
      name: clientName,
    });

    if (found) {
      selectClient(found);
    } else {
      setClientId(null);
      setClientFound(false);
      alert("Cliente não encontrado em carteira. Podes preencher manualmente.");
    }
  }

  async function createOpportunity(e) {
    e.preventDefault();

    if (!clientName) {
      alert("Preenche o nome do cliente.");
      return;
    }

    if (!opportunityText) {
      alert("Preenche a descrição da oportunidade.");
      return;
    }

    if (!renewalDate) {
      alert("Preenche a data de vencimento.");
      return;
    }

    setSaving(true);

    let finalClientId = clientId;
    let finalClientName = clientName;
    let finalClientNif = clientNif;
    let finalClientPhone = clientPhone;

    if (!finalClientId) {
      const found = await findClient({
        nif: clientNif,
        phone: clientPhone,
        name: clientName,
      });

      if (found) {
        finalClientId = found.id;
        finalClientName = found.name || clientName;
        finalClientNif = found.nif || clientNif;
        finalClientPhone = found.phone || clientPhone;
      }
    }

    const procedureText = `${todayText()} - Oportunidade criada: ${opportunityText}`;

    const { error } = await supabase.from("opportunities").insert({
      client_id: finalClientId || null,
      client_nif: finalClientNif || null,
      client_phone: finalClientPhone || null,
      name: finalClientName,
      insurance_type: opportunityText,
      renewal_date: renewalDate,
      contact_date: contactDate || null,
      status: "por contactar",
      procedure_notes: procedureText,
    });

    if (error) {
      setSaving(false);
      alert(error.message);
      return;
    }

    setSaving(false);
    window.location.reload();
  }

  async function editOpportunity(item) {
    const name = prompt("Nome do cliente", item.name || item.clients?.name || "");
    if (name === null) return;

    const client_nif = prompt("NIF", item.client_nif || item.clients?.nif || "");
    if (client_nif === null) return;

    const client_phone = prompt(
      "Contacto telefónico",
      item.client_phone || item.clients?.phone || ""
    );
    if (client_phone === null) return;

    const insurance_type = prompt(
      "Descrição da oportunidade",
      item.insurance_type || ""
    );
    if (insurance_type === null) return;

    const renewal_date_raw = prompt(
      "Data de vencimento (AAAA-MM-DD ou DD-MM)",
      item.renewal_date || ""
    );
    if (renewal_date_raw === null) return;

    const renewal_date =
      parseSmartRenewalDate(renewal_date_raw) || renewal_date_raw;

    const contact_date_raw = prompt(
      "Data para contactar (AAAA-MM-DD ou DD-MM)",
      item.contact_date || addMonths(renewal_date, -1) || ""
    );
    if (contact_date_raw === null) return;

    const contact_date =
      parseSmartRenewalDate(contact_date_raw) || contact_date_raw;

    const status = prompt(
      "Estado (por contactar, contactado, ganho, perdido)",
      item.status || "por contactar"
    );
    if (status === null) return;

    const foundClient = await findClient({
      nif: client_nif,
      phone: client_phone,
      name,
    });

    const { error } = await supabase
      .from("opportunities")
      .update({
        client_id: foundClient?.id || item.client_id || null,
        client_nif: client_nif || foundClient?.nif || null,
        client_phone: client_phone || foundClient?.phone || null,
        name: name || foundClient?.name || "",
        insurance_type,
        renewal_date: renewal_date || null,
        contact_date: contact_date || null,
        status: status || "por contactar",
      })
      .eq("id", item.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function addProcedure(item) {
    const note = prompt("Novo procedimento / cronologia");
    if (!note) return;

    const previous = item.procedure_notes || "";
    const next = previous
      ? `${previous}\n\n${todayText()} - ${note}`
      : `${todayText()} - ${note}`;

    const { error } = await supabase
      .from("opportunities")
      .update({ procedure_notes: next })
      .eq("id", item.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function updateStatus(item, status) {
    const previous = item.procedure_notes || "";

    let nextStatus = status;
    let nextRenewalDate = item.renewal_date;
    let nextContactDate = item.contact_date;

    let line = `${todayText()} - Estado alterado para ${status}`;

    if (status === "perdido") {
      const renewal = new Date(item.renewal_date);
      renewal.setFullYear(renewal.getFullYear() + 1);

      const contact = new Date(item.contact_date || item.renewal_date);
      contact.setFullYear(contact.getFullYear() + 1);

      nextRenewalDate = renewal.toISOString().split("T")[0];
      nextContactDate = contact.toISOString().split("T")[0];
      nextStatus = "por contactar";

      line =
        `${todayText()} - Oportunidade não concretizada. ` +
        `Novo contacto agendado para ${formatDate(nextContactDate)}`;
    }

    const next = previous ? `${previous}\n\n${line}` : line;

    const { error } = await supabase
      .from("opportunities")
      .update({
        status: nextStatus,
        renewal_date: nextRenewalDate,
        contact_date: nextContactDate,
        procedure_notes: next,
      })
      .eq("id", item.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  const searchClean = cleanText(search);
  const searchNumbers = onlyNumbers(search);

  const filtered = opportunities.filter((item) => {
    const text = cleanText(`
      ${item.name || ""}
      ${item.client_nif || ""}
      ${item.client_phone || ""}
      ${item.insurance_type || ""}
      ${item.status || ""}
      ${item.renewal_date || ""}
      ${item.contact_date || ""}
      ${item.procedure_notes || ""}
      ${item.clients?.name || ""}
      ${item.clients?.nif || ""}
      ${item.clients?.phone || ""}
    `);

    const numbers = `
      ${onlyNumbers(item.client_nif)}
      ${onlyNumbers(item.client_phone)}
      ${onlyNumbers(item.clients?.nif)}
      ${onlyNumbers(item.clients?.phone)}
    `;

    return (
      !searchClean ||
      text.includes(searchClean) ||
      (searchNumbers && numbers.includes(searchNumbers))
    );
  });

  const today = new Date().toISOString().split("T")[0];

  const toContact = filtered.filter(
    (item) =>
      item.status !== "ganho" &&
      item.status !== "perdido" &&
      item.contact_date &&
      item.contact_date <= today
  );

  const future = filtered.filter(
    (item) =>
      item.status !== "ganho" &&
      item.status !== "perdido" &&
      item.contact_date &&
      item.contact_date > today
  );

  const won = filtered.filter((item) => item.status === "ganho");
  const lost = filtered.filter((item) => item.status === "perdido");

  return (
    <div style={page}>
      <Sidebar active="oportunidades" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Agenda de Captação</h1>
            <p style={subtitle}>
              Regista oportunidades fora da carteira e agenda contacto 1 mês antes do vencimento.
            </p>
          </div>
        </header>

        <section style={searchCard}>
          <input
            style={searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar oportunidades por cliente, NIF, telefone, estado, oportunidade ou procedimento..."
          />
        </section>

        <section style={formCard}>
          <h2>Nova oportunidade</h2>

          <form style={form} onSubmit={createOpportunity}>
            <label style={label}>NIF do cliente</label>

            <div style={nifRow}>
              <input
                style={input}
                value={clientNif}
                onChange={(e) => setClientNif(e.target.value)}
                placeholder="NIF"
              />

              <button type="button" style={darkButton} onClick={searchClientByNif}>
                Procurar
              </button>
            </div>

            {clientFound && (
              <p style={successText}>Cliente encontrado e dados preenchidos automaticamente.</p>
            )}

            {clientFound && clientId && (
              <div style={linkedClientBox}>
                Cliente importado da ficha: <strong>{clientName}</strong>
              </div>
            )}

            <label style={label}>Nome do cliente</label>
            <input
              style={input}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nome do cliente"
            />

            <label style={label}>Contacto telefónico</label>
            <input
              style={input}
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="Telefone"
            />

            <label style={label}>Oportunidade / seguro a captar</label>
            <textarea
              style={textarea}
              value={opportunityText}
              onChange={(e) => setOpportunityText(e.target.value)}
              placeholder="Ex: Seguro automóvel na companhia X, cliente demonstrou interesse em transferir..."
            />

            <label style={label}>Data de vencimento da apólice na congénere</label>
            <input
              type="text"
              style={input}
              value={renewalDateInput}
              onChange={(e) => handleRenewalDateInput(e.target.value)}
              onBlur={(e) => {
                const parsed = parseSmartRenewalDate(e.target.value);

                if (parsed) {
                  setRenewalDateInput(formatSmartDateHelp(parsed));
                  setRenewalDate(parsed);
                }
              }}
              placeholder="Ex: 20-04, 20/08 ou 2026-08-20"
            />

            {renewalDate && (
              <div style={dateHelpBox}>
                <strong>✓ Vencimento interpretado:</strong>{" "}
                {formatSmartDateHelp(renewalDate)}
                <br />
                <strong>✓ Contacto automático:</strong>{" "}
                {formatSmartDateHelp(contactDate)}
              </div>
            )}

            {renewalDateInput && !renewalDate && (
              <div style={dateWarningBox}>
                ⚠ Não consegui interpretar a data. Usa formato 20-04, 20/04 ou 2026-08-20.
              </div>
            )}

            <label style={label}>Data automática para contacto</label>
            <input style={inputDisabled} value={contactDate || ""} readOnly />

            <div style={separationNotice}>
              Esta oportunidade fica apenas em Oportunidades. Não cria tarefas automaticamente.
            </div>

            <button style={button} disabled={saving}>
              {saving ? "A guardar..." : "Guardar oportunidade"}
            </button>
          </form>
        </section>

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

function OpportunityGrid({ items, editOpportunity, addProcedure, updateStatus }) {
  if (items.length === 0) {
    return <p style={muted}>Sem registos.</p>;
  }

  return (
    <div style={grid}>
      {items.map((item) => {
        const phone = item.client_phone || item.clients?.phone || "";
        const whatsappLink = buildWhatsappLink(phone);

        const today = new Date().toISOString().split("T")[0];
        const isToday = item.contact_date === today;

        return (
          <div
            key={item.id}
            style={{
              ...opportunityCard,
              ...(isToday ? opportunityTodayCard : {}),
            }}
          >
            <div style={topLine}>
              <h3>{item.name || item.clients?.name || "Sem nome"}</h3>
              <span style={statusBadge}>{item.status || "por contactar"}</span>
            </div>

            <p><strong>NIF:</strong> {item.client_nif || item.clients?.nif || "-"}</p>
            <p><strong>Telefone:</strong> {phone || "-"}</p>
            <p><strong>Oportunidade:</strong> {item.insurance_type || "-"}</p>
            <p><strong>Vencimento:</strong> {formatDate(item.renewal_date)}</p>
            <p><strong>Contactar em:</strong> {formatDate(item.contact_date)}</p>

            <div style={quickActions}>
              {item.client_id && (
                <Link href={`/clientes/${item.client_id}`} style={clientLink}>
                  Abrir ficha do cliente
                </Link>
              )}

              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  style={whatsappButton}
                >
                  WhatsApp
                </a>
              )}
            </div>

            <div style={procedureBox}>
              <strong>Procedimentos / cronologia</strong>
              <pre style={procedureText}>{item.procedure_notes || "-"}</pre>
            </div>

            <div style={buttonGroup}>
              <button style={{ ...smallButton, background: "#111827" }} onClick={() => editOpportunity(item)}>
                Editar
              </button>

              <button style={{ ...smallButton, background: "#7c3aed" }} onClick={() => addProcedure(item)}>
                + Procedimento
              </button>

              <button style={{ ...smallButton, background: "#2563eb" }} onClick={() => updateStatus(item, "contactado")}>
                Contactado
              </button>

              <button style={{ ...smallButton, background: "#16a34a" }} onClick={() => updateStatus(item, "ganho")}>
                Ganho
              </button>

              <button style={{ ...smallButton, background: "#dc2626" }} onClick={() => updateStatus(item, "perdido")}>
                Perdido
              </button>
            </div>
          </div>
        );
      })}
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

const searchCard = {
  background: "white",
  padding: 18,
  borderRadius: 18,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const searchInput = {
  width: "100%",
  padding: 15,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 16,
};

const formCard = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const form = {
  display: "grid",
  gap: 12,
  maxWidth: 720,
};

const label = {
  fontSize: 13,
  color: "#6b7280",
  fontWeight: "bold",
};

const nifRow = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 10,
};

const input = {
  padding: 13,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 15,
};

const dateHelpBox = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #86efac",
  padding: 12,
  borderRadius: 10,
  fontWeight: "bold",
  lineHeight: 1.6,
};

const dateWarningBox = {
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fdba74",
  padding: 12,
  borderRadius: 10,
  fontWeight: "bold",
};

const inputDisabled = {
  padding: 13,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#f3f4f6",
  fontSize: 15,
};

const textarea = {
  padding: 13,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  minHeight: 100,
  fontSize: 15,
  fontFamily: "Arial, sans-serif",
};

const button = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: 14,
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const darkButton = {
  background: "#111827",
  color: "white",
  border: "none",
  padding: "0 16px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const successText = {
  color: "#166534",
  fontWeight: "bold",
};

const linkedClientBox = {
  background: "#dcfce7",
  color: "#166534",
  padding: 12,
  borderRadius: 10,
  fontWeight: "bold",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 18,
  marginBottom: 24,
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

const opportunityCard = {
  background: "#f9fafb",
  padding: 20,
  borderRadius: 16,
};

const opportunityTodayCard = {
  background: "#dcfce7",
  border: "1px solid #86efac",
};

const topLine = {
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

const quickActions = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 10,
};

const clientLink = {
  background: "#0f766e",
  color: "white",
  padding: "10px 14px",
  borderRadius: 8,
  textDecoration: "none",
  display: "inline-block",
  fontWeight: "bold",
};

const whatsappButton = {
  background: "#16a34a",
  color: "white",
  padding: "10px 14px",
  borderRadius: 8,
  textDecoration: "none",
  display: "inline-block",
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
  fontFamily: "Arial, sans-serif",
  margin: "10px 0 0",
};

const buttonGroup = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 16,
};

const smallButton = {
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

const separationNotice = {
  margin: "4px 0",
  background: "#ecfdf5",
  color: "#166534",
  border: "1px solid #bbf7d0",
  borderRadius: 10,
  padding: 10,
  fontWeight: "bold",
};
