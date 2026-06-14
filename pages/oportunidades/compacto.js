import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "../../components/Sidebar";

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

function sortByContactDate(a, b) {
  const dateA = a.contact_date || "9999-12-31";
  const dateB = b.contact_date || "9999-12-31";

  if (dateA !== dateB) {
    return dateA.localeCompare(dateB);
  }

  const nameA = String(a.name || a.clients?.name || "");
  const nameB = String(b.name || b.clients?.name || "");

  return nameA.localeCompare(nameB, "pt-PT");
}

function getOpportunityName(item) {
  return item.name || item.clients?.name || "Sem nome";
}

function getOpportunityNif(item) {
  return item.client_nif || item.clients?.nif || "-";
}

function getOpportunityPhone(item) {
  return item.client_phone || item.clients?.phone || "";
}

function getInitials(name) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function contactStatus(item) {
  const today = new Date().toISOString().split("T")[0];

  if (!item.contact_date) {
    return {
      label: "Sem data",
      color: "#64748b",
      background: "#f1f5f9",
    };
  }

  if (item.contact_date < today) {
    return {
      label: "Atrasado",
      color: "#b91c1c",
      background: "#fee2e2",
    };
  }

  if (item.contact_date === today) {
    return {
      label: "Hoje",
      color: "#c2410c",
      background: "#ffedd5",
    };
  }

  return {
    label: "Futura",
    color: "#1d4ed8",
    background: "#dbeafe",
  };
}

export default function OportunidadesCompacto({ opportunities, clients }) {
  const router = useRouter();
  const [clientNif, setClientNif] = useState("");
  const [clientId, setClientId] = useState(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [opportunityText, setOpportunityText] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [contactDate, setContactDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [clientFound, setClientFound] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    setContactDate(addMonths(renewalDate, -1));
  }, [renewalDate]);

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

    const renewal_date = prompt(
      "Data de vencimento (AAAA-MM-DD)",
      item.renewal_date || ""
    );
    if (renewal_date === null) return;

    const contact_date = prompt(
      "Data para contactar (AAAA-MM-DD)",
      item.contact_date || addMonths(renewal_date, -1) || ""
    );
    if (contact_date === null) return;

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

  const toContact = filtered
    .filter(
      (item) =>
        item.status !== "ganho" &&
        item.status !== "perdido" &&
        item.contact_date &&
        item.contact_date <= today
    )
    .sort(sortByContactDate);

  const future = filtered
    .filter(
      (item) =>
        item.status !== "ganho" &&
        item.status !== "perdido" &&
        item.contact_date &&
        item.contact_date > today
    )
    .sort(sortByContactDate);

  const won = filtered
    .filter((item) => item.status === "ganho")
    .sort(sortByContactDate);

  const lost = filtered
    .filter((item) => item.status === "perdido")
    .sort(sortByContactDate);

  const allSorted = [...filtered].sort(sortByContactDate);
  const selectedOpportunity =
    allSorted.find((item) => item.id === selectedId) || null;

  return (
    <div style={page}>
      <Sidebar active="oportunidades-compacto" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Oportunidades 🎯</h1>
            <p style={subtitle}>
              Regista oportunidades fora da carteira e agenda contacto 1 mês antes do vencimento.
            </p>
          </div>

          <button
            type="button"
            style={newOpportunityButton}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            + Nova oportunidade
          </button>
        </header>

        <section style={searchCard}>
          <input
            style={searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por cliente, NIF, telefone, oportunidade ou procedimento..."
          />
        </section>

        <section style={statsGrid}>
          <StatCard title="A contactar" value={toContact.length} color="#dc2626" icon="📅" />
          <StatCard title="Futuras" value={future.length} color="#2563eb" icon="🗓️" />
          <StatCard title="Ganhas" value={won.length} color="#16a34a" icon="🏆" />
          <StatCard title="Perdidas" value={lost.length} color="#f97316" icon="✖" />
          <StatCard title="Total" value={filtered.length} color="#7c3aed" icon="👥" />
        </section>

        <section style={formCard}>
          <h2 style={formTitle}>👥 Nova oportunidade</h2>

          <form style={form} onSubmit={createOpportunity}>
            <div>
              <label style={label}>NIF do cliente</label>
              <div style={nifRow}>
                <input
                  style={input}
                  value={clientNif}
                  onChange={(e) => setClientNif(e.target.value)}
                  placeholder="NIF do cliente"
                />

                <button type="button" style={darkButton} onClick={searchClientByNif}>
                  Procurar
                </button>
              </div>
            </div>

            <div>
              <label style={label}>Nome do cliente</label>
              <input
                style={input}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>

            <div>
              <label style={label}>Contacto telefónico</label>
              <input
                style={input}
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Telefone"
              />
            </div>

            {clientFound && (
              <div style={linkedClientBox}>
                Cliente importado da ficha: <strong>{clientName}</strong>
              </div>
            )}

            <div style={wideField}>
              <label style={label}>Oportunidade / seguro a captar</label>
              <textarea
                style={textarea}
                value={opportunityText}
                onChange={(e) => setOpportunityText(e.target.value)}
                placeholder="Ex: Seguro automóvel na companhia X, cliente demonstrou interesse em transferir..."
              />
            </div>

            <div>
              <label style={label}>Data de vencimento da apólice na congénere</label>
              <input
                type="date"
                style={input}
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
              />
            </div>

            <div>
              <label style={label}>Data automática para contacto</label>
              <input style={inputDisabled} value={contactDate || ""} readOnly />
            </div>

            <div style={wideField}>
              <p style={separationNotice}>
                Esta oportunidade fica apenas em Oportunidades. Não cria tarefas automaticamente.
              </p>
            </div>

            <button style={button} disabled={saving}>
              {saving ? "A guardar..." : "Guardar oportunidade"}
            </button>
          </form>
        </section>

        <section style={urgentSection}>
          <h2 style={urgentTitle}>📞 A contactar agora ({toContact.length})</h2>

          {toContact.length === 0 ? (
            <p style={muted}>Sem contactos urgentes.</p>
          ) : (
            <div style={urgentGrid}>
              {toContact.slice(0, 4).map((item) => (
                <UrgentCard
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onOpen={() => setSelectedId(item.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section style={listSection}>
          <div style={listHeader}>
            <h2 style={sectionTitle}>Oportunidades registadas</h2>
            <span style={orderBadge}>Ordenado por data de contacto ↑</span>
          </div>

          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Cliente</th>
                  <th style={th}>Contacto</th>
                  <th style={th}>Oportunidade</th>
                  <th style={th}>Vencimento</th>
                  <th style={th}>Contactar em</th>
                  <th style={th}>Estado</th>
                  <th style={th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {allSorted.map((item) => (
                  <OpportunityRow
                    key={item.id}
                    item={item}
                    selected={selectedId === item.id}
                    onOpen={() => setSelectedId(item.id)}
                    editOpportunity={editOpportunity}
                    addProcedure={addProcedure}
                    updateStatus={updateStatus}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selectedOpportunity && (
          <OpportunityDetail
            item={selectedOpportunity}
            onClose={() => setSelectedId(null)}
            editOpportunity={editOpportunity}
            addProcedure={addProcedure}
            updateStatus={updateStatus}
          />
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, color, icon }) {
  return (
    <div style={statCard}>
      <div style={{ ...statIcon, color, background: `${color}18` }}>{icon}</div>
      <div>
        <p style={cardLabel}>{title}</p>
        <h2 style={{ ...cardValue, color }}>{value}</h2>
      </div>
    </div>
  );
}

function UrgentCard({ item, selected, onOpen }) {
  const status = contactStatus(item);
  const phone = getOpportunityPhone(item);

  return (
    <button
      type="button"
      style={{
        ...urgentCard,
        ...(selected ? selectedCard : {}),
      }}
      onClick={onOpen}
    >
      <div style={urgentTop}>
        <strong style={urgentName}>{getOpportunityName(item)}</strong>
        <span
          style={{
            ...miniBadge,
            color: status.color,
            background: status.background,
          }}
        >
          {status.label}
        </span>
      </div>

      <div style={urgentMeta}>NIF: {getOpportunityNif(item)}</div>
      <div style={urgentMeta}>☎ {phone || "-"}</div>
      <div style={urgentContact}>
        Contacto em: <strong>{formatDate(item.contact_date)}</strong>
      </div>
    </button>
  );
}

function OpportunityRow({
  item,
  selected,
  onOpen,
  editOpportunity,
  addProcedure,
  updateStatus,
}) {
  const name = getOpportunityName(item);
  const phone = getOpportunityPhone(item);
  const status = contactStatus(item);

  return (
    <tr style={selected ? selectedRow : tr}>
      <td style={td}>
        <div style={clientCell}>
          <span style={avatar}>{getInitials(name)}</span>
          <div>
            <strong>{name}</strong>
            <div style={smallMuted}>NIF: {getOpportunityNif(item)}</div>
          </div>
        </div>
      </td>

      <td style={td}>☎ {phone || "-"}</td>

      <td style={td}>
        <div style={opportunityTextCell}>
          {item.insurance_type || "-"}
        </div>
      </td>

      <td style={td}>{formatDate(item.renewal_date)}</td>

      <td style={td}>
        <div>{formatDate(item.contact_date)}</div>
        <span style={{ ...miniBadge, color: status.color, background: status.background }}>
          {status.label}
        </span>
      </td>

      <td style={td}>
        <span style={statusBadge}>{item.status || "por contactar"}</span>
      </td>

      <td style={td}>
        <div style={rowActions}>
          <button type="button" style={iconButtonGreen} onClick={onOpen} title="Abrir oportunidade">
            👁
          </button>

          <button type="button" style={iconButtonBlue} onClick={() => editOpportunity(item)} title="Editar">
            ✎
          </button>

          <button type="button" style={iconButtonPurple} onClick={() => addProcedure(item)} title="Procedimento">
            +
          </button>
        </div>
      </td>
    </tr>
  );
}

function OpportunityDetail({
  item,
  onClose,
  editOpportunity,
  addProcedure,
  updateStatus,
}) {
  const phone = getOpportunityPhone(item);
  const whatsappLink = buildWhatsappLink(phone);
  const status = contactStatus(item);

  return (
    <aside style={detailPanel}>
      <div style={detailHeader}>
        <div>
          <h2 style={detailTitle}>{getOpportunityName(item)}</h2>
          <span style={{ ...miniBadge, color: status.color, background: status.background }}>
            {status.label}
          </span>
        </div>

        <button type="button" style={closeButton} onClick={onClose}>
          Fechar
        </button>
      </div>

      <div style={detailGrid}>
        <Info label="NIF" value={getOpportunityNif(item)} />
        <Info label="Telefone" value={phone || "-"} />
        <Info label="Vencimento" value={formatDate(item.renewal_date)} />
        <Info label="Contactar em" value={formatDate(item.contact_date)} />
        <Info label="Estado" value={item.status || "por contactar"} />
      </div>

      <div style={detailBlock}>
        <strong>Oportunidade</strong>
        <p>{item.insurance_type || "-"}</p>
      </div>

      <div style={detailButtons}>
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

      <div style={procedureBox}>
        <strong>Procedimentos / cronologia</strong>
        <pre style={procedureText}>{item.procedure_notes || "-"}</pre>
      </div>
    </aside>
  );
}

function Info({ label, value }) {
  return (
    <div style={infoBox}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const page = {
  display: "flex",
  minHeight: "100vh",
  background: "#f1f5f9",
  fontFamily: "Arial, sans-serif",
};

const main = {
  flex: 1,
  padding: 24,
  position: "relative",
};

const header = {
  marginBottom: 14,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 18,
};

const title = {
  fontSize: 34,
  margin: 0,
  color: "#15803d",
  fontWeight: 900,
  lineHeight: 1.05,
};

const subtitle = {
  color: "#475569",
  marginTop: 6,
  fontSize: 15,
};

const newOpportunityButton = {
  background: "#15803d",
  color: "white",
  border: "none",
  borderRadius: 10,
  padding: "12px 16px",
  fontWeight: 800,
  cursor: "pointer",
};

const searchCard = {
  background: "white",
  padding: 12,
  borderRadius: 16,
  marginBottom: 14,
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const searchInput = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  fontSize: 15,
  boxSizing: "border-box",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
  marginBottom: 14,
};

const statCard = {
  background: "white",
  padding: 14,
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const statIcon = {
  width: 46,
  height: 46,
  borderRadius: 12,
  display: "grid",
  placeItems: "center",
  fontSize: 22,
};

const cardLabel = {
  color: "#334155",
  margin: 0,
  fontWeight: 800,
  fontSize: 13,
};

const cardValue = {
  fontSize: 30,
  margin: "4px 0 0",
  lineHeight: 1,
};

const formCard = {
  background: "linear-gradient(135deg, #ffffff, #f0fdf4)",
  padding: 16,
  borderRadius: 18,
  marginBottom: 14,
  border: "1px solid #bbf7d0",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const formTitle = {
  margin: "0 0 12px",
  color: "#15803d",
  fontSize: 20,
};

const form = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 10,
};

const wideField = {
  gridColumn: "span 2",
};

const label = {
  display: "block",
  marginBottom: 5,
  fontSize: 12,
  color: "#166534",
  fontWeight: 800,
};

const nifRow = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 8,
};

const input = {
  padding: 11,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  boxSizing: "border-box",
  width: "100%",
};

const inputDisabled = {
  padding: 11,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#f1f5f9",
  fontSize: 14,
  boxSizing: "border-box",
  width: "100%",
};

const textarea = {
  padding: 11,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  minHeight: 78,
  fontSize: 14,
  fontFamily: "Arial, sans-serif",
  boxSizing: "border-box",
  width: "100%",
};

const button = {
  background: "#15803d",
  color: "white",
  border: "none",
  padding: 12,
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
  alignSelf: "end",
};

const darkButton = {
  background: "#111827",
  color: "white",
  border: "none",
  padding: "0 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const linkedClientBox = {
  background: "#dcfce7",
  color: "#166534",
  padding: 10,
  borderRadius: 10,
  fontWeight: "bold",
  gridColumn: "1 / -1",
};

const urgentSection = {
  background: "linear-gradient(135deg, #fff7ed, #fee2e2)",
  padding: 16,
  borderRadius: 18,
  marginBottom: 14,
  border: "2px solid #fb923c",
  boxShadow: "0 1px 5px rgba(0,0,0,0.08)",
};

const urgentTitle = {
  margin: "0 0 12px",
  color: "#9a3412",
  fontSize: 20,
  fontWeight: 900,
};

const urgentGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
};

const urgentCard = {
  background: "#fff7ed",
  border: "1px solid #fecaca",
  borderRadius: 12,
  padding: 12,
  textAlign: "left",
  cursor: "pointer",
};

const selectedCard = {
  outline: "3px solid #16a34a",
};

const urgentTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "center",
  marginBottom: 6,
};

const urgentName = {
  color: "#111827",
  fontSize: 15,
};

const urgentMeta = {
  color: "#334155",
  fontSize: 13,
  marginBottom: 4,
};

const urgentContact = {
  color: "#991b1b",
  fontSize: 13,
  marginTop: 6,
};

const listSection = {
  background: "white",
  padding: 16,
  borderRadius: 18,
  marginBottom: 18,
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const listHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 10,
};

const sectionTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: 21,
  fontWeight: 900,
};

const orderBadge = {
  background: "#dcfce7",
  color: "#166534",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 800,
};

const tableWrap = {
  overflowX: "auto",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const th = {
  textAlign: "left",
  color: "#475569",
  padding: "10px 8px",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const tr = {
  background: "white",
};

const selectedRow = {
  background: "#f0fdf4",
};

const td = {
  padding: "10px 8px",
  borderBottom: "1px solid #e5e7eb",
  verticalAlign: "middle",
};

const clientCell = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 210,
};

const avatar = {
  minWidth: 36,
  width: 36,
  height: 36,
  borderRadius: 999,
  background: "#dcfce7",
  color: "#15803d",
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
};

const smallMuted = {
  color: "#64748b",
  fontSize: 12,
  marginTop: 3,
};

const opportunityTextCell = {
  maxWidth: 260,
  whiteSpace: "normal",
  lineHeight: 1.25,
};

const miniBadge = {
  display: "inline-block",
  padding: "4px 9px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const statusBadge = {
  background: "#e5e7eb",
  color: "#111827",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
  whiteSpace: "nowrap",
};

const rowActions = {
  display: "flex",
  gap: 6,
  alignItems: "center",
};

const iconButtonGreen = {
  border: "none",
  background: "#dcfce7",
  color: "#166534",
  borderRadius: 999,
  width: 30,
  height: 30,
  cursor: "pointer",
};

const iconButtonBlue = {
  border: "none",
  background: "#dbeafe",
  color: "#1d4ed8",
  borderRadius: 999,
  width: 30,
  height: 30,
  cursor: "pointer",
};

const iconButtonPurple = {
  border: "none",
  background: "#ede9fe",
  color: "#6d28d9",
  borderRadius: 999,
  width: 30,
  height: 30,
  cursor: "pointer",
  fontWeight: 900,
};

const detailPanel = {
  position: "sticky",
  bottom: 0,
  background: "white",
  border: "2px solid #bbf7d0",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 -4px 18px rgba(15, 23, 42, 0.15)",
  zIndex: 5,
};

const detailHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  marginBottom: 14,
};

const detailTitle = {
  margin: "0 0 6px",
  color: "#15803d",
  fontSize: 24,
};

const closeButton = {
  background: "#f1f5f9",
  border: "1px solid #cbd5e1",
  color: "#0f172a",
  borderRadius: 10,
  padding: "9px 12px",
  cursor: "pointer",
  fontWeight: 800,
};

const detailGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
  marginBottom: 12,
};

const infoBox = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 10,
  display: "grid",
  gap: 4,
  color: "#64748b",
  fontSize: 12,
};

const detailBlock = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  marginBottom: 12,
};

const detailButtons = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 12,
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
  background: "#f8fafc",
  padding: 12,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
};

const procedureText = {
  whiteSpace: "pre-wrap",
  fontFamily: "Arial, sans-serif",
  margin: "8px 0 0",
  fontSize: 13,
  lineHeight: 1.3,
  color: "#475569",
};

const smallButton = {
  color: "white",
  border: "none",
  padding: "10px 12px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const muted = {
  color: "#64748b",
};
const separationNotice = {
  margin: 0,
  background: "#ecfdf5",
  color: "#166534",
  border: "1px solid #bbf7d0",
  borderRadius: 10,
  padding: 10,
  fontWeight: "bold",
};
