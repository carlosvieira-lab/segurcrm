import { useMemo, useState } from "react";
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

const dealTypes = [
  "Crédito Habitação",
  "Crédito Pessoal",
  "Consolidação com CH",
  "Consolidação CP",
  "Multiopções Puro",
  "Abertura de Conta",
  "Outros",
];

const dealStatuses = [
  "LEAD",
  "AGUARDA DOCS",
  "ENV BANCO",
  "RECUSADO",
  "APROVADO",
  "AVALIAÇÃO",
  "AGUARDA CONTR",
  "CONTRATADO",
];

export async function getServerSideProps() {
  const { data: deals } = await supabase
    .from("financial_deals")
    .select(`
      *,
      clients(id, name, nif, phone),
      bank_partner:financial_partners!financial_deals_bank_partner_id_fkey(id, name, partner_type),
      source_partner:financial_partners!financial_deals_source_partner_id_fkey(id, name, partner_type)
    `)
    .order("created_at", { ascending: false });

  const { data: partners } = await supabase
    .from("financial_partners")
    .select("*")
    .order("name", { ascending: true });

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, nif, phone")
    .order("name", { ascending: true });

  return {
    props: {
      deals: deals || [],
      partners: partners || [],
      clients: clients || [],
    },
  };
}

function formatEuro(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-PT").format(new Date(date));
}

function parseDecimal(value) {
  if (value === "" || value === null || value === undefined) return 0;
  if (typeof value === "number") return value;

  const text = String(value)
    .replace(/\s/g, "")
    .replace("€", "")
    .replace("%", "")
    .trim();

  if (!text) return 0;

  if (text.includes(",")) {
    return Number(text.replace(/\./g, "").replace(",", ".")) || 0;
  }

  return Number(text) || 0;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function onlyNumbers(value) {
  return String(value || "").replace(/\D/g, "");
}

function calculateExpectedCommission(amount, rate) {
  return (Number(amount || 0) * Number(rate || 0)) / 100;
}

function calculatePartnerPayment(receivedCommission, paymentType, paymentRate, paymentValue) {
  if (paymentType === "valor fixo") return Number(paymentValue || 0);
  return (Number(receivedCommission || 0) * Number(paymentRate || 0)) / 100;
}

function buildInitialDealForm() {
  return {
    client_id: "",
    client_name: "",
    client_nif: "",
    client_phone: "",
    deal_type: "Crédito Habitação",
    bank_partner_id: "",
    new_bank_partner_name: "",
    source_partner_id: "",
    new_source_partner_name: "",
    amount: "",
    commission_rate: "",
    expected_commission: "",
    received_commission: "",
    commission_received_at: "",
    partner_payment_type: "percentagem",
    partner_payment_rate: "",
    partner_payment_value: "",
    partner_payment_status: "pendente",
    partner_paid_at: "",
    status: "LEAD",
    notes: "",
  };
}

function buildInitialPartnerForm() {
  return {
    name: "",
    partner_type: "Banco",
    phone: "",
    email: "",
    notes: "",
  };
}

export default function NegociosFinanceiros({ deals, partners, clients }) {
  const [showDealForm, setShowDealForm] = useState(false);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [dealForm, setDealForm] = useState(buildInitialDealForm);
  const [partnerForm, setPartnerForm] = useState(buildInitialPartnerForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [paymentFilter, setPaymentFilter] = useState("todos");
  const [saving, setSaving] = useState(false);

  const filteredDeals = deals.filter((deal) => {
    const text = normalizeText(`
      ${deal.client_name || ""}
      ${deal.client_nif || ""}
      ${deal.client_phone || ""}
      ${deal.deal_type || ""}
      ${deal.status || ""}
      ${deal.partner_payment_status || ""}
      ${deal.bank_partner?.name || ""}
      ${deal.source_partner?.name || ""}
      ${deal.notes || ""}
    `);

    const searchText = normalizeText(search);
    const searchNumbers = onlyNumbers(search);
    const dealNumbers = `${onlyNumbers(deal.client_nif)} ${onlyNumbers(deal.client_phone)}`;

    if (searchText && !text.includes(searchText) && !(searchNumbers && dealNumbers.includes(searchNumbers))) return false;
    if (statusFilter !== "todos" && deal.status !== statusFilter) return false;
    if (paymentFilter !== "todos" && deal.partner_payment_status !== paymentFilter) return false;

    return true;
  });

  const totals = useMemo(() => {
    return deals.reduce(
      (acc, deal) => {
        const partnerDue = calculatePartnerPayment(
          deal.received_commission,
          deal.partner_payment_type,
          deal.partner_payment_rate,
          deal.partner_payment_value
        );

        acc.amount += Number(deal.amount || 0);
        acc.expected += Number(deal.expected_commission || 0);
        acc.received += Number(deal.received_commission || 0);
        acc.partnerTotal += partnerDue;

        if (deal.partner_payment_status === "pago") acc.partnerPaid += partnerDue;
        else acc.partnerPending += partnerDue;

        return acc;
      },
      { amount: 0, expected: 0, received: 0, partnerTotal: 0, partnerPaid: 0, partnerPending: 0 }
    );
  }, [deals]);

  const groupedPartnerPayments = useMemo(() => {
    const map = new Map();

    deals.forEach((deal) => {
      const partnerName = deal.source_partner?.name || "Sem parceiro de origem";
      const partnerDue = calculatePartnerPayment(
        deal.received_commission,
        deal.partner_payment_type,
        deal.partner_payment_rate,
        deal.partner_payment_value
      );

      if (!map.has(partnerName)) {
        map.set(partnerName, { partnerName, total: 0, paid: 0, pending: 0, deals: 0 });
      }

      const item = map.get(partnerName);
      item.total += partnerDue;
      item.deals += 1;
      if (deal.partner_payment_status === "pago") item.paid += partnerDue;
      else item.pending += partnerDue;
    });

    return [...map.values()].sort((a, b) => b.pending - a.pending);
  }, [deals]);

  function selectClient(clientId) {
    const client = clients.find((item) => item.id === clientId);

    if (!client) {
      setDealForm({ ...dealForm, client_id: "" });
      return;
    }

    setDealForm({
      ...dealForm,
      client_id: client.id,
      client_name: client.name || "",
      client_nif: client.nif || "",
      client_phone: client.phone || "",
    });
  }

  function updateDealForm(next) {
    const amount = parseDecimal(next.amount);
    const rate = parseDecimal(next.commission_rate);
    const expected = next.expected_commission ? parseDecimal(next.expected_commission) : calculateExpectedCommission(amount, rate);

    setDealForm({ ...next, expected_commission: expected ? String(expected).replace(".", ",") : "" });
  }

  async function createPartner(event) {
    event.preventDefault();
    if (!partnerForm.name.trim()) {
      alert("Preenche o nome do banco ou parceiro.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("financial_partners").insert({
      name: partnerForm.name.trim(),
      partner_type: partnerForm.partner_type,
      phone: partnerForm.phone || null,
      email: partnerForm.email || null,
      notes: partnerForm.notes || null,
      is_active: true,
    });
    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function createPartnerQuick(name, partnerType) {
    const cleanName = String(name || "").trim();

    if (!cleanName) return null;

    const existing = partners.find(
      (partner) => normalizeText(partner.name) === normalizeText(cleanName)
    );

    if (existing) return existing.id;

    const { data, error } = await supabase
      .from("financial_partners")
      .insert({
        name: cleanName,
        partner_type: partnerType,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) {
      alert(error.message);
      return null;
    }

    return data?.id || null;
  }

  async function createDeal(event) {
    event.preventDefault();
    if (!dealForm.client_name.trim()) {
      alert("Preenche o nome do cliente.");
      return;
    }

    const amount = parseDecimal(dealForm.amount);
    const commissionRate = parseDecimal(dealForm.commission_rate);
    const expectedCommission = parseDecimal(dealForm.expected_commission) || calculateExpectedCommission(amount, commissionRate);
    const receivedCommission = parseDecimal(dealForm.received_commission);

    setSaving(true);

    const finalBankPartnerId =
      dealForm.bank_partner_id === "__novo_banco__"
        ? await createPartnerQuick(dealForm.new_bank_partner_name, "Banco")
        : dealForm.bank_partner_id || null;

    const finalSourcePartnerId =
      dealForm.source_partner_id === "__novo_parceiro__"
        ? await createPartnerQuick(dealForm.new_source_partner_name, "Parceiro")
        : dealForm.source_partner_id || null;

    if (dealForm.bank_partner_id === "__novo_banco__" && !finalBankPartnerId) {
      setSaving(false);
      alert("Indica o nome do novo banco/destino.");
      return;
    }

    if (dealForm.source_partner_id === "__novo_parceiro__" && !finalSourcePartnerId) {
      setSaving(false);
      alert("Indica o nome do novo parceiro de origem.");
      return;
    }

    const { error } = await supabase.from("financial_deals").insert({
      client_id: dealForm.client_id || null,
      client_name: dealForm.client_name,
      client_nif: dealForm.client_nif || null,
      client_phone: dealForm.client_phone || null,
      deal_type: dealForm.deal_type,
      bank_partner_id: finalBankPartnerId,
      source_partner_id: finalSourcePartnerId,
      amount,
      commission_rate: commissionRate,
      expected_commission: expectedCommission,
      received_commission: receivedCommission,
      commission_received_at: dealForm.commission_received_at || null,
      partner_payment_type: dealForm.partner_payment_type,
      partner_payment_rate: parseDecimal(dealForm.partner_payment_rate),
      partner_payment_value: parseDecimal(dealForm.partner_payment_value),
      partner_payment_status: dealForm.partner_payment_status,
      partner_paid_at: dealForm.partner_paid_at || null,
      status: dealForm.status,
      notes: dealForm.notes || null,
    });
    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function updateDeal(deal, updates) {
    const { error } = await supabase.from("financial_deals").update(updates).eq("id", deal.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function markPartnerPaid(deal) {
    const ok = window.confirm("Marcar pagamento ao parceiro como pago?");
    if (!ok) return;

    await updateDeal(deal, {
      partner_payment_status: "pago",
      partner_paid_at: new Date().toISOString().split("T")[0],
    });
  }

  async function markPartnerPending(deal) {
    await updateDeal(deal, { partner_payment_status: "pendente", partner_paid_at: null });
  }

  async function markCommissionReceived(deal) {
    const value = prompt("Comissão efetivamente recebida", String(deal.received_commission || deal.expected_commission || "").replace(".", ","));
    if (value === null) return;

    await updateDeal(deal, {
      received_commission: parseDecimal(value),
      commission_received_at: new Date().toISOString().split("T")[0],
    });
  }

  return (
    <div style={page}>
      <Sidebar active="negocios-financeiros" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Negócios Financeiros</h1>
            <p style={subtitle}>
              Crédito habitação, crédito pessoal, consolidação, aberturas de conta, bancos que pagam comissões, parceiros de origem, montantes financiados, percentagens de comissão e pagamentos a parceiros.
            </p>
          </div>

          <div style={headerButtons}>
            <button style={button} onClick={() => setShowDealForm(!showDealForm)}>+ Novo negócio</button>
            <button style={secondaryButton} onClick={() => setShowPartnerForm(!showPartnerForm)}>+ Adicionar banco/parceiro</button>
          </div>
        </header>

        <section style={summaryGrid}>
          <Summary title="Montante financiado" value={formatEuro(totals.amount)} />
          <Summary title="Comissão estimada" value={formatEuro(totals.expected)} />
          <Summary title="Comissão efetivamente recebida" value={formatEuro(totals.received)} />
          <Summary title="A pagar parceiros" value={formatEuro(totals.partnerPending)} />
          <Summary title="Pago parceiros" value={formatEuro(totals.partnerPaid)} />
          <Summary title="Margem líquida" value={formatEuro(totals.received - totals.partnerTotal)} />
        </section>

        {showPartnerForm && (
          <section style={formCard}>
            <h2 style={sectionTitle}>Adicionar banco ou parceiro</h2>

            <form style={formGrid} onSubmit={createPartner}>
              <label style={fieldLabel}>Nome
                <input style={input} value={partnerForm.name} onChange={(event) => setPartnerForm({ ...partnerForm, name: event.target.value })} placeholder="Ex: NB Sintra, NB Carcavelos, Consolida..." />
              </label>

              <label style={fieldLabel}>Tipo
                <select style={input} value={partnerForm.partner_type} onChange={(event) => setPartnerForm({ ...partnerForm, partner_type: event.target.value })}>
                  <option value="Banco">Banco</option>
                  <option value="Parceiro">Parceiro</option>
                  <option value="Intermediário">Intermediário</option>
                  <option value="Outro">Outro</option>
                </select>
              </label>

              <label style={fieldLabel}>Telefone
                <input style={input} value={partnerForm.phone} onChange={(event) => setPartnerForm({ ...partnerForm, phone: event.target.value })} />
              </label>

              <label style={fieldLabel}>Email
                <input style={input} value={partnerForm.email} onChange={(event) => setPartnerForm({ ...partnerForm, email: event.target.value })} />
              </label>

              <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>Notas
                <textarea style={textarea} value={partnerForm.notes} onChange={(event) => setPartnerForm({ ...partnerForm, notes: event.target.value })} />
              </label>

              <button style={button} disabled={saving}>{saving ? "A guardar..." : "Guardar"}</button>
            </form>
          </section>
        )}

        {showDealForm && (
          <section style={formCard}>
            <h2 style={sectionTitle}>Novo negócio financeiro</h2>

            <form style={formGrid} onSubmit={createDeal}>
              <label style={fieldLabel}>Cliente existente
                <select style={input} value={dealForm.client_id} onChange={(event) => selectClient(event.target.value)}>
                  <option value="">Selecionar cliente existente ou preencher manualmente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name} · {client.nif || "Sem NIF"}</option>
                  ))}
                </select>
              </label>

              <label style={fieldLabel}>Nome cliente
                <input style={input} value={dealForm.client_name} onChange={(event) => setDealForm({ ...dealForm, client_name: event.target.value })} required />
              </label>

              <label style={fieldLabel}>NIF
                <input style={input} value={dealForm.client_nif} onChange={(event) => setDealForm({ ...dealForm, client_nif: event.target.value })} />
              </label>

              <label style={fieldLabel}>Telefone
                <input style={input} value={dealForm.client_phone} onChange={(event) => setDealForm({ ...dealForm, client_phone: event.target.value })} />
              </label>

              <label style={fieldLabel}>Tipo de negócio
                <select style={input} value={dealForm.deal_type} onChange={(event) => setDealForm({ ...dealForm, deal_type: event.target.value })}>
                  {dealTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>

              <label style={fieldLabel}>
                Banco que paga a comissão
                <select
                  style={input}
                  value={dealForm.bank_partner_id}
                  onChange={(event) =>
                    setDealForm({
                      ...dealForm,
                      bank_partner_id: event.target.value,
                    })
                  }
                >
                  <option value="">-</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>{partner.name}</option>
                  ))}
                  <option value="__novo_banco__">+ Adicionar novo banco/destino</option>
                </select>
              </label>

              {dealForm.bank_partner_id === "__novo_banco__" && (
                <label style={fieldLabel}>
                  Novo banco
                  <input
                    style={input}
                    value={dealForm.new_bank_partner_name}
                    onChange={(event) =>
                      setDealForm({
                        ...dealForm,
                        new_bank_partner_name: event.target.value,
                      })
                    }
                    placeholder="Ex: NB Sintra, NB Pico, NB Carcavelos..."
                  />
                </label>
              )}

              <label style={fieldLabel}>
                Parceiro que trouxe o negócio
                <select
                  style={input}
                  value={dealForm.source_partner_id}
                  onChange={(event) =>
                    setDealForm({
                      ...dealForm,
                      source_partner_id: event.target.value,
                    })
                  }
                >
                  <option value="">Sem parceiro de origem</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>{partner.name}</option>
                  ))}
                  <option value="__novo_parceiro__">+ Adicionar novo parceiro</option>
                </select>
              </label>

              {dealForm.source_partner_id === "__novo_parceiro__" && (
                <label style={fieldLabel}>
                  Novo parceiro
                  <input
                    style={input}
                    value={dealForm.new_source_partner_name}
                    onChange={(event) =>
                      setDealForm({
                        ...dealForm,
                        new_source_partner_name: event.target.value,
                      })
                    }
                    placeholder="Ex: parceiro imobiliário, contabilista..."
                  />
                </label>
              )}

              <label style={fieldLabel}>Estado
                <select style={input} value={dealForm.status} onChange={(event) => setDealForm({ ...dealForm, status: event.target.value })}>
                  {dealStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>

              <label style={fieldLabel}>Montante financiado
                <input style={input} inputMode="decimal" value={dealForm.amount} onChange={(event) => updateDealForm({ ...dealForm, amount: event.target.value })} placeholder="Ex: 150000" />
              </label>

              <label style={fieldLabel}>% Comissão efetivamente recebida
                <input style={input} inputMode="decimal" value={dealForm.commission_rate} onChange={(event) => updateDealForm({ ...dealForm, commission_rate: event.target.value })} placeholder="Ex: 1,25" />
              </label>

              <label style={fieldLabel}>Comissão estimada
                <input style={input} inputMode="decimal" value={dealForm.expected_commission} onChange={(event) => setDealForm({ ...dealForm, expected_commission: event.target.value })} />
              </label>

              <label style={fieldLabel}>Comissão efetivamente recebida
                <input style={input} inputMode="decimal" value={dealForm.received_commission} onChange={(event) => setDealForm({ ...dealForm, received_commission: event.target.value })} />
              </label>

              <label style={fieldLabel}>Data recebimento comissão
                <input type="date" style={input} value={dealForm.commission_received_at} onChange={(event) => setDealForm({ ...dealForm, commission_received_at: event.target.value })} />
              </label>

              <label style={fieldLabel}>Pagamento parceiro
                <select style={input} value={dealForm.partner_payment_type} onChange={(event) => setDealForm({ ...dealForm, partner_payment_type: event.target.value })}>
                  <option value="percentagem">Percentagem da comissão recebida</option>
                  <option value="valor fixo">Valor fixo</option>
                </select>
              </label>

              <label style={fieldLabel}>% a pagar ao parceiro
                <input style={input} inputMode="decimal" value={dealForm.partner_payment_rate} onChange={(event) => setDealForm({ ...dealForm, partner_payment_rate: event.target.value })} />
              </label>

              <label style={fieldLabel}>Valor fixo parceiro
                <input style={input} inputMode="decimal" value={dealForm.partner_payment_value} onChange={(event) => setDealForm({ ...dealForm, partner_payment_value: event.target.value })} />
              </label>

              <label style={fieldLabel}>Estado pagamento parceiro
                <select style={input} value={dealForm.partner_payment_status} onChange={(event) => setDealForm({ ...dealForm, partner_payment_status: event.target.value })}>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>
              </label>

              <label style={fieldLabel}>Data pagamento parceiro
                <input type="date" style={input} value={dealForm.partner_paid_at} onChange={(event) => setDealForm({ ...dealForm, partner_paid_at: event.target.value })} />
              </label>

              <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>Notas
                <textarea style={textarea} value={dealForm.notes} onChange={(event) => setDealForm({ ...dealForm, notes: event.target.value })} />
              </label>

              <button style={button} disabled={saving}>{saving ? "A guardar..." : "Guardar negócio"}</button>
            </form>
          </section>
        )}

        <section style={panel}>
          <h2 style={sectionTitle}>Pagamentos a parceiros</h2>
          {groupedPartnerPayments.length === 0 ? <p style={muted}>Sem pagamentos a parceiros.</p> : (
            <div style={partnerGrid}>
              {groupedPartnerPayments.map((item) => (
                <div key={item.partnerName} style={partnerBox}>
                  <span style={summaryLabel}>{item.partnerName}</span>
                  <strong style={partnerPending}>{formatEuro(item.pending)}</strong>
                  <span style={smallMuted}>Total: {formatEuro(item.total)} · Pago: {formatEuro(item.paid)} · Negócios: {item.deals}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={filterCard}>
          <input style={searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar por cliente, NIF, telefone, banco, parceiro, tipo ou estado..." />

          <select style={input} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="todos">Todos os estados</option>
            {dealStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>

          <select style={input} value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
            <option value="todos">Pagamentos parceiros: todos</option>
            <option value="pendente">Pendentes</option>
            <option value="pago">Pagos</option>
          </select>
        </section>

        <section style={panel}>
          <h2 style={sectionTitle}>Negócios</h2>
          {filteredDeals.length === 0 ? <p style={muted}>Sem negócios nesta seleção.</p> : (
            <div style={dealsGrid}>
              {filteredDeals.map((deal) => {
                const partnerDue = calculatePartnerPayment(deal.received_commission, deal.partner_payment_type, deal.partner_payment_rate, deal.partner_payment_value);

                return (
                  <article key={deal.id} style={dealCard}>
                    <div style={dealTop}>
                      <div>
                        <h3 style={dealTitle}>{deal.client_name}</h3>
                        <p style={muted}>{deal.deal_type} · {deal.bank_partner?.name || "Sem banco"}</p>
                      </div>
                      <span style={statusBadge}>{deal.status}</span>
                    </div>

                    <div style={miniGrid}>
                      <Mini title="Montante" value={formatEuro(deal.amount)} />
                      <Mini title="Comissão estimada" value={formatEuro(deal.expected_commission)} />
                      <Mini title="Comissão efetivamente recebida" value={formatEuro(deal.received_commission)} />
                      <Mini title="A pagar parceiro" value={formatEuro(partnerDue)} />
                    </div>

                    <div style={infoGrid}>
                      <Info label="NIF" value={deal.client_nif || "-"} />
                      <Info label="Telefone" value={deal.client_phone || "-"} />
                      <Info label="Banco que paga" value={deal.bank_partner?.name || "-"} />
                      <Info label="Parceiro que trouxe o negócio" value={deal.source_partner?.name || "-"} />
                      <Info label="% comissão" value={`${Number(deal.commission_rate || 0)}%`} />
                      <Info label="Recebimento comissão" value={formatDate(deal.commission_received_at)} />
                      <Info label="Estado pagamento parceiro" value={deal.partner_payment_status} />
                      <Info label="Data pagamento parceiro" value={formatDate(deal.partner_paid_at)} />
                    </div>

                    {deal.notes && <div style={notesBox}><strong>Notas</strong><p>{deal.notes}</p></div>}

                    <div style={actionRow}>
                      {deal.client_id && <Link href={`/clientes/${deal.client_id}`} style={clientButton}>Abrir cliente</Link>}
                      <button style={secondaryButton} onClick={() => markCommissionReceived(deal)}>Comissão efetivamente recebida</button>
                      {deal.partner_payment_status === "pago" ? (
                        <button style={grayButton} onClick={() => markPartnerPending(deal)}>Reabrir pagamento</button>
                      ) : (
                        <button style={paidButton} onClick={() => markPartnerPaid(deal)}>Marcar parceiro pago</button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Summary({ title, value }) {
  return <div style={summaryBox}><span style={summaryLabel}>{title}</span><strong style={summaryValue}>{value}</strong></div>;
}

function Mini({ title, value }) {
  return <div style={miniBox}><span style={summaryLabel}>{title}</span><strong>{value}</strong></div>;
}

function Info({ label, value }) {
  return <div style={infoBox}><span style={summaryLabel}>{label}</span><strong>{value}</strong></div>;
}

const page = { display: "flex", minHeight: "100vh", background: "#f3f4f6", fontFamily: "Arial, sans-serif" };
const main = { flex: 1, padding: 40 };
const header = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, marginBottom: 28 };
const headerButtons = { display: "flex", gap: 10, flexWrap: "wrap" };
const title = { fontSize: 42, margin: 0 };
const subtitle = { color: "#6b7280", marginTop: 8, maxWidth: 780 };
const summaryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 24 };
const summaryBox = { background: "#f0fdf4", padding: 18, borderRadius: 16, display: "grid", gap: 8, boxShadow: "0 1px 4px rgba(22,101,52,0.16)" };
const summaryLabel = { color: "#6b7280", fontSize: 13, fontWeight: "bold" };
const summaryValue = { color: "#2563eb", fontSize: 24 };
const formCard = { background: "#f0fdf4", padding: 24, borderRadius: 18, marginBottom: 24, boxShadow: "0 1px 4px rgba(22,101,52,0.16)" };
const sectionTitle = { marginTop: 0 };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 };
const fieldLabel = { display: "flex", flexDirection: "column", gap: 6, color: "#374151", fontWeight: "bold", fontSize: 13 };
const input = { padding: 12, borderRadius: 10, border: "1px solid #d1d5db", fontSize: 14, background: "#f0fdf4" };
const textarea = { padding: 12, borderRadius: 10, border: "1px solid #d1d5db", fontSize: 14, background: "#f0fdf4", minHeight: 90, fontFamily: "Arial, sans-serif" };
const button = { background: "#111827", color: "white", border: "none", padding: "12px 16px", borderRadius: 10, cursor: "pointer", fontWeight: "bold" };
const secondaryButton = { background: "#2563eb", color: "white", border: "none", padding: "12px 16px", borderRadius: 10, cursor: "pointer", fontWeight: "bold" };
const paidButton = { background: "#16a34a", color: "white", border: "none", padding: "12px 16px", borderRadius: 10, cursor: "pointer", fontWeight: "bold" };
const grayButton = { background: "#6b7280", color: "white", border: "none", padding: "12px 16px", borderRadius: 10, cursor: "pointer", fontWeight: "bold" };
const panel = { background: "#f0fdf4", padding: 24, borderRadius: 18, marginBottom: 24, boxShadow: "0 1px 4px rgba(22,101,52,0.16)" };
const partnerGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 };
const partnerBox = { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, display: "grid", gap: 6 };
const partnerPending = { color: "#dc2626", fontSize: 24 };
const filterCard = { background: "#f0fdf4", padding: 18, borderRadius: 18, marginBottom: 24, boxShadow: "0 1px 4px rgba(22,101,52,0.16)", display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 };
const searchInput = { padding: 12, borderRadius: 10, border: "1px solid #d1d5db", fontSize: 14 };
const dealsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 18 };
const dealCard = { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 16, padding: 18 };
const dealTop = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14 };
const dealTitle = { margin: 0, fontSize: 22 };
const statusBadge = { background: "#dbeafe", color: "#1d4ed8", padding: "7px 10px", borderRadius: 999, fontSize: 12, fontWeight: "bold" };
const miniGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 };
const miniBox = { background: "#f0fdf4", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, display: "grid", gap: 6 };
const infoGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 };
const infoBox = { background: "#f0fdf4", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, display: "grid", gap: 6 };
const notesBox = { background: "#f0fdf4", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, marginTop: 12 };
const actionRow = { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 };
const clientButton = { background: "#0f766e", color: "white", padding: "12px 16px", borderRadius: 10, textDecoration: "none", fontWeight: "bold" };
const muted = { color: "#6b7280" };
const smallMuted = { color: "#6b7280", fontSize: 12 };
