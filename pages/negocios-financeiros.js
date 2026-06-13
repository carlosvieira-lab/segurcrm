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

  const { data: contests } = await supabase
    .from("financial_contests")
    .select("*")
    .order("start_date", { ascending: false });

  const { data: campaigns } = await supabase
    .from("financial_campaigns")
    .select("*")
    .order("start_date", { ascending: false });

  return {
    props: {
      deals: deals || [],
      partners: partners || [],
      clients: clients || [],
      contests: contests || [],
      campaigns: campaigns || [],
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

function buildWhatsappUrl(phone, message) {
  const cleanPhone = onlyNumbers(phone);

  if (!cleanPhone) return "";

  const finalPhone = cleanPhone.startsWith("351")
    ? cleanPhone
    : `351${cleanPhone}`;

  return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
}

function buildRankingReferenceLine(label, rankingItem) {
  if (!rankingItem) return `${label} lugar — ainda sem referência`;

  return `${label} lugar — ${formatEuro(rankingItem.totalAmount)}`;
}

function buildCruzadosWhatsappMessage(item, position, ranking, contestName, minimumAmount) {
  const previousItem = ranking[position - 2] || null;
  const valueToClimb = previousItem
    ? Math.max(Number(previousItem.totalAmount || 0) - Number(item.totalAmount || 0) + 1, 0)
    : 0;

  const fifteenthItem = ranking[14] || null;
  const valueToTop15 =
    position > 15 && fifteenthItem
      ? Math.max(Number(fifteenthItem.totalAmount || 0) - Number(item.totalAmount || 0) + 1, 0)
      : 0;

  const minimum = Number(minimumAmount || 580000);
  const missingMinimum = Math.max(minimum - Number(item.totalAmount || 0), 0);

  let progressLine = "";

  if (position === 1) {
    progressLine = "Estás atualmente em 1º lugar. Mantém o ritmo para defender a liderança.";
  } else if (position > 15 && fifteenthItem) {
    progressLine = `Faltam ${formatEuro(valueToTop15)} para entrares no Top 15.`;
  } else if (previousItem) {
    progressLine = `Faltam ${formatEuro(valueToClimb)} para ultrapassares o ${position - 1}º lugar.`;
  }

  const minimumLine =
    missingMinimum > 0
      ? `Faltam ${formatEuro(missingMinimum)} para atingires o mínimo de apuramento de ${formatEuro(minimum)}.`
      : `Já atingiste o mínimo de apuramento de ${formatEuro(minimum)}.`;

  const referenceLines = [
    buildRankingReferenceLine("15º", ranking[14]),
    buildRankingReferenceLine("10º", ranking[9]),
    buildRankingReferenceLine("5º", ranking[4]),
    buildRankingReferenceLine("1º", ranking[0]),
  ].join("\n");

  return `Olá ${item.partnerName},

Segue a atualização quinzenal da tua posição no ranking anual ${contestName}.

🏆 Posição atual: ${position}º lugar

💰 Volume contratado acumulado: ${formatEuro(item.totalAmount)}

📈 ${progressLine}

${minimumLine}

📊 Referências atuais do ranking, sem identificação dos parceiros:

${referenceLines}

Obrigado pela parceria e continuação de bons negócios.

Carlos Vieira
Loja de Seguros de Trajouce`;
}

function buildCampaignWhatsappMessage(item, campaign) {
  const objective = Number(campaign.objective_amount || 0);
  const total = Number(item.totalAmount || 0);
  const missing = Math.max(objective - total, 0);

  const statusLine =
    missing > 0
      ? `Faltam ${formatEuro(missing)} para atingires o objetivo de ${formatEuro(objective)}.`
      : `Já atingiste o objetivo de ${formatEuro(objective)}.`;

  return `Olá ${item.partnerName},

Segue o ponto de situação da campanha ${campaign.name}.

💰 Volume contratado acumulado: ${formatEuro(total)}

${statusLine}

🎁 Prémio/objetivo da campanha:
${campaign.prize || "-"}

Obrigado pela parceria e bons negócios.

Carlos Vieira
Loja de Seguros de Trajouce`;
}

function calculateExpectedCommission(amount, rate) {
  return (Number(amount || 0) * Number(rate || 0)) / 100;
}

function calculatePartnerPayment(financedAmount, paymentType, paymentRate, paymentValue) {
  if (paymentType === "valor fixo") return Number(paymentValue || 0);
  return (Number(financedAmount || 0) * Number(paymentRate || 0)) / 100;
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
    default_payment_type: "percentagem",
    default_payment_rate: "",
    default_payment_value: "",
    notes: "",
  };
}

function buildDefaultContestForm() {
  return {
    name: "CRUZADOS 2026",
    start_date: "2026-01-03",
    end_date: "2026-12-30",
    minimum_amount: "580000",
    prize_1: "Viagem no valor de 2.500 €",
    prize_1_amount: "2500",
    prize_2: "Viagem no valor de 2.000 €",
    prize_2_amount: "2000",
    prize_3: "Viagem no valor de 1.500 €",
    prize_3_amount: "1500",
    tie_breaker: "Maior processo contratado",
    eligible_deal_types: ["Crédito Habitação", "Crédito Pessoal"],
    report_notes: "Reporte ao dia 1 e dia 15 de cada mês.",
    is_active: true,
  };
}

function buildContestForm(contest) {
  if (!contest) return buildDefaultContestForm();

  return {
    name: contest.name || "CRUZADOS",
    start_date: contest.start_date || "",
    end_date: contest.end_date || "",
    minimum_amount: contest.minimum_amount
      ? String(contest.minimum_amount).replace(".", ",")
      : "",
    prize_1: contest.prize_1 || "",
    prize_1_amount: contest.prize_1_amount
      ? String(contest.prize_1_amount).replace(".", ",")
      : "",
    prize_2: contest.prize_2 || "",
    prize_2_amount: contest.prize_2_amount
      ? String(contest.prize_2_amount).replace(".", ",")
      : "",
    prize_3: contest.prize_3 || "",
    prize_3_amount: contest.prize_3_amount
      ? String(contest.prize_3_amount).replace(".", ",")
      : "",
    tie_breaker: contest.tie_breaker || "",
    eligible_deal_types: Array.isArray(contest.eligible_deal_types)
      ? contest.eligible_deal_types
      : [],
    report_notes: contest.report_notes || "",
    is_active: contest.is_active !== false,
  };
}

function buildDefaultCampaignForm() {
  return {
    name: "",
    start_date: "",
    end_date: "",
    contract_deadline: "",
    objective_amount: "",
    cost_per_winner: "",
    prize: "",
    eligible_deal_types: ["Crédito Habitação", "Crédito Pessoal"],
    notes: "",
    is_active: true,
  };
}

function buildCampaignForm(campaign) {
  if (!campaign) return buildDefaultCampaignForm();

  return {
    name: campaign.name || "",
    start_date: campaign.start_date || "",
    end_date: campaign.end_date || "",
    contract_deadline: campaign.contract_deadline || "",
    objective_amount: campaign.objective_amount
      ? String(campaign.objective_amount).replace(".", ",")
      : "",
    cost_per_winner: campaign.cost_per_winner
      ? String(campaign.cost_per_winner).replace(".", ",")
      : "",
    prize: campaign.prize || "",
    eligible_deal_types: Array.isArray(campaign.eligible_deal_types)
      ? campaign.eligible_deal_types
      : [],
    notes: campaign.notes || "",
    is_active: campaign.is_active !== false,
  };
}

function getPartnerClassification(totalAmount) {
  const amount = Number(totalAmount || 0);

  if (amount > 750000) return { label: "TOP", color: "#166534", background: "#dcfce7" };
  if (amount > 400000) return { label: "BOM", color: "#1d4ed8", background: "#dbeafe" };
  if (amount >= 200000) return { label: "MÉDIO", color: "#92400e", background: "#fef3c7" };

  return { label: "FRACO", color: "#991b1b", background: "#fee2e2" };
}

function getDealDate(deal) {
  return String(deal.commission_received_at || deal.created_at || "").slice(0, 10);
}

function dealMatchesTypes(deal, types) {
  if (!types || types.length === 0) return true;
  return types.includes(deal.deal_type);
}


export default function NegociosFinanceiros({ deals, partners, clients, contests, campaigns }) {
  const [showDealForm, setShowDealForm] = useState(false);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [dealForm, setDealForm] = useState(buildInitialDealForm);
  const [partnerForm, setPartnerForm] = useState(buildInitialPartnerForm);
  const [editingPartnerId, setEditingPartnerId] = useState(null);
  const [showPartnersPanel, setShowPartnersPanel] = useState(false);
  const [showCruzadosRanking, setShowCruzadosRanking] = useState(false);
  const [showContestEditor, setShowContestEditor] = useState(false);
  const [selectedContestId, setSelectedContestId] = useState(contests?.[0]?.id || "");
  const [contestForm, setContestForm] = useState(() =>
    buildContestForm(contests?.[0] || null)
  );
  const [showCampaignsPanel, setShowCampaignsPanel] = useState(false);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  const [showCampaignEditor, setShowCampaignEditor] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaigns?.[0]?.id || "");
  const [campaignForm, setCampaignForm] = useState(() =>
    buildCampaignForm(campaigns?.[0] || null)
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [paymentFilter, setPaymentFilter] = useState("todos");
  const [saving, setSaving] = useState(false);

  const activePartners = partners.filter((p) => p.is_active !== false);
  const inactivePartners = partners.filter((p) => p.is_active === false);
  const bancos = activePartners.filter((p) => p.partner_type === "Banco");
  const parceiros = activePartners.filter((p) => p.partner_type !== "Banco");

  const selectedContest =
    contests.find((contest) => contest.id === selectedContestId) ||
    contests[0] ||
    null;

  const contestRules = buildContestForm(selectedContest);

  const selectedCampaign =
    campaigns.find((campaign) => campaign.id === selectedCampaignId) ||
    campaigns[0] ||
    null;

  const campaignRules = buildCampaignForm(selectedCampaign);

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
          deal.amount,
          deal.partner_payment_type,
          deal.partner_payment_rate,
          deal.partner_payment_value
        );

        acc.amount += Number(deal.amount || 0);
        acc.expected += Number(deal.expected_commission || 0);
        acc.received += Number(deal.received_commission || 0);
        acc.partnerTotal += partnerDue;
        acc.difference += Number(deal.received_commission || 0) - Number(deal.expected_commission || 0);

        if (deal.partner_payment_status === "pago") acc.partnerPaid += partnerDue;
        else acc.partnerPending += partnerDue;

        return acc;
      },
      { amount: 0, expected: 0, received: 0, difference: 0, partnerTotal: 0, partnerPaid: 0, partnerPending: 0 }
    );
  }, [deals, partners]);

  const groupedPartnerPayments = useMemo(() => {
    const map = new Map();

    deals.forEach((deal) => {
      const partnerName = deal.source_partner?.name || "Sem parceiro de origem";
      const partnerDue = calculatePartnerPayment(
        deal.amount,
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

  const cruzadosRanking = useMemo(() => {
    const startDate = contestRules.start_date || "2026-01-03";
    const endDate = contestRules.end_date || "2026-12-30";
    const minimumAmount = parseDecimal(contestRules.minimum_amount) || 580000;
    const eligibleTypes =
      contestRules.eligible_deal_types && contestRules.eligible_deal_types.length > 0
        ? contestRules.eligible_deal_types
        : ["Crédito Habitação", "Crédito Pessoal"];

    const map = new Map();

    deals
      .filter((deal) => {
        const dealDate = String(deal.commission_received_at || deal.created_at || "").slice(0, 10);

        return (
          deal.status === "CONTRATADO" &&
          eligibleTypes.includes(deal.deal_type) &&
          deal.source_partner_id &&
          dealDate >= startDate &&
          dealDate <= endDate
        );
      })
      .forEach((deal) => {
        const partnerId = deal.source_partner_id;
        const partnerName = deal.source_partner?.name || "Sem parceiro";
        const fullPartner = partners.find((partner) => partner.id === partnerId);
        const partnerPhone = fullPartner?.phone || "";
        const amount = Number(deal.amount || 0);

        if (!map.has(partnerId)) {
          map.set(partnerId, {
            partnerId,
            partnerName,
            partnerPhone,
            totalAmount: 0,
            dealsCount: 0,
            biggestDeal: 0,
          });
        }

        const item = map.get(partnerId);
        item.totalAmount += amount;
        item.dealsCount += 1;
        item.biggestDeal = Math.max(item.biggestDeal, amount);
      });

    return [...map.values()]
      .map((item) => ({
        ...item,
        eligible: item.totalAmount >= minimumAmount,
      }))
      .sort((a, b) => {
        if (b.totalAmount !== a.totalAmount) return b.totalAmount - a.totalAmount;
        return b.biggestDeal - a.biggestDeal;
      });
  }, [deals, partners, contestRules]);

  const cruzadosPrizes = [
    `1º lugar — ${contestRules.prize_1 || "-"}`,
    `2º lugar — ${contestRules.prize_2 || "-"}`,
    `3º lugar — ${contestRules.prize_3 || "-"}`,
  ];

  const campaignRanking = useMemo(() => {
    const startDate = campaignRules.start_date || "";
    const endDate = campaignRules.contract_deadline || campaignRules.end_date || "";
    const objective = parseDecimal(campaignRules.objective_amount) || 0;
    const eligibleTypes =
      campaignRules.eligible_deal_types && campaignRules.eligible_deal_types.length > 0
        ? campaignRules.eligible_deal_types
        : dealTypes;

    const map = new Map();

    deals
      .filter((deal) => {
        const dealDate = String(deal.commission_received_at || deal.created_at || "").slice(0, 10);

        return (
          deal.status === "CONTRATADO" &&
          eligibleTypes.includes(deal.deal_type) &&
          deal.source_partner_id &&
          (!startDate || dealDate >= startDate) &&
          (!endDate || dealDate <= endDate)
        );
      })
      .forEach((deal) => {
        const partnerId = deal.source_partner_id;
        const partnerName = deal.source_partner?.name || "Sem parceiro";
        const fullPartner = partners.find((partner) => partner.id === partnerId);
        const partnerPhone = fullPartner?.phone || "";
        const amount = Number(deal.amount || 0);

        if (!map.has(partnerId)) {
          map.set(partnerId, {
            partnerId,
            partnerName,
            partnerPhone,
            totalAmount: 0,
            dealsCount: 0,
            biggestDeal: 0,
          });
        }

        const item = map.get(partnerId);
        item.totalAmount += amount;
        item.dealsCount += 1;
        item.biggestDeal = Math.max(item.biggestDeal, amount);
      });

    return [...map.values()]
      .map((item) => {
        const missing = Math.max(objective - item.totalAmount, 0);
        const progress = objective > 0 ? (item.totalAmount / objective) * 100 : 0;

        return {
          ...item,
          missing,
          progress,
          achieved: objective > 0 && item.totalAmount >= objective,
          near: objective > 0 && item.totalAmount < objective && progress >= 80,
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [deals, partners, campaignRules]);

  const campaignStats = {
    participants: campaignRanking.length,
    achieved: campaignRanking.filter((item) => item.achieved).length,
    near: campaignRanking.filter((item) => item.near).length,
    pending: campaignRanking.filter((item) => !item.achieved && !item.near).length,
  };

  const bankAnalysis = useMemo(() => {
    const map = new Map();

    deals.forEach((deal) => {
      const bankName = deal.bank_partner?.name || "Sem banco";
      const key = deal.bank_partner_id || "sem-banco";
      const amount = Number(deal.amount || 0);
      const received = Number(deal.received_commission || 0);
      const status = deal.status || "SEM ESTADO";

      if (!map.has(key)) {
        map.set(key, {
          key,
          name: bankName,
          processCount: 0,
          totalAmount: 0,
          receivedCommission: 0,
          statusMap: {},
        });
      }

      const item = map.get(key);
      item.processCount += 1;
      item.totalAmount += amount;
      item.receivedCommission += received;

      if (!item.statusMap[status]) {
        item.statusMap[status] = { count: 0, amount: 0 };
      }

      item.statusMap[status].count += 1;
      item.statusMap[status].amount += amount;
    });

    return [...map.values()].sort((a, b) => b.totalAmount - a.totalAmount);
  }, [deals]);

  const partnerAnalysis = useMemo(() => {
    const campaignCostByPartner = {};
    const contestCostByPartner = {};

    campaigns.forEach((campaign) => {
      const objective = Number(campaign.objective_amount || 0);
      const cost = Number(campaign.cost_per_winner || 0);
      const startDate = campaign.start_date || "";
      const endDate = campaign.contract_deadline || campaign.end_date || "";
      const eligibleTypes = Array.isArray(campaign.eligible_deal_types) ? campaign.eligible_deal_types : [];

      const totals = {};

      deals
        .filter((deal) => {
          const date = getDealDate(deal);

          return (
            deal.status === "CONTRATADO" &&
            deal.source_partner_id &&
            dealMatchesTypes(deal, eligibleTypes) &&
            (!startDate || date >= startDate) &&
            (!endDate || date <= endDate)
          );
        })
        .forEach((deal) => {
          totals[deal.source_partner_id] =
            (totals[deal.source_partner_id] || 0) + Number(deal.amount || 0);
        });

      Object.entries(totals).forEach(([partnerId, total]) => {
        if (objective > 0 && total >= objective) {
          campaignCostByPartner[partnerId] = (campaignCostByPartner[partnerId] || 0) + cost;
        }
      });
    });

    contests.forEach((contest) => {
      const prizeAmounts = [
        Number(contest.prize_1_amount || 0),
        Number(contest.prize_2_amount || 0),
        Number(contest.prize_3_amount || 0),
      ];

      const startDate = contest.start_date || "";
      const endDate = contest.end_date || "";
      const eligibleTypes = Array.isArray(contest.eligible_deal_types) ? contest.eligible_deal_types : [];
      const map = new Map();

      deals
        .filter((deal) => {
          const date = getDealDate(deal);

          return (
            deal.status === "CONTRATADO" &&
            deal.source_partner_id &&
            dealMatchesTypes(deal, eligibleTypes) &&
            (!startDate || date >= startDate) &&
            (!endDate || date <= endDate)
          );
        })
        .forEach((deal) => {
          const partnerId = deal.source_partner_id;
          const amount = Number(deal.amount || 0);

          if (!map.has(partnerId)) {
            map.set(partnerId, {
              partnerId,
              totalAmount: 0,
              biggestDeal: 0,
            });
          }

          const item = map.get(partnerId);
          item.totalAmount += amount;
          item.biggestDeal = Math.max(item.biggestDeal, amount);
        });

      [...map.values()]
        .sort((a, b) => {
          if (b.totalAmount !== a.totalAmount) return b.totalAmount - a.totalAmount;
          return b.biggestDeal - a.biggestDeal;
        })
        .slice(0, 3)
        .forEach((item, index) => {
          contestCostByPartner[item.partnerId] =
            (contestCostByPartner[item.partnerId] || 0) + Number(prizeAmounts[index] || 0);
        });
    });

    const map = new Map();

    deals.forEach((deal) => {
      const partnerId = deal.source_partner_id || "sem-parceiro";
      const partnerName = deal.source_partner?.name || "Sem parceiro";
      const amount = Number(deal.amount || 0);
      const received = Number(deal.received_commission || 0);
      const partnerPaid = calculatePartnerPayment(
        deal.amount,
        deal.partner_payment_type,
        deal.partner_payment_rate,
        deal.partner_payment_value
      );

      if (!map.has(partnerId)) {
        map.set(partnerId, {
          partnerId,
          name: partnerName,
          processCount: 0,
          contractedAmount: 0,
          receivedCommission: 0,
          partnerPayments: 0,
          campaignCosts: 0,
          contestCosts: 0,
          netResult: 0,
        });
      }

      const item = map.get(partnerId);
      item.processCount += 1;

      if (deal.status === "CONTRATADO") {
        item.contractedAmount += amount;
      }

      item.receivedCommission += received;
      item.partnerPayments += partnerPaid;
    });

    return [...map.values()]
      .map((item) => {
        const campaignCosts = Number(campaignCostByPartner[item.partnerId] || 0);
        const contestCosts = Number(contestCostByPartner[item.partnerId] || 0);
        const netResult =
          Number(item.receivedCommission || 0) -
          Number(item.partnerPayments || 0) -
          campaignCosts -
          contestCosts;

        return {
          ...item,
          campaignCosts,
          contestCosts,
          netResult,
          classification: getPartnerClassification(item.contractedAmount),
        };
      })
      .sort((a, b) => b.contractedAmount - a.contractedAmount);
  }, [deals, campaigns, contests]);

  const campaignCostAnalysis = useMemo(() => {
    return campaigns.map((campaign) => {
      const objective = Number(campaign.objective_amount || 0);
      const cost = Number(campaign.cost_per_winner || 0);
      const startDate = campaign.start_date || "";
      const endDate = campaign.contract_deadline || campaign.end_date || "";
      const eligibleTypes = Array.isArray(campaign.eligible_deal_types) ? campaign.eligible_deal_types : [];
      const map = new Map();

      deals
        .filter((deal) => {
          const date = getDealDate(deal);

          return (
            deal.status === "CONTRATADO" &&
            deal.source_partner_id &&
            dealMatchesTypes(deal, eligibleTypes) &&
            (!startDate || date >= startDate) &&
            (!endDate || date <= endDate)
          );
        })
        .forEach((deal) => {
          const partnerId = deal.source_partner_id;
          const partnerName = deal.source_partner?.name || "Sem parceiro";

          if (!map.has(partnerId)) {
            map.set(partnerId, { partnerName, totalAmount: 0 });
          }

          map.get(partnerId).totalAmount += Number(deal.amount || 0);
        });

      const winners = [...map.values()].filter((item) => objective > 0 && item.totalAmount >= objective);

      return {
        id: campaign.id,
        name: campaign.name,
        objective,
        costPerWinner: cost,
        winners,
        totalCost: winners.length * cost,
      };
    });
  }, [campaigns, deals]);

  const contestCostAnalysis = useMemo(() => {
    return contests.map((contest) => {
      const totalCost =
        Number(contest.prize_1_amount || 0) +
        Number(contest.prize_2_amount || 0) +
        Number(contest.prize_3_amount || 0);

      return {
        id: contest.id,
        name: contest.name,
        totalCost,
        prize_1_amount: Number(contest.prize_1_amount || 0),
        prize_2_amount: Number(contest.prize_2_amount || 0),
        prize_3_amount: Number(contest.prize_3_amount || 0),
      };
    });
  }, [contests]);

  const globalAnalysis = useMemo(() => {
    const totalPartnerPayments = partnerAnalysis.reduce((sum, item) => sum + item.partnerPayments, 0);
    const totalCampaignCosts = partnerAnalysis.reduce((sum, item) => sum + item.campaignCosts, 0);
    const totalContestCosts = partnerAnalysis.reduce((sum, item) => sum + item.contestCosts, 0);
    const totalReceived = deals.reduce((sum, deal) => sum + Number(deal.received_commission || 0), 0);
    const totalAmount = deals.reduce((sum, deal) => sum + Number(deal.amount || 0), 0);

    return {
      processCount: deals.length,
      totalAmount,
      totalReceived,
      totalPartnerPayments,
      totalCampaignCosts,
      totalContestCosts,
      netResult: totalReceived - totalPartnerPayments - totalCampaignCosts - totalContestCosts,
    };
  }, [deals, partnerAnalysis]);

  function selectContest(contestId) {
    const contest = contests.find((item) => item.id === contestId) || null;

    setSelectedContestId(contestId);
    setContestForm(buildContestForm(contest));
  }

  function selectCampaign(campaignId) {
    const campaign = campaigns.find((item) => item.id === campaignId) || null;

    setSelectedCampaignId(campaignId);
    setCampaignForm(buildCampaignForm(campaign));
  }

  function toggleContestDealType(type) {
    const current = contestForm.eligible_deal_types || [];
    const exists = current.includes(type);

    setContestForm({
      ...contestForm,
      eligible_deal_types: exists
        ? current.filter((item) => item !== type)
        : [...current, type],
    });
  }

  function toggleCampaignDealType(type) {
    const current = campaignForm.eligible_deal_types || [];
    const exists = current.includes(type);

    setCampaignForm({
      ...campaignForm,
      eligible_deal_types: exists
        ? current.filter((item) => item !== type)
        : [...current, type],
    });
  }

  async function saveContest(event) {
    event.preventDefault();

    if (!contestForm.name.trim()) {
      alert("Preenche o nome do concurso.");
      return;
    }

    setSaving(true);

    const payload = {
      name: contestForm.name.trim(),
      start_date: contestForm.start_date || null,
      end_date: contestForm.end_date || null,
      minimum_amount: parseDecimal(contestForm.minimum_amount),
      prize_1: contestForm.prize_1 || null,
      prize_1_amount: parseDecimal(contestForm.prize_1_amount),
      prize_2: contestForm.prize_2 || null,
      prize_2_amount: parseDecimal(contestForm.prize_2_amount),
      prize_3: contestForm.prize_3 || null,
      prize_3_amount: parseDecimal(contestForm.prize_3_amount),
      tie_breaker: contestForm.tie_breaker || null,
      eligible_deal_types: contestForm.eligible_deal_types || [],
      report_notes: contestForm.report_notes || null,
      is_active: contestForm.is_active !== false,
    };

    let error = null;

    if (selectedContestId) {
      const result = await supabase
        .from("financial_contests")
        .update(payload)
        .eq("id", selectedContestId);

      error = result.error;
    } else {
      const result = await supabase
        .from("financial_contests")
        .insert(payload);

      error = result.error;
    }

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function saveCampaign(event) {
    event.preventDefault();

    if (!campaignForm.name.trim()) {
      alert("Preenche o nome da campanha.");
      return;
    }

    setSaving(true);

    const payload = {
      name: campaignForm.name.trim(),
      start_date: campaignForm.start_date || null,
      end_date: campaignForm.end_date || null,
      contract_deadline: campaignForm.contract_deadline || null,
      objective_amount: parseDecimal(campaignForm.objective_amount),
      cost_per_winner: parseDecimal(campaignForm.cost_per_winner),
      prize: campaignForm.prize || null,
      eligible_deal_types: campaignForm.eligible_deal_types || [],
      notes: campaignForm.notes || null,
      is_active: campaignForm.is_active !== false,
    };

    let error = null;

    if (selectedCampaignId) {
      const result = await supabase
        .from("financial_campaigns")
        .update(payload)
        .eq("id", selectedCampaignId);

      error = result.error;
    } else {
      const result = await supabase
        .from("financial_campaigns")
        .insert(payload);

      error = result.error;
    }

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function duplicateContestForNextYear() {
    const currentYear = Number(String(contestForm.start_date || new Date().getFullYear()).slice(0, 4));
    const nextYear = currentYear + 1;
    const baseName = String(contestForm.name || "CRUZADOS").replace(/\d{4}/, "").trim();

    setSelectedContestId("");
    setContestForm({
      ...contestForm,
      name: `${baseName || "CRUZADOS"} ${nextYear}`,
      start_date: `${nextYear}-01-01`,
      end_date: `${nextYear}-12-31`,
    });
    setShowContestEditor(true);
  }

  function createNewCampaign() {
    setSelectedCampaignId("");
    setCampaignForm(buildDefaultCampaignForm());
    setShowCampaignEditor(true);
    setShowCampaignsPanel(true);
  }

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

  function selectSourcePartner(partnerId) {
    const partner = partners.find((item) => item.id === partnerId);

    if (!partner) {
      setDealForm({
        ...dealForm,
        source_partner_id: partnerId,
      });
      return;
    }

    setDealForm({
      ...dealForm,
      source_partner_id: partnerId,
      partner_payment_type: partner.default_payment_type || "percentagem",
      partner_payment_rate: partner.default_payment_rate
        ? String(partner.default_payment_rate).replace(".", ",")
        : "",
      partner_payment_value: partner.default_payment_value
        ? String(partner.default_payment_value).replace(".", ",")
        : "",
    });
  }

  function updateDealForm(next) {
    const amount = parseDecimal(next.amount);
    const rate = parseDecimal(next.commission_rate);
    const expected = calculateExpectedCommission(amount, rate);

    setDealForm({
      ...next,
      expected_commission: expected ? String(expected.toFixed(2)).replace(".", ",") : "",
    });
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
      default_payment_type: partnerForm.default_payment_type || "percentagem",
      default_payment_rate: parseDecimal(partnerForm.default_payment_rate),
      default_payment_value: parseDecimal(partnerForm.default_payment_value),
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

  function openEditPartner(partner) {
    setEditingPartnerId(partner.id);
    setShowPartnerForm(true);
    setPartnerForm({
      name: partner.name || "",
      partner_type: partner.partner_type || "Banco",
      phone: partner.phone || "",
      email: partner.email || "",
      default_payment_type: partner.default_payment_type || "percentagem",
      default_payment_rate: partner.default_payment_rate
        ? String(partner.default_payment_rate).replace(".", ",")
        : "",
      default_payment_value: partner.default_payment_value
        ? String(partner.default_payment_value).replace(".", ",")
        : "",
      notes: partner.notes || "",
    });
  }

  function resetPartnerForm() {
    setEditingPartnerId(null);
    setPartnerForm(buildInitialPartnerForm());
  }

  async function savePartner(event) {
    event.preventDefault();

    if (!partnerForm.name.trim()) {
      alert("Preenche o nome do banco ou parceiro.");
      return;
    }

    if (!editingPartnerId) {
      await createPartner(event);
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("financial_partners")
      .update({
        name: partnerForm.name.trim(),
        partner_type: partnerForm.partner_type,
        phone: partnerForm.phone || null,
        email: partnerForm.email || null,
        default_payment_type: partnerForm.default_payment_type || "percentagem",
        default_payment_rate: parseDecimal(partnerForm.default_payment_rate),
        default_payment_value: parseDecimal(partnerForm.default_payment_value),
        notes: partnerForm.notes || null,
      })
      .eq("id", editingPartnerId);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function togglePartnerActive(partner) {
    const nextActive = partner.is_active === false;
    const message = nextActive
      ? "Reativar este banco/parceiro?"
      : "Anular este banco/parceiro? Ele deixa de aparecer nos dropdowns, mas o histórico mantém-se.";

    const ok = window.confirm(message);
    if (!ok) return;

    const { error } = await supabase
      .from("financial_partners")
      .update({ is_active: nextActive })
      .eq("id", partner.id);

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
        default_payment_type: "percentagem",
        default_payment_rate: 0,
        default_payment_value: 0,
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
            <button
              style={secondaryButton}
              onClick={() => setShowCruzadosRanking(!showCruzadosRanking)}
            >
              🏆 Concursos
            </button>

            <button
              style={secondaryButton}
              onClick={() => setShowCampaignsPanel(!showCampaignsPanel)}
            >
              🎯 Campanhas
            </button>

            <button
              style={secondaryButton}
              onClick={() => setShowAnalysisPanel(!showAnalysisPanel)}
            >
              📊 Análise
            </button>

            <button
              style={secondaryButton}
              onClick={() => {
                resetPartnerForm();
                setShowPartnerForm(!showPartnerForm);
              }}
            >
              + Adicionar banco/parceiro
            </button>
          </div>
        </header>

        <section style={summaryGrid}>
          <Summary title="Montante financiado" value={formatEuro(totals.amount)} />
          <Summary title="Comissão Teórica" value={formatEuro(totals.expected)} />
          <Summary title="Comissão Real" value={formatEuro(totals.received)} />
          <Summary title="Diferença" value={formatEuro(totals.difference)} />
          <Summary title="Comissão parceiros" value={formatEuro(totals.partnerPending)} />
          <Summary title="Comissões parceiros pagas" value={formatEuro(totals.partnerPaid)} />
          <Summary title="Margem líquida" value={formatEuro(totals.received - totals.partnerTotal)} />
        </section>

        {showPartnerForm && (
          <section style={formCard}>
            <h2 style={sectionTitle}>
              {editingPartnerId ? "Editar banco ou parceiro" : "Adicionar banco ou parceiro"}
            </h2>

            <form style={formGrid} onSubmit={savePartner}>
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

              <label style={fieldLabel}>Tipo comissão parceiro
                <select
                  style={input}
                  value={partnerForm.default_payment_type}
                  onChange={(event) =>
                    setPartnerForm({
                      ...partnerForm,
                      default_payment_type: event.target.value,
                    })
                  }
                >
                  <option value="percentagem">Percentagem sobre valor financiado</option>
                  <option value="valor fixo">Comissão fixa</option>
                </select>
              </label>

              {partnerForm.default_payment_type === "percentagem" ? (
                <label style={fieldLabel}>% parceiro por defeito
                  <input
                    style={input}
                    inputMode="decimal"
                    value={partnerForm.default_payment_rate}
                    onChange={(event) =>
                      setPartnerForm({
                        ...partnerForm,
                        default_payment_rate: event.target.value,
                      })
                    }
                    placeholder="Ex: 0,25"
                  />
                </label>
              ) : (
                <label style={fieldLabel}>Valor fixo por defeito
                  <input
                    style={input}
                    inputMode="decimal"
                    value={partnerForm.default_payment_value}
                    onChange={(event) =>
                      setPartnerForm({
                        ...partnerForm,
                        default_payment_value: event.target.value,
                      })
                    }
                    placeholder="Ex: 100"
                  />
                </label>
              )}

              <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>Notas
                <textarea style={textarea} value={partnerForm.notes} onChange={(event) => setPartnerForm({ ...partnerForm, notes: event.target.value })} />
              </label>

              <div style={formActions}>
                <button style={button} disabled={saving}>
                  {saving ? "A guardar..." : editingPartnerId ? "Guardar alterações" : "Guardar"}
                </button>

                {editingPartnerId && (
                  <button type="button" style={grayButton} onClick={resetPartnerForm}>
                    Cancelar edição
                  </button>
                )}
              </div>
            </form>
          </section>
        )}

        {showCruzadosRanking && (
          <section style={cruzadosPanel}>
            <div style={compactPanelHeader}>
              <div>
                <h2 style={sectionTitle}>🏆 Concurso Anual — {contestRules.name}</h2>
                <p style={muted}>
                  Concurso anual de parceiros. As regras são editáveis para poderes criar CRUZADOS 2027, 2028, etc.
                </p>
              </div>

              <button
                type="button"
                style={grayButton}
                onClick={() => setShowCruzadosRanking(false)}
              >
                Fechar
              </button>
            </div>

            <div style={contestToolbar}>
              <label style={fieldLabel}>
                Concurso
                <select
                  style={input}
                  value={selectedContestId}
                  onChange={(event) => selectContest(event.target.value)}
                >
                  {contests.map((contest) => (
                    <option key={contest.id} value={contest.id}>
                      {contest.name}
                    </option>
                  ))}
                  {contests.length === 0 && <option value="">Criar primeiro concurso</option>}
                </select>
              </label>

              <button type="button" style={secondaryButton} onClick={() => setShowContestEditor(!showContestEditor)}>
                {showContestEditor ? "Esconder regras" : "Editar regras"}
              </button>

              <button type="button" style={button} onClick={duplicateContestForNextYear}>
                Duplicar ano seguinte
              </button>
            </div>

            {showContestEditor && (
              <form style={contestFormGrid} onSubmit={saveContest}>
                <label style={fieldLabel}>Nome do concurso
                  <input style={input} value={contestForm.name} onChange={(event) => setContestForm({ ...contestForm, name: event.target.value })} />
                </label>

                <label style={fieldLabel}>Data início
                  <input type="date" style={input} value={contestForm.start_date} onChange={(event) => setContestForm({ ...contestForm, start_date: event.target.value })} />
                </label>

                <label style={fieldLabel}>Data fim
                  <input type="date" style={input} value={contestForm.end_date} onChange={(event) => setContestForm({ ...contestForm, end_date: event.target.value })} />
                </label>

                <label style={fieldLabel}>Montante mínimo
                  <input style={input} inputMode="decimal" value={contestForm.minimum_amount} onChange={(event) => setContestForm({ ...contestForm, minimum_amount: event.target.value })} />
                </label>

                <label style={fieldLabel}>Prémio 1º lugar
                  <input style={input} value={contestForm.prize_1} onChange={(event) => setContestForm({ ...contestForm, prize_1: event.target.value })} />
                </label>

                <label style={fieldLabel}>Custo 1º lugar
                  <input style={input} inputMode="decimal" value={contestForm.prize_1_amount} onChange={(event) => setContestForm({ ...contestForm, prize_1_amount: event.target.value })} />
                </label>

                <label style={fieldLabel}>Prémio 2º lugar
                  <input style={input} value={contestForm.prize_2} onChange={(event) => setContestForm({ ...contestForm, prize_2: event.target.value })} />
                </label>

                <label style={fieldLabel}>Custo 2º lugar
                  <input style={input} inputMode="decimal" value={contestForm.prize_2_amount} onChange={(event) => setContestForm({ ...contestForm, prize_2_amount: event.target.value })} />
                </label>

                <label style={fieldLabel}>Prémio 3º lugar
                  <input style={input} value={contestForm.prize_3} onChange={(event) => setContestForm({ ...contestForm, prize_3: event.target.value })} />
                </label>

                <label style={fieldLabel}>Custo 3º lugar
                  <input style={input} inputMode="decimal" value={contestForm.prize_3_amount} onChange={(event) => setContestForm({ ...contestForm, prize_3_amount: event.target.value })} />
                </label>

                <label style={fieldLabel}>Critério desempate
                  <input style={input} value={contestForm.tie_breaker} onChange={(event) => setContestForm({ ...contestForm, tie_breaker: event.target.value })} />
                </label>

                <div style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
                  Tipos elegíveis
                  <div style={checkboxGrid}>
                    {dealTypes.map((type) => (
                      <label key={type} style={checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={(contestForm.eligible_deal_types || []).includes(type)}
                          onChange={() => toggleContestDealType(type)}
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>

                <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>Notas / reporte
                  <textarea style={textarea} value={contestForm.report_notes} onChange={(event) => setContestForm({ ...contestForm, report_notes: event.target.value })} />
                </label>

                <button style={button} disabled={saving}>
                  {saving ? "A guardar..." : selectedContestId ? "Guardar regras" : "Criar concurso"}
                </button>
              </form>
            )}

            <div style={cruzadosRules}>
              <strong>Regras principais</strong>
              <span>Período: {formatDate(contestRules.start_date)} a {formatDate(contestRules.end_date)}.</span>
              <span>Apuramento mínimo: contratação de {formatEuro(parseDecimal(contestRules.minimum_amount))}.</span>
              <span>Tipos elegíveis: {(contestRules.eligible_deal_types || []).join(", ") || "-"}.</span>
              <span>Desempate: {contestRules.tie_breaker || "-"}.</span>
              <span>{contestRules.report_notes || ""}</span>
            </div>

            <div style={cruzadosPrizeGrid}>
              {cruzadosPrizes.map((prize) => (
                <div key={prize} style={cruzadosPrize}>
                  {prize}
                </div>
              ))}
            </div>

            {cruzadosRanking.length > 0 && (
              <div style={whatsappPanel}>
                <div>
                  <strong>WhatsApp quinzenal — Top 15</strong>
                  <p style={smallMuted}>
                    Mensagem individual: cada parceiro vê a sua posição e referências do 15º, 10º, 5º e 1º lugar, sem nomes dos restantes parceiros.
                  </p>
                </div>

                <div style={whatsappList}>
                  {cruzadosRanking.slice(0, 15).map((item, index) => {
                    const message = buildCruzadosWhatsappMessage(
                      item,
                      index + 1,
                      cruzadosRanking,
                      contestRules.name,
                      parseDecimal(contestRules.minimum_amount) || 580000
                    );
                    const url = buildWhatsappUrl(item.partnerPhone, message);

                    return (
                      <div key={item.partnerId} style={whatsappRow}>
                        <div>
                          <strong>{index + 1}º · {item.partnerName}</strong>
                          <span style={partnerMeta}>
                            {formatEuro(item.totalAmount)} contratado
                          </span>
                        </div>

                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            style={whatsappButton}
                          >
                            Enviar WhatsApp
                          </a>
                        ) : (
                          <span style={missingPhoneBadge}>Sem telefone</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {cruzadosRanking.length === 0 ? (
              <p style={muted}>Ainda não existem parceiros com negócios contratados elegíveis para o ranking.</p>
            ) : (
              <div style={rankingTable}>
                <div style={rankingHeader}>
                  <span>#</span>
                  <span>Parceiro</span>
                  <span>Total contratado</span>
                  <span>Negócios</span>
                  <span>Maior processo</span>
                  <span>Estado</span>
                </div>

                {cruzadosRanking.map((item, index) => (
                  <div key={item.partnerId} style={rankingRow}>
                    <strong>{index + 1}</strong>
                    <strong>{item.partnerName}</strong>
                    <span>{formatEuro(item.totalAmount)}</span>
                    <span>{item.dealsCount}</span>
                    <span>{formatEuro(item.biggestDeal)}</span>
                    <span style={item.eligible ? eligibleBadge : notEligibleBadge}>
                      {item.eligible
                        ? "Apurado"
                        : `Faltam ${formatEuro(
                            Math.max((parseDecimal(contestRules.minimum_amount) || 580000) - item.totalAmount, 0)
                          )}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {showAnalysisPanel && (
          <section style={analysisPanel}>
            <div style={compactPanelHeader}>
              <div>
                <h2 style={sectionTitle}>📊 Análise Financeira</h2>
                <p style={muted}>
                  Relatório por banco, por parceiro, campanhas, concursos e resultado líquido.
                </p>
              </div>

              <button type="button" style={grayButton} onClick={() => setShowAnalysisPanel(false)}>
                Fechar
              </button>
            </div>

            <section style={analysisSummaryGrid}>
              <Summary title="Processos" value={globalAnalysis.processCount} />
              <Summary title="Valor financiado" value={formatEuro(globalAnalysis.totalAmount)} />
              <Summary title="Comissão real" value={formatEuro(globalAnalysis.totalReceived)} />
              <Summary title="Comissões parceiros" value={formatEuro(globalAnalysis.totalPartnerPayments)} />
              <Summary title="Custos campanhas" value={formatEuro(globalAnalysis.totalCampaignCosts)} />
              <Summary title="Custos concursos" value={formatEuro(globalAnalysis.totalContestCosts)} />
              <Summary title="Resultado líquido" value={formatEuro(globalAnalysis.netResult)} />
            </section>

            <section style={analysisBlock}>
              <h3>🏦 Ficha relatório por banco</h3>

              {bankAnalysis.length === 0 ? (
                <p style={muted}>Sem bancos para analisar.</p>
              ) : (
                <div style={analysisCardGrid}>
                  {bankAnalysis.map((bank) => (
                    <article key={bank.key} style={analysisCard}>
                      <h4 style={analysisCardTitle}>{bank.name}</h4>

                      <div style={miniGrid}>
                        <Mini title="Processos" value={bank.processCount} />
                        <Mini title="Valor financiado" value={formatEuro(bank.totalAmount)} />
                        <Mini title="Comissão recebida" value={formatEuro(bank.receivedCommission)} />
                        <Mini title="Ticket médio" value={formatEuro(bank.processCount ? bank.totalAmount / bank.processCount : 0)} />
                      </div>

                      <div style={statusMiniGrid}>
                        {dealStatuses.map((status) => {
                          const statusData = bank.statusMap[status] || { count: 0, amount: 0 };

                          return (
                            <div key={status} style={statusMiniBox}>
                              <strong>{status}</strong>
                              <span>{statusData.count} proc.</span>
                              <span>{formatEuro(statusData.amount)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section style={analysisBlock}>
              <h3>🤝 Ficha relatório por parceiro</h3>

              {partnerAnalysis.length === 0 ? (
                <p style={muted}>Sem parceiros para analisar.</p>
              ) : (
                <div style={analysisCardGrid}>
                  {partnerAnalysis.map((partner) => (
                    <article key={partner.partnerId} style={analysisCard}>
                      <div style={partnerAnalysisHeader}>
                        <h4 style={analysisCardTitle}>{partner.name}</h4>
                        <span
                          style={{
                            ...classificationBadge,
                            color: partner.classification.color,
                            background: partner.classification.background,
                          }}
                        >
                          {partner.classification.label}
                        </span>
                      </div>

                      <div style={miniGrid}>
                        <Mini title="Processos" value={partner.processCount} />
                        <Mini title="Valor contratado" value={formatEuro(partner.contractedAmount)} />
                        <Mini title="Comissão real" value={formatEuro(partner.receivedCommission)} />
                        <Mini title="Comissões pagas" value={formatEuro(partner.partnerPayments)} />
                        <Mini title="Custos campanhas" value={formatEuro(partner.campaignCosts)} />
                        <Mini title="Custos concursos" value={formatEuro(partner.contestCosts)} />
                        <Mini title="Resultado líquido" value={formatEuro(partner.netResult)} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section style={analysisBlock}>
              <h3>🎯 Custos de campanhas</h3>

              {campaignCostAnalysis.length === 0 ? (
                <p style={muted}>Sem campanhas criadas.</p>
              ) : (
                <div style={analysisTable}>
                  <div style={analysisTableHeader}>
                    <span>Campanha</span>
                    <span>Objetivo</span>
                    <span>Premiados</span>
                    <span>Custo por premiado</span>
                    <span>Custo total</span>
                  </div>

                  {campaignCostAnalysis.map((campaign) => (
                    <div key={campaign.id} style={analysisTableRow}>
                      <strong>{campaign.name}</strong>
                      <span>{formatEuro(campaign.objective)}</span>
                      <span>{campaign.winners.length}</span>
                      <span>{formatEuro(campaign.costPerWinner)}</span>
                      <strong>{formatEuro(campaign.totalCost)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section style={analysisBlock}>
              <h3>🏆 Custos de concursos</h3>

              {contestCostAnalysis.length === 0 ? (
                <p style={muted}>Sem concursos criados.</p>
              ) : (
                <div style={analysisTable}>
                  <div style={analysisTableHeader}>
                    <span>Concurso</span>
                    <span>1º lugar</span>
                    <span>2º lugar</span>
                    <span>3º lugar</span>
                    <span>Custo total</span>
                  </div>

                  {contestCostAnalysis.map((contest) => (
                    <div key={contest.id} style={analysisTableRow}>
                      <strong>{contest.name}</strong>
                      <span>{formatEuro(contest.prize_1_amount)}</span>
                      <span>{formatEuro(contest.prize_2_amount)}</span>
                      <span>{formatEuro(contest.prize_3_amount)}</span>
                      <strong>{formatEuro(contest.totalCost)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>
        )}

        {showCampaignsPanel && (
          <section style={campaignPanel}>
            <div style={compactPanelHeader}>
              <div>
                <h2 style={sectionTitle}>🎯 Campanhas Sazonais</h2>
                <p style={muted}>
                  Campanhas temporárias com objetivo próprio, prémio próprio e ponto de situação por parceiro.
                </p>
              </div>

              <button type="button" style={grayButton} onClick={() => setShowCampaignsPanel(false)}>
                Fechar
              </button>
            </div>

            <div style={contestToolbar}>
              <label style={fieldLabel}>
                Campanha
                <select
                  style={input}
                  value={selectedCampaignId}
                  onChange={(event) => selectCampaign(event.target.value)}
                >
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                  {campaigns.length === 0 && <option value="">Criar primeira campanha</option>}
                </select>
              </label>

              <button type="button" style={secondaryButton} onClick={() => setShowCampaignEditor(!showCampaignEditor)}>
                {showCampaignEditor ? "Esconder campanha" : "Editar campanha"}
              </button>

              <button type="button" style={button} onClick={createNewCampaign}>
                Nova campanha
              </button>
            </div>

            {showCampaignEditor && (
              <form style={contestFormGrid} onSubmit={saveCampaign}>
                <label style={fieldLabel}>Nome da campanha
                  <input style={input} value={campaignForm.name} onChange={(event) => setCampaignForm({ ...campaignForm, name: event.target.value })} />
                </label>

                <label style={fieldLabel}>Data início
                  <input type="date" style={input} value={campaignForm.start_date} onChange={(event) => setCampaignForm({ ...campaignForm, start_date: event.target.value })} />
                </label>

                <label style={fieldLabel}>Data fim
                  <input type="date" style={input} value={campaignForm.end_date} onChange={(event) => setCampaignForm({ ...campaignForm, end_date: event.target.value })} />
                </label>

                <label style={fieldLabel}>Data limite contratação
                  <input type="date" style={input} value={campaignForm.contract_deadline} onChange={(event) => setCampaignForm({ ...campaignForm, contract_deadline: event.target.value })} />
                </label>

                <label style={fieldLabel}>Objetivo por parceiro
                  <input style={input} inputMode="decimal" value={campaignForm.objective_amount} onChange={(event) => setCampaignForm({ ...campaignForm, objective_amount: event.target.value })} />
                </label>

                <label style={fieldLabel}>Custo por premiado
                  <input style={input} inputMode="decimal" value={campaignForm.cost_per_winner} onChange={(event) => setCampaignForm({ ...campaignForm, cost_per_winner: event.target.value })} />
                </label>

                <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>Prémio
                  <textarea style={textarea} value={campaignForm.prize} onChange={(event) => setCampaignForm({ ...campaignForm, prize: event.target.value })} />
                </label>

                <div style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
                  Tipos elegíveis
                  <div style={checkboxGrid}>
                    {dealTypes.map((type) => (
                      <label key={type} style={checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={(campaignForm.eligible_deal_types || []).includes(type)}
                          onChange={() => toggleCampaignDealType(type)}
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>

                <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>Notas
                  <textarea style={textarea} value={campaignForm.notes} onChange={(event) => setCampaignForm({ ...campaignForm, notes: event.target.value })} />
                </label>

                <button style={button} disabled={saving}>
                  {saving ? "A guardar..." : selectedCampaignId ? "Guardar campanha" : "Criar campanha"}
                </button>
              </form>
            )}

            <div style={campaignSummaryGrid}>
              <Summary title="Objetivo por parceiro" value={formatEuro(parseDecimal(campaignRules.objective_amount))} />
              <Summary title="Participantes" value={campaignStats.participants} />
              <Summary title="Atingiram" value={campaignStats.achieved} />
              <Summary title="Perto (>=80%)" value={campaignStats.near} />
              <Summary title="Por atingir" value={campaignStats.pending} />
            </div>

            <div style={cruzadosRules}>
              <strong>{campaignRules.name}</strong>
              <span>Período: {formatDate(campaignRules.start_date)} a {formatDate(campaignRules.end_date)}.</span>
              <span>Contratados até: {formatDate(campaignRules.contract_deadline)}.</span>
              <span>Tipos elegíveis: {(campaignRules.eligible_deal_types || []).join(", ") || "-"}.</span>
              <span>Prémio: {campaignRules.prize || "-"}</span>
            </div>

            {campaignRanking.length === 0 ? (
              <p style={muted}>Ainda não existem parceiros com negócios contratados nesta campanha.</p>
            ) : (
              <div style={rankingTable}>
                <div style={campaignRankingHeader}>
                  <span>Parceiro</span>
                  <span>Contratado</span>
                  <span>Falta</span>
                  <span>%</span>
                  <span>Estado</span>
                  <span>WhatsApp</span>
                </div>

                {campaignRanking.map((item) => {
                  const campaignMessage = buildCampaignWhatsappMessage(item, {
                    name: campaignRules.name,
                    objective_amount: parseDecimal(campaignRules.objective_amount),
                    prize: campaignRules.prize,
                  });
                  const url = buildWhatsappUrl(item.partnerPhone, campaignMessage);

                  return (
                    <div key={item.partnerId} style={campaignRankingRow}>
                      <strong>{item.partnerName}</strong>
                      <span>{formatEuro(item.totalAmount)}</span>
                      <span>{formatEuro(item.missing)}</span>
                      <span>{item.progress.toFixed(1)}%</span>
                      <span style={item.achieved ? eligibleBadge : item.near ? nearBadge : notEligibleBadge}>
                        {item.achieved ? "Atingiu" : item.near ? "Perto" : "Por atingir"}
                      </span>
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" style={whatsappButton}>
                          WhatsApp
                        </a>
                      ) : (
                        <span style={missingPhoneBadge}>Sem telefone</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <section style={compactPanel}>
          <div style={compactPanelHeader}>
            <div>
              <h2 style={sectionTitle}>Bancos e parceiros</h2>
              <p style={muted}>
                Gestão compacta de bancos que pagam comissão e parceiros que trazem negócio.
              </p>
            </div>

            <button
              type="button"
              style={secondaryButton}
              onClick={() => setShowPartnersPanel(!showPartnersPanel)}
            >
              {showPartnersPanel ? "Esconder" : "Ver / editar"}
            </button>
          </div>

          <div style={compactStatsGrid}>
            <div style={compactStat}>
              <span style={summaryLabel}>Bancos ativos</span>
              <strong style={compactStatValue}>{bancos.length}</strong>
            </div>

            <div style={compactStat}>
              <span style={summaryLabel}>Parceiros ativos</span>
              <strong style={compactStatValue}>{parceiros.length}</strong>
            </div>

            <div style={compactStat}>
              <span style={summaryLabel}>Anulados</span>
              <strong style={compactStatValue}>{inactivePartners.length}</strong>
            </div>
          </div>

          {showPartnersPanel && (
            <>
              {partners.length === 0 ? (
                <p style={muted}>Ainda não existem bancos ou parceiros criados.</p>
              ) : (
                <div style={partnerManagementList}>
                  {partners.map((partner) => (
                    <div
                      key={partner.id}
                      style={{
                        ...partnerManagementRow,
                        ...(partner.is_active === false ? inactivePartnerCard : {}),
                      }}
                    >
                      <div>
                        <strong>{partner.name}</strong>
                        <span style={partnerMeta}>
                          {partner.partner_type || "-"} · {partner.is_active === false ? "Anulado" : "Ativo"} ·{" "}
                          {partner.default_payment_type === "valor fixo"
                            ? `${formatEuro(partner.default_payment_value)} fixa`
                            : `${Number(partner.default_payment_rate || 0)}% sobre valor financiado`}
                        </span>
                      </div>

                      <div style={partnerManagementActions}>
                        <button type="button" style={smallButton} onClick={() => openEditPartner(partner)}>
                          Editar
                        </button>

                        <button
                          type="button"
                          style={partner.is_active === false ? smallPaidButton : smallGrayButton}
                          onClick={() => togglePartnerActive(partner)}
                        >
                          {partner.is_active === false ? "Reativar" : "Anular"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

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
                  {bancos.map((partner) => (
                    <option key={partner.id} value={partner.id}>{partner.name}</option>
                  ))}
                  <option value="__novo_banco__">+ Adicionar novo banco</option>
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
                  onChange={(event) => selectSourcePartner(event.target.value)}
                >
                  <option value="">Sem parceiro de origem</option>
                  {parceiros.map((partner) => (
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

              <label style={fieldLabel}>% Comissão Banco
                <input style={input} inputMode="decimal" value={dealForm.commission_rate} onChange={(event) => updateDealForm({ ...dealForm, commission_rate: event.target.value })} placeholder="Ex: 1,25" />
              </label>

              <label style={fieldLabel}>Comissão Teórica
                <input style={readOnlyInput} inputMode="decimal" value={dealForm.expected_commission} readOnly />
              </label>

              <label style={fieldLabel}>Comissão Real
                <input style={input} inputMode="decimal" value={dealForm.received_commission} onChange={(event) => setDealForm({ ...dealForm, received_commission: event.target.value })} placeholder="Preenche quando o banco pagar" />
              </label>

              <div style={calculationBox}>
                <strong>Diferença</strong>
                <span>
                  {formatEuro(parseDecimal(dealForm.received_commission) - parseDecimal(dealForm.expected_commission))}
                </span>
              </div>

              <label style={fieldLabel}>Data recebimento comissão
                <input type="date" style={input} value={dealForm.commission_received_at} onChange={(event) => setDealForm({ ...dealForm, commission_received_at: event.target.value })} />
              </label>

              <label style={fieldLabel}>Pagamento parceiro
                <select style={input} value={dealForm.partner_payment_type} onChange={(event) => setDealForm({ ...dealForm, partner_payment_type: event.target.value })}>
                  <option value="percentagem">Percentagem sobre o valor financiado</option>
                  <option value="valor fixo">Valor fixo</option>
                </select>
              </label>

              <label style={fieldLabel}>% parceiro sobre valor financiado
                <input style={input} inputMode="decimal" value={dealForm.partner_payment_rate} onChange={(event) => setDealForm({ ...dealForm, partner_payment_rate: event.target.value })} />
              </label>

              {dealForm.partner_payment_type === "valor fixo" ? (
                <label style={fieldLabel}>Comissão fixa parceiro
                  <input style={input} inputMode="decimal" value={dealForm.partner_payment_value} onChange={(event) => setDealForm({ ...dealForm, partner_payment_value: event.target.value })} />
                </label>
              ) : (
                <div style={calculationBox}>
                  <strong>Comissão parceiro</strong>
                  <small>Calculada sobre o valor financiado, salvo comissão fixa.</small>
                  <span>
                    {formatEuro(
                      calculatePartnerPayment(
                        parseDecimal(dealForm.amount),
                        dealForm.partner_payment_type,
                        parseDecimal(dealForm.partner_payment_rate),
                        parseDecimal(dealForm.partner_payment_value)
                      )
                    )}
                  </span>
                </div>
              )}

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
                const partnerDue = calculatePartnerPayment(deal.amount, deal.partner_payment_type, deal.partner_payment_rate, deal.partner_payment_value);
                const difference = Number(deal.received_commission || 0) - Number(deal.expected_commission || 0);

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
                      <Mini title="Comissão Teórica" value={formatEuro(deal.expected_commission)} />
                      <Mini title="Comissão Real" value={formatEuro(deal.received_commission)} />
                      <Mini title="Diferença" value={formatEuro(difference)} />
                      <Mini title="Comissão parceiro" value={formatEuro(partnerDue)} />
                    </div>

                    <div style={infoGrid}>
                      <Info label="NIF" value={deal.client_nif || "-"} />
                      <Info label="Telefone" value={deal.client_phone || "-"} />
                      <Info label="Banco que paga" value={deal.bank_partner?.name || "-"} />
                      <Info label="Parceiro que trouxe o negócio" value={deal.source_partner?.name || "-"} />
                      <Info label="% Comissão Banco" value={`${Number(deal.commission_rate || 0)}%`} />
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

const page = { display: "flex", minHeight: "100vh", background: "#dcfce7", fontFamily: "Arial, sans-serif" };
const main = { flex: 1, padding: 40 };
const header = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, marginBottom: 28 };
const headerButtons = { display: "flex", gap: 10, flexWrap: "wrap" };
const title = { fontSize: 42, margin: 0 };
const subtitle = { color: "#6b7280", marginTop: 8, maxWidth: 780 };
const summaryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 24 };
const summaryBox = { background: "#f0fdf4", padding: 18, borderRadius: 16, display: "grid", gap: 8, boxShadow: "0 1px 4px rgba(22,101,52,0.16)" };
const summaryLabel = { color: "#6b7280", fontSize: 13, fontWeight: "bold" };
const summaryValue = { color: "#047857", fontSize: 24 };
const formCard = { background: "#f0fdf4", padding: 24, borderRadius: 18, marginBottom: 24, boxShadow: "0 1px 4px rgba(22,101,52,0.16)" };
const sectionTitle = { marginTop: 0 };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 };
const formActions = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
const fieldLabel = { display: "flex", flexDirection: "column", gap: 6, color: "#374151", fontWeight: "bold", fontSize: 13 };
const input = { padding: 12, borderRadius: 10, border: "1px solid #d1d5db", fontSize: 14, background: "#f0fdf4" };
const readOnlyInput = { ...input, background: "#dcfce7", fontWeight: "bold" };
const calculationBox = { background: "#dcfce7", border: "1px solid #86efac", borderRadius: 10, padding: 12, display: "grid", gap: 6, color: "#166534", fontWeight: "bold" };
const textarea = { padding: 12, borderRadius: 10, border: "1px solid #d1d5db", fontSize: 14, background: "#f0fdf4", minHeight: 90, fontFamily: "Arial, sans-serif" };
const button = { background: "#111827", color: "white", border: "none", padding: "12px 16px", borderRadius: 10, cursor: "pointer", fontWeight: "bold" };
const secondaryButton = { background: "#059669", color: "white", border: "none", padding: "12px 16px", borderRadius: 10, cursor: "pointer", fontWeight: "bold" };
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
const statusBadge = { background: "#bbf7d0", color: "#166534", padding: "7px 10px", borderRadius: 999, fontSize: 12, fontWeight: "bold" };
const miniGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 };
const miniBox = { background: "#f0fdf4", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, display: "grid", gap: 6 };
const infoGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 };
const infoBox = { background: "#f0fdf4", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, display: "grid", gap: 6 };
const notesBox = { background: "#f0fdf4", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, marginTop: 12 };
const actionRow = { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 };
const clientButton = { background: "#0f766e", color: "white", padding: "12px 16px", borderRadius: 10, textDecoration: "none", fontWeight: "bold" };
const muted = { color: "#6b7280" };
const smallMuted = { color: "#6b7280", fontSize: 12 };

const compactPanel = { background: "#f0fdf4", padding: 18, borderRadius: 18, marginBottom: 24, boxShadow: "0 1px 4px rgba(22,101,52,0.16)" };
const compactPanelHeader = { display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", marginBottom: 14 };
const compactStatsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 };
const compactStat = { background: "#dcfce7", border: "1px solid #86efac", borderRadius: 12, padding: 12, display: "grid", gap: 4 };
const compactStatValue = { color: "#047857", fontSize: 22 };
const partnerManagementList = { display: "grid", gap: 8, marginTop: 14 };
const partnerManagementRow = { background: "#ecfdf5", border: "1px solid #86efac", borderRadius: 12, padding: "10px 12px", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" };
const partnerMeta = { display: "block", marginTop: 4, color: "#6b7280", fontSize: 12 };
const inactivePartnerCard = { opacity: 0.55, background: "#f3f4f6", border: "1px solid #d1d5db" };
const partnerManagementActions = { display: "flex", gap: 8, flexWrap: "wrap" };
const smallButton = { background: "#059669", color: "white", border: "none", padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontSize: 12 };
const smallGrayButton = { background: "#6b7280", color: "white", border: "none", padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontSize: 12 };
const smallPaidButton = { background: "#16a34a", color: "white", border: "none", padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontSize: 12 };

const cruzadosPanel = { background: "#ecfeff", padding: 18, borderRadius: 18, marginBottom: 24, boxShadow: "0 1px 4px rgba(14,116,144,0.18)", border: "1px solid #67e8f9" };
const cruzadosRules = { background: "#cffafe", border: "1px solid #67e8f9", color: "#155e75", borderRadius: 14, padding: 14, display: "grid", gap: 6, marginBottom: 14 };
const cruzadosPrizeGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 16 };
const cruzadosPrize = { background: "#f0fdfa", border: "1px solid #5eead4", color: "#0f766e", borderRadius: 12, padding: 12, fontWeight: "bold" };
const rankingTable = { overflowX: "auto", display: "grid", gap: 6 };
const rankingHeader = { display: "grid", gridTemplateColumns: "50px 2fr 1.2fr 0.8fr 1.2fr 1.2fr", gap: 10, background: "#164e63", color: "white", padding: "10px 12px", borderRadius: 10, fontWeight: "bold", minWidth: 850 };
const rankingRow = { display: "grid", gridTemplateColumns: "50px 2fr 1.2fr 0.8fr 1.2fr 1.2fr", gap: 10, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 12px", borderRadius: 10, alignItems: "center", minWidth: 850 };
const eligibleBadge = { background: "#dcfce7", color: "#166534", borderRadius: 999, padding: "6px 10px", fontWeight: "bold", textAlign: "center" };
const notEligibleBadge = { background: "#fee2e2", color: "#991b1b", borderRadius: 999, padding: "6px 10px", fontWeight: "bold", textAlign: "center" };

const whatsappPanel = { background: "#f0fdfa", border: "1px solid #5eead4", borderRadius: 14, padding: 14, display: "grid", gap: 12, marginBottom: 16 };
const whatsappList = { display: "grid", gap: 8 };
const whatsappRow = { background: "white", border: "1px solid #ccfbf1", borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" };
const whatsappButton = { background: "#16a34a", color: "white", padding: "9px 12px", borderRadius: 8, textDecoration: "none", fontWeight: "bold", fontSize: 13 };
const missingPhoneBadge = { background: "#fee2e2", color: "#991b1b", padding: "7px 10px", borderRadius: 999, fontWeight: "bold", fontSize: 12 };

const contestToolbar = { display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "end", marginBottom: 14 };
const contestFormGrid = { background: "#f0fdfa", border: "1px solid #5eead4", borderRadius: 14, padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 14 };
const checkboxGrid = { display: "flex", flexWrap: "wrap", gap: 10 };
const checkboxLabel = { background: "#ecfeff", border: "1px solid #67e8f9", borderRadius: 999, padding: "8px 10px", display: "flex", gap: 6, alignItems: "center", fontWeight: "bold" };
const campaignPanel = { background: "#fefce8", padding: 18, borderRadius: 18, marginBottom: 24, boxShadow: "0 1px 4px rgba(202,138,4,0.18)", border: "1px solid #fde047" };
const campaignSummaryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 };
const campaignRankingHeader = { display: "grid", gridTemplateColumns: "2fr 1.2fr 1.2fr 0.8fr 1fr 1fr", gap: 10, background: "#713f12", color: "white", padding: "10px 12px", borderRadius: 10, fontWeight: "bold", minWidth: 850 };
const campaignRankingRow = { display: "grid", gridTemplateColumns: "2fr 1.2fr 1.2fr 0.8fr 1fr 1fr", gap: 10, background: "#fffbeb", border: "1px solid #fde68a", padding: "10px 12px", borderRadius: 10, alignItems: "center", minWidth: 850 };
const nearBadge = { background: "#fef3c7", color: "#92400e", borderRadius: 999, padding: "6px 10px", fontWeight: "bold", textAlign: "center" };

const analysisPanel = { background: "#f8fafc", padding: 18, borderRadius: 18, marginBottom: 24, boxShadow: "0 1px 4px rgba(15,23,42,0.16)", border: "1px solid #cbd5e1" };
const analysisSummaryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 18 };
const analysisBlock = { background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, marginBottom: 16 };
const analysisCardGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 14 };
const analysisCard = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14 };
const analysisCardTitle = { margin: "0 0 12px 0", fontSize: 20 };
const statusMiniGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginTop: 12 };
const statusMiniBox = { background: "white", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, display: "grid", gap: 4, fontSize: 12 };
const partnerAnalysisHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 };
const classificationBadge = { borderRadius: 999, padding: "7px 10px", fontWeight: "bold", fontSize: 12 };
const analysisTable = { display: "grid", gap: 6, overflowX: "auto" };
const analysisTableHeader = { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 10, background: "#0f172a", color: "white", padding: "10px 12px", borderRadius: 10, fontWeight: "bold", minWidth: 800 };
const analysisTableRow = { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 10, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 12px", borderRadius: 10, minWidth: 800 };
