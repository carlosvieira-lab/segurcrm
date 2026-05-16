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

function daysUntil(date) {
  if (!date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

export async function getServerSideProps() {
  const { data: opportunities } = await supabase
    .from("external_policies")
    .select(`
      *,
      clients(name, nif)
    `)
    .order("renewal_date", { ascending: true });

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, nif, phone, email");

  const { data: policies } = await supabase
    .from("policies")
    .select("id, client_id, status");

  const safeClients = clients || [];
  const safePolicies = policies || [];

  const clientSummaries = safeClients.map((client) => {
    const activePolicies = safePolicies.filter(
      (p) => p.client_id === client.id && p.status === "ativa"
    ).length;

    const totalPolicies = safePolicies.filter(
      (p) => p.client_id === client.id
    ).length;

    return {
      ...client,
      activePolicies,
      totalPolicies,
    };
  });

  const safeOpportunities = opportunities || [];

  const urgent = safeOpportunities.filter((o) => {
    const days = daysUntil(o.alert_date);
    return days !== null && days <= 30 && o.status === "por contactar";
  });

  return {
    props: {
      opportunities: safeOpportunities,
      urgentCount: urgent.length,
      clients: clientSummaries,
    },
  };
}

export default function Oportunidades({ opportunities, urgentCount, clients }) {
  const [saving, setSaving] = useState(false);

  const [nif, setNif] = useState("");
  const [prospectName, setProspectName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [policyType, setPolicyType] = useState("automóvel");
  const [insurer, setInsurer] = useState("");
  const [premium, setPremium] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [notes, setNotes] = useState("");

  const cleanNif = nif.replace(/\s/g, "");

  const matchedClient = clients.find(
    (client) =>
      client.nif &&
      client.nif.replace(/\s/g, "") === cleanNif &&
      cleanNif.length > 0
  );

  async function createOpportunity(e) {
    e.preventDefault();

    setSaving(true);

    const renewal = new Date(renewalDate);
    const alertDate = new Date(renewal);
    alertDate.setMonth(alertDate.getMonth() - 1);

    const { error } = await supabase.from("external_policies").insert({
      client_id: matchedClient?.id || null,
      prospect_nif: nif,
      prospect_name: matchedClient?.name || prospectName,
      prospect_phone: matchedClient?.phone || phone,
      prospect_email: matchedClient?.email || email,
      policy_type: policyType,
      current_insurer: insurer,
      current_premium: premium || null,
      renewal_date: renewalDate,
      alert_date: alertDate.toISOString().split("T")[0],
      notes,
      status: "por contactar",
    });

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    window.location.reload();
  }

  async function updateStatus(id, status) {
    await supabase
      .from("external_policies")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

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
          <Link href="/oportunidades" style={activeLink}>Oportunidades</Link>
        </nav>
      </aside>

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Oportunidades Comerciais</h1>
            <p style={subtitle}>Captação de apólices fora da mediação.</p>
          </div>

          <div style={urgentBadge}>{urgentCount} para contactar</div>
        </header>

        <section style={grid}>
          <div style={card}>
            <h2>Nova oportunidade</h2>

            <form onSubmit={createOpportunity} style={form}>
              <input
                placeholder="NIF"
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                style={input}
              />

              {cleanNif.length > 0 && (
                <div style={matchedClient ? existingClientBox : newClientBox}>
                  {matchedClient ? (
                    <>
                      <strong>Cliente já existe no CRM</strong>
                      <p style={boxText}>{matchedClient.name}</p>
                      <p style={boxText}>
                        {matchedClient.activePolicies} apólices ativas ·{" "}
                        {matchedClient.totalPolicies} apólices no total
                      </p>
                    </>
                  ) : (
                    <>
                      <strong>Novo potencial cliente</strong>
                      <p style={boxText}>
                        Este NIF ainda não existe no CRM.
                      </p>
                    </>
                  )}
                </div>
              )}

              <input
                placeholder="Nome do prospect / cliente"
                value={matchedClient?.name || prospectName}
                onChange={(e) => setProspectName(e.target.value)}
                disabled={!!matchedClient}
                style={input}
              />

              <input
                placeholder="Telefone"
                value={matchedClient?.phone || phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!!matchedClient}
                style={input}
              />

              <input
                placeholder="Email"
                value={matchedClient?.email || email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!matchedClient}
                style={input}
              />

              <select
                value={policyType}
                onChange={(e) => setPolicyType(e.target.value)}
                style={input}
              >
                <option>automóvel</option>
                <option>casa</option>
                <option>saúde</option>
                <option>vida</option>
                <option>acidentes pessoais</option>
                <option>acidentes de trabalho</option>
                <option>PPR</option>
                <option>financeiros</option>
                <option>viagem</option>
                <option>MREmpresarial</option>
                <option>responsabilidade civil</option>
              </select>

              <input
                placeholder="Seguradora atual"
                value={insurer}
                onChange={(e) => setInsurer(e.target.value)}
                style={input}
              />

              <input
                placeholder="Prémio atual"
                value={premium}
                onChange={(e) => setPremium(e.target.value)}
                style={input}
              />

              <input
                type="date"
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
                required
                style={input}
              />

              <textarea
                placeholder="Notas"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={textarea}
              />

              <button style={button} disabled={saving}>
                {saving ? "A guardar..." : "Guardar oportunidade"}
              </button>
            </form>
          </div>

          <div style={card}>
            <h2>Pipeline comercial</h2>

            {opportunities.length === 0 ? (
              <p style={muted}>Ainda não existem oportunidades.</p>
            ) : (
              <div style={list}>
                {opportunities.map((item) => {
                  const days = daysUntil(item.alert_date);

                  return (
                    <div key={item.id} style={opportunityCard}>
                      <div style={cardTop}>
                        <div>
                          <h3 style={opportunityTitle}>
                            {item.clients?.name ||
                              item.prospect_name ||
                              "Sem nome"}
                          </h3>

                          <p style={small}>{item.policy_type}</p>
                        </div>

                        <span
                          style={{
                            ...statusBadge,
                            background:
                              item.status === "ganho"
                                ? "#dcfce7"
                                : item.status === "perdido"
                                ? "#fee2e2"
                                : "#fef3c7",
                            color:
                              item.status === "ganho"
                                ? "#166534"
                                : item.status === "perdido"
                                ? "#991b1b"
                                : "#92400e",
                          }}
                        >
                          {item.status}
                        </span>
                      </div>

                      <p><strong>NIF:</strong> {item.prospect_nif || item.clients?.nif || "-"}</p>
                      <p><strong>Telefone:</strong> {item.prospect_phone || "-"}</p>
                      <p><strong>Seguradora:</strong> {item.current_insurer || "-"}</p>
                      <p><strong>Prémio:</strong> {item.current_premium || "-"} €</p>
                      <p><strong>Vencimento:</strong> {formatDate(item.renewal_date)}</p>
                      <p><strong>Alerta:</strong> {formatDate(item.alert_date)}</p>
                      <p><strong>Notas:</strong> {item.notes || "-"}</p>

                      {days !== null &&
                        days <= 30 &&
                        item.status === "por contactar" && (
                          <div style={alertBox}>CONTACTAR ESTE CLIENTE</div>
                        )}

                      <div style={buttonRow}>
                        <button
                          style={contactButton}
                          onClick={() => updateStatus(item.id, "contactado")}
                        >
                          Contactado
                        </button>

                        <button
                          style={winButton}
                          onClick={() => updateStatus(item.id, "ganho")}
                        >
                          Ganho
                        </button>

                        <button
                          style={loseButton}
                          onClick={() => updateStatus(item.id, "perdido")}
                        >
                          Perdido
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
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

const urgentBadge = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "12px 18px",
  borderRadius: 999,
  fontWeight: "bold",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "420px 1fr",
  gap: 24,
};

const card = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const form = {
  display: "grid",
  gap: 12,
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

const boxText = {
  margin: "6px 0 0",
};

const list = {
  display: "grid",
  gap: 16,
};

const opportunityCard = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 18,
};

const cardTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const opportunityTitle = {
  margin: 0,
};

const small = {
  color: "#6b7280",
};

const statusBadge = {
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
};

const alertBox = {
  marginTop: 12,
  background: "#fee2e2",
  color: "#991b1b",
  padding: 12,
  borderRadius: 10,
  fontWeight: "bold",
  textAlign: "center",
};

const buttonRow = {
  display: "flex",
  gap: 10,
  marginTop: 14,
};

const contactButton = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
};

const winButton = {
  background: "#16a34a",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
};

const loseButton = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
};

const muted = {
  color: "#6b7280",
};
