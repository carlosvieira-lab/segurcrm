import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { useState } from "react";
import Sidebar from "../../components/Sidebar";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

const insurersList = [
  "GENERALI",
  "REAL VIDA",
  "ZURICH",
  "Ageas",
  "Allianz",
];

const branchList = [
  "AUTOMÓVEL",
  "CASA",
  "SAUDE",
  "ATCO",
  "ATCP",
  "MREMP",
  "VIDA",
  "APS",
  "FINANCEIROS",
  "VIAGEM",
  "CAES E GATOS",
  "OUTROS",
];

const defaultCommunicationTemplates = [
  {
    id: "default-anulacao-preco",
    code: "ANULACAO_PRECO",
    name: "Anulação por preço",
    category: "ANULAÇÕES",
    channel: "WHATSAPP",
    description: "Mensagem de recuperação e agradecimento após anulação por preço.",
    text: `Olá {PRIMEIRO_NOME},

Tomei conhecimento da anulação da sua apólice {NUMERO_APOLICE}, da {SEGURADORA}, relativa ao seu seguro {RAMO}{MATRICULA_TEXTO}.

Lamento não ter tido oportunidade de falar consigo antes dessa decisão, pois acredito que poderíamos ter analisado outras soluções que lhe permitissem manter o seguro connosco, mantendo a qualidade da proteção e, eventualmente, com uma solução mais competitiva.

Ainda assim, quero agradecer sinceramente a confiança que depositou em mim durante o período em que tive o privilégio de ser o seu mediador.

Continuarei totalmente disponível para o ajudar no futuro, seja em seguros, crédito habitação ou qualquer outra necessidade em que possa ser útil.

Espero voltar a merecer a sua confiança.

Muito obrigado e votos das maiores felicidades.

Carlos Vieira`,
  },
  {
    id: "default-renovacao-auto",
    code: "RENOVACAO_AUTOMOVEL",
    name: "Renovação Automóvel",
    category: "RENOVAÇÕES",
    channel: "WHATSAPP",
    description: "Aviso de renovação para apólice automóvel.",
    branch_hint: "AUTOMÓVEL",
    text: `Olá {PRIMEIRO_NOME},

A sua apólice {NUMERO_APOLICE}, da {SEGURADORA}, relativa ao seguro {RAMO}{MATRICULA_TEXTO}, tem renovação prevista para {RENOVACAO}.

Antes da renovação, posso rever consigo se as coberturas, capitais e preço continuam ajustados às suas necessidades.

Estou disponível para ajudar.

Carlos Vieira`,
  },
  {
    id: "default-documentos-auto",
    code: "PEDIDO_DOCUMENTOS_AUTOMOVEL",
    name: "Pedido de documentos Automóvel",
    category: "DOCUMENTOS",
    channel: "WHATSAPP",
    description: "Pedido de documentos para seguro automóvel.",
    branch_hint: "AUTOMÓVEL",
    text: `Olá {PRIMEIRO_NOME},

Para avançarmos com a análise do seu seguro automóvel{MATRICULA_TEXTO}, preciso que me envie, por favor, os documentos em falta.

Assim que receber tudo, trato do processo e dou-lhe feedback.

Obrigado.

Carlos Vieira`,
  },
];

export async function getServerSideProps({ params }) {
  const { id } = params;

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  const { data: policies } = await supabase
    .from("policies")
    .select("*, insurers(name)")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const { data: allPolicies } = await supabase
    .from("policies")
    .select("id, policy_number, insurer_id, client_id, status, branch, clients(id, name), insurers(name)");

  const { data: claims } = await supabase
    .from("claims")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });


  const { data: communicationTemplates } = await supabase
    .from("communication_templates")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  const { data: communicationLogs } = await supabase
    .from("communication_logs")
    .select("*, communication_templates(name, code, category, channel)")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  return {
    props: {
      client,
      policies: policies || [],
      allPolicies: allPolicies || [],
      claims: claims || [],
      tasks: tasks || [],
      opportunities: opportunities || [],
      communicationTemplates: communicationTemplates || [],
      communicationLogs: communicationLogs || [],
    },
  };
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
    .trim();

  if (!text) return 0;

  if (text.includes(",")) {
    return (
      Number(
        text
          .replace(/\./g, "")
          .replace(",", ".")
      ) || 0
    );
  }

  return Number(text) || 0;
}

function cleanNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  return parseDecimal(value);
}

function formatEuro(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function formatDecimalInput(value) {
  if (value === "" || value === null || value === undefined) return "";

  return new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatPercent(value) {
  return new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}
function calculateAge(date) {
  if (!date) return "-";

  const today = new Date();
  const birthDate = new Date(date);

  let age =
    today.getFullYear() -
    birthDate.getFullYear();

  const monthDifference =
    today.getMonth() -
    birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() <
        birthDate.getDate())
  ) {
    age--;
  }

  return age;
}
function addMonths(date, months) {
  const newDate = new Date(date);
  const originalDay = newDate.getDate();

  newDate.setMonth(newDate.getMonth() + months);

  if (newDate.getDate() < originalDay) {
    newDate.setDate(0);
  }

  return newDate;
}

function getPaymentIntervalMonths(frequency) {
  const value = String(frequency || "Mensal").toLowerCase();

  if (value === "trimestral") return 3;
  if (value === "semestral") return 6;
  if (value === "anual") return 12;

  return 1;
}

function calculateInitialNextPaymentDate(startDate, frequency) {
  if (!startDate) return null;

  const today = new Date();
  let nextDate = new Date(startDate);

  const monthsToAdd = getPaymentIntervalMonths(frequency);

  while (nextDate <= today) {
    nextDate = addMonths(nextDate, monthsToAdd);
  }

  return nextDate.toISOString().split("T")[0];
}

function calculateAnnualCommission(policy) {
  const commission = Number(policy.commission_per_payment || 0);
  const frequency = String(policy.payment_frequency || "anual").toLowerCase();

  if (frequency === "mensal") return commission * 12;
  if (frequency === "trimestral") return commission * 4;
  if (frequency === "semestral") return commission * 2;

  return commission;
}

function getFrequencyMultiplier(frequency) {
  const value = String(frequency || "anual").toLowerCase();

  if (value === "mensal") return 12;
  if (value === "trimestral") return 4;
  if (value === "semestral") return 2;

  return 1;
}

function calculateAnnualPremiumFromPayment(value, frequency) {
  const premiumPerPayment = parseDecimal(value);
  return premiumPerPayment * getFrequencyMultiplier(frequency);
}

function calculateAnnualCommissionFromPayment(value, frequency) {
  const commissionPerPayment = parseDecimal(value);
  return commissionPerPayment * getFrequencyMultiplier(frequency);
}

function calculateCommissionPercentage(annualPremium, annualCommission) {
  const premium = Number(annualPremium || 0);
  const commission = Number(annualCommission || 0);

  if (!premium || premium <= 0) return 0;

  return (commission / premium) * 100;
}

function calculatePremiumPerPayment(policy) {
  const annualPremium = Number(policy.annual_premium || 0);
  return annualPremium / getFrequencyMultiplier(policy.payment_frequency);
}

function clientRating(policies, totalCommission) {
  const count = policies.length;

  if (count >= 5 || totalCommission >= 150) return "TOP";
  if (count >= 4 || totalCommission >= 120) return "MUITO BOM";
  if (count >= 3 || totalCommission >= 100) return "BOM";
  if (count >= 2 || totalCommission >= 50) return "MÉDIO";
  if (count >= 1 || totalCommission >= 20) return "FRACO";

  return "SEM CARTEIRA";
}

function ratingStyle(rating) {
  if (rating === "TOP") {
    return {
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (rating === "MUITO BOM") {
    return {
      background: "#dbeafe",
      color: "#1d4ed8",
    };
  }

  if (rating === "BOM") {
    return {
      background: "#ede9fe",
      color: "#5b21b6",
    };
  }

  if (rating === "MÉDIO") {
    return {
      background: "#fef3c7",
      color: "#92400e",
    };
  }

  if (rating === "FRACO") {
    return {
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  return {
    background: "#f3f4f6",
    color: "#374151",
  };
}

const fundamentalBranches = [
  "AUTOMÓVEL",
  "CASA",
  "SAUDE",
  "VIDA",
];

function normalizeBranchName(branch) {
  return String(branch || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizePolicyNumber(value) {
  return String(value || "")
    .trim()
    .replace(/\s/g, "")
    .toUpperCase()
    .replace(/^0+/, "");
}

function isAutomobileBranch(branch) {
  return normalizeBranchName(branch) === "AUTOMOVEL";
}

function getFundamentalBranchStatus(policies) {
  const activeBranches = new Set(
    policies
      .filter((policy) => policy.status !== "anulada")
      .map((policy) => normalizeBranchName(policy.branch))
  );

  return fundamentalBranches.map((branch) => {
    const normalizedBranch = normalizeBranchName(branch);

    return {
      branch,
      hasPolicy: activeBranches.has(normalizedBranch),
    };
  });
}

function InfoItem({ label, value }) {
  return (
    <div style={infoItem}>
      <span style={infoLabel}>{label}</span>
      <strong style={infoValue}>{value || "-"}</strong>
    </div>
  );
}

function formatTimelineDate(date) {
  if (!date) return "Sem data";

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

function createTimeline(client, policies, tasks, opportunities, claims) {
  const items = [];

  if (client?.created_at) {
    items.push({
      date: client.created_at,
      type: "CLIENTE",
      title: "Cliente criado",
      description: client.name || "Ficha criada",
    });
  }

  String(client?.interactions || "")
    .split("\n")
    .forEach((line) => {
      const match = line.match(/^\[(.*?)\]\sNota rápida:\s(.*)$/);

      if (match && match[1] && match[2]) {
        items.push({
          date: match[1],
          type: "NOTA",
          title: "Nota rápida",
          description: match[2],
        });
      }
    });

  policies.forEach((policy) => {
    items.push({
      date: policy.created_at || policy.policy_issue_date || policy.start_date,
      type: "APÓLICE",
      title: `Apólice ${policy.branch || ""} registada no CRM`,
      description: `${policy.policy_number || "Sem nº"} · ${policy.insurers?.name || "Sem seguradora"} · Emissão: ${formatDate(policy.policy_issue_date)} · Início: ${formatDate(policy.start_date)}`,
    });

    if (policy.status === "anulada" && policy.cancelled_at) {
      items.push({
        date: policy.cancelled_at,
        type: "ANULAÇÃO",
        title: "Apólice anulada",
        description: `${policy.policy_number || "Sem nº"} · ${policy.branch || ""}`,
      });
    }

    if (policy.last_payment_date) {
      items.push({
        date: policy.last_payment_date,
        type: "PAGAMENTO",
        title: "Pagamento registado",
        description: `${policy.policy_number || "Sem nº"} · Próximo pagamento: ${formatDate(policy.next_payment_date)}`,
      });
    }
  });

  tasks.forEach((task) => {
    items.push({
      date: task.created_at || task.due_date,
      type: "TAREFA",
      title: task.status === "concluida" ? "Tarefa concluída" : "Tarefa criada",
      description: task.title || task.description || "Sem descrição",
    });
  });

  opportunities.forEach((opportunity) => {
    items.push({
      date: opportunity.created_at || opportunity.contact_date,
      type: "OPORTUNIDADE",
      title: `Oportunidade ${opportunity.status || "criada"}`,
      description: opportunity.insurance_type || opportunity.name || "Sem descrição",
    });
  });

  claims.forEach((claim) => {
    items.push({
      date: claim.created_at || claim.claim_date,
      type: "SINISTRO",
      title: "Sinistro registado",
      description: `${claim.claim_number || "Sem nº"} · ${claim.claim_branch || "Sem ramo"} · ${claim.status || "ABERTO"}`,
    });
  });

  return items
    .filter((item) => item.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function timelineStyle(type) {
  if (type === "APÓLICE") {
    return {
      background: "#dbeafe",
      color: "#1d4ed8",
    };
  }

  if (type === "TAREFA") {
    return {
      background: "#ede9fe",
      color: "#5b21b6",
    };
  }

  if (type === "OPORTUNIDADE") {
    return {
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (type === "SINISTRO" || type === "ANULAÇÃO") {
    return {
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  if (type === "PAGAMENTO") {
    return {
      background: "#fef3c7",
      color: "#92400e",
    };
  }

  if (type === "NOTA") {
    return {
      background: "#e5e7eb",
      color: "#374151",
    };
  }

  return {
    background: "#f3f4f6",
    color: "#374151",
  };
}

export default function ClientePage({
  client,
  policies,
  allPolicies,
  claims,
  tasks,
  opportunities,
  communicationTemplates,
  communicationLogs,
}) {
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [showPoliciesSummaryModal, setShowPoliciesSummaryModal] = useState(false);
  const [showCotModal, setShowCotModal] = useState(false);
  const [selectedCotPolicy, setSelectedCotPolicy] = useState(null);
  const [cotForm, setCotForm] = useState({
    generali_cot_reference: "",
    generali_cot_created_at: "",
    generali_cot_processed_at: "",
  });

  const [showPolicyEventModal, setShowPolicyEventModal] = useState(false);
  const [selectedEventPolicy, setSelectedEventPolicy] = useState(null);
  const [policyEventForm, setPolicyEventForm] = useState({
    type: "Desconto",
    event_date: new Date().toISOString().split("T")[0],
    description: "",
  });

  const [showCancelPolicyModal, setShowCancelPolicyModal] = useState(false);
  const [selectedCancelPolicy, setSelectedCancelPolicy] = useState(null);
  const [cancelPolicyForm, setCancelPolicyForm] = useState({
    cancelled_at: new Date().toISOString().split("T")[0],
    cancellation_reason: "Preço",
    cancellation_notes: "",
  });

  const [policyForm, setPolicyForm] = useState({
    policy_number: "",
    branch: "",
    license_plate: "",
    insurer_name: "",
    annual_premium: "",
    commission_per_payment: "",
    payment_frequency: "Mensal",
    policy_issue_date: "",
    start_date: "",
    renewal_date: "",
    last_payment_date: "",
  });

  const [policyDuplicateWarning, setPolicyDuplicateWarning] = useState(null);

  const [showCommercialCalculator, setShowCommercialCalculator] = useState(false);
  const [calculatorForm, setCalculatorForm] = useState({
    annual_premium: "",
    annual_commission: "",
    payment_frequency: "Mensal",
  });

  const [showEditPolicyForm, setShowEditPolicyForm] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState(null);

const [editPolicyForm, setEditPolicyForm] = useState({
  policy_number: "",
  branch: "",
  license_plate: "",
  insurer_name: "",
  annual_premium: "",
  commission_per_payment: "",
  payment_frequency: "Mensal",
  policy_issue_date: "",
  start_date: "",
  renewal_date: "",
  last_payment_date: "",
});

const [showEditClientForm, setShowEditClientForm] =
  useState(false);

const [clientForm, setClientForm] = useState({
  name: client?.name || "",
  nif: client?.nif || "",
  phone: client?.phone || "",
  email: client?.email || "",
  address: client?.address || "",
  city: client?.city || "",
  postal_code: client?.postal_code || "",
  birth_date: client?.birth_date || "",

  driving_license_start_date:
    client?.driving_license_start_date || "",

  iban: client?.iban || "",
  mortgage_interest: client?.mortgage_interest || "AINDA_NAO_SEI",
  notes: client?.notes || "",
  interactions: client?.interactions || "",
});

const availableCommunicationTemplates =
  Array.isArray(communicationTemplates) && communicationTemplates.length > 0
    ? communicationTemplates
    : defaultCommunicationTemplates;

const firstCommunicationTemplate =
  availableCommunicationTemplates[0] || defaultCommunicationTemplates[0];

const firstPolicyForCommunication =
  policies?.find((policy) => policy.status !== "anulada") || policies?.[0] || null;

const [selectedCommunicationCategory, setSelectedCommunicationCategory] =
  useState(firstCommunicationTemplate?.category || "");

const [selectedCommunicationTemplateId, setSelectedCommunicationTemplateId] =
  useState(firstCommunicationTemplate?.id || "");

const [selectedCommunicationPolicyId, setSelectedCommunicationPolicyId] =
  useState(firstPolicyForCommunication?.id || "");

const [communicationMessage, setCommunicationMessage] =
  useState("");

const [communicationObservations, setCommunicationObservations] =
  useState("");

const [emailSubject, setEmailSubject] =
  useState("");

const [quickNote, setQuickNote] =
  useState("");

  if (!client) {
    return <p>Cliente não encontrado.</p>;
  }

 function cleanPhoneNumber(phone) {
  return String(phone || "")
    .replace(/\D/g, "");
}

function getPhoneCallHref(phone) {
  const cleanPhone = cleanPhoneNumber(phone);

  if (!cleanPhone) return "#";

  const finalPhone = cleanPhone.startsWith("351")
    ? cleanPhone
    : `351${cleanPhone}`;

  return `tel:+${finalPhone}`;
}

function getTemplateText(template) {
  return (
    template?.text ||
    template?.body ||
    template?.message ||
    template?.content ||
    ""
  );
}

function getTemplateLabel(template) {
  return template?.name || template?.title || template?.code || "Template";
}

function getSelectedCommunicationTemplate() {
  return availableCommunicationTemplates.find(
    (template) => String(template.id) === String(selectedCommunicationTemplateId)
  ) || firstCommunicationTemplate;
}

function getSelectedCommunicationPolicy() {
  return policies.find(
    (policy) => String(policy.id) === String(selectedCommunicationPolicyId)
  ) || firstPolicyForCommunication;
}

function getFirstName(name) {
  return String(name || "")
    .trim()
    .split(" ")
    .filter(Boolean)[0] || String(name || "").trim();
}

function replaceCommunicationVariables(text, policy) {
  const licensePlate = String(policy?.license_plate || "").trim();

  const variables = {
    NOME: client.name || "",
    PRIMEIRO_NOME: getFirstName(client.name),
    TELEFONE: client.phone || "",
    EMAIL: client.email || "",
    NUMERO_APOLICE: policy?.policy_number || "",
    SEGURADORA: policy?.insurers?.name || "",
    RAMO: policy?.branch || "",
    MATRICULA: licensePlate,
    MATRICULA_TEXTO: licensePlate ? `, matrícula ${licensePlate}` : "",
    PREMIO: policy?.annual_premium ? formatEuro(policy.annual_premium) : "",
    RENOVACAO: policy?.renewal_date ? formatDate(policy.renewal_date) : "",
  };

  return String(text || "").replace(/\{([A-Z_]+)\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(variables, key)
      ? variables[key]
      : match;
  });
}

function applyCommunicationTemplate(templateId, policyId = selectedCommunicationPolicyId) {
  const template = availableCommunicationTemplates.find(
    (item) => String(item.id) === String(templateId)
  );

  const policy = policies.find(
    (item) => String(item.id) === String(policyId)
  ) || firstPolicyForCommunication;

  setSelectedCommunicationTemplateId(templateId);
  setSelectedCommunicationCategory(template?.category || "");
  setCommunicationMessage(
    replaceCommunicationVariables(getTemplateText(template), policy)
  );
  setEmailSubject(template?.name || template?.code || "Contacto");
}

function applyPolicyToCommunication(policyId) {
  setSelectedCommunicationPolicyId(policyId);

  const template = getSelectedCommunicationTemplate();
  const policy = policies.find(
    (item) => String(item.id) === String(policyId)
  ) || firstPolicyForCommunication;

  setCommunicationMessage(
    replaceCommunicationVariables(getTemplateText(template), policy)
  );
}

function getCommunicationCategories() {
  return Array.from(
    new Set(
      availableCommunicationTemplates
        .map((template) => template.category || "GERAL")
        .filter(Boolean)
    )
  );
}

function getFilteredCommunicationTemplates() {
  return availableCommunicationTemplates.filter((template) => {
    if (!selectedCommunicationCategory) return true;
    return String(template.category || "GERAL") === selectedCommunicationCategory;
  });
}

function getSuggestedCommunicationTemplates() {
  const branches = new Set(
    policies.map((policy) => normalizeBranchName(policy.branch))
  );

  return availableCommunicationTemplates.filter((template) => {
    const hint = normalizeBranchName(
      template.branch_hint || template.branch || template.ramo || ""
    );

    if (hint && branches.has(hint)) return true;

    const text = `${template.code || ""} ${template.name || ""} ${template.category || ""}`;

    if (branches.has("AUTOMOVEL")) {
      return /AUTO|AUTOMOVEL|ANULACAO|RENOVACAO|DOCUMENTOS/i.test(
        normalizeBranchName(text)
      );
    }

    return false;
  });
}

async function saveCommunicationLog(channel) {
  const template = getSelectedCommunicationTemplate();
  const policy = getSelectedCommunicationPolicy();

  const payloads = [
    {
      client_id: client.id,
      policy_id: policy?.id || null,
      policy_number: policy?.policy_number || null,
      template_id:
        String(template?.id || "").startsWith("default-") ? null : template?.id || null,
      template_code: template?.code || null,
      template_name: getTemplateLabel(template),
      category: template?.category || null,
      channel,
      message: communicationMessage,
      observations: communicationObservations || null,
      phone: client.phone || null,
      email: client.email || null,
    },
    {
      client_id: client.id,
      template_id:
        String(template?.id || "").startsWith("default-") ? null : template?.id || null,
      channel,
      message: communicationMessage,
      observations: communicationObservations || null,
    },
    {
      client_id: client.id,
      channel,
      message: communicationMessage,
    },
  ];

  for (const payload of payloads) {
    const { error } = await supabase
      .from("communication_logs")
      .insert(payload);

    if (!error) return true;
  }

  alert("Não foi possível gravar o histórico de comunicação. O envio vai abrir na mesma.");
  return false;
}

async function openWhatsApp() {
  const phone = cleanPhoneNumber(client.phone);

  if (!phone) {
    alert("Este cliente não tem telefone registado.");
    return;
  }

  if (!communicationMessage.trim()) {
    alert("Escreve a mensagem antes de abrir o WhatsApp.");
    return;
  }

  await saveCommunicationLog("WHATSAPP");

  const finalPhone = phone.startsWith("351")
    ? phone
    : `351${phone}`;

  const url =
    `https://wa.me/${finalPhone}?text=${encodeURIComponent(
      communicationMessage
    )}`;

  window.open(url, "_blank");
}

async function openEmail() {
  if (!client.email) {
    alert("Este cliente não tem email registado.");
    return;
  }

  if (!communicationMessage.trim()) {
    alert("Escreve a mensagem antes de abrir o email.");
    return;
  }

  await saveCommunicationLog("EMAIL");

  const subject =
    emailSubject.trim() || "Contacto";

  const url =
    `mailto:${client.email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(
      communicationMessage
    )}`;

  window.location.href = url;
}

 async function saveQuickNote(e) {
  e.preventDefault();

  if (!quickNote.trim()) {
    alert("Escreve a nota rápida.");
    return;
  }

  const now = new Date().toISOString();
  const noteLine = `[${now}] Nota rápida: ${quickNote.trim()}`;

  const previous = client.interactions || "";
  const next = previous
    ? `${noteLine}\n${previous}`
    : noteLine;

  const { error } = await supabase
    .from("clients")
    .update({
      interactions: next,
    })
    .eq("id", client.id);

  if (error) {
    alert(error.message);
    return;
  }

  window.location.reload();
}

 async function editClient() {
  setShowEditClientForm(true);

  setTimeout(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, 100);
}
async function saveClient(e) {
  e.preventDefault();

  const { error } = await supabase
    .from("clients")
    .update({
      name: clientForm.name,
      nif: clientForm.nif,
      phone: clientForm.phone,
      email: clientForm.email,
      address: clientForm.address,
      city: clientForm.city,
      postal_code: clientForm.postal_code,
      birth_date: clientForm.birth_date,

      driving_license_start_date:
        clientForm.driving_license_start_date,

      iban: clientForm.iban,
      mortgage_interest: clientForm.mortgage_interest,
      notes: clientForm.notes,
      interactions: clientForm.interactions,
    })
    .eq("id", client.id);

  if (error) {
    alert(error.message);
    return;
  }

  window.location.reload();
}
  function openCotModal(policy) {
    setSelectedCotPolicy(policy);
    setCotForm({
      generali_cot_reference: policy.generali_cot_reference || "COT-",
      generali_cot_created_at:
        policy.generali_cot_created_at || new Date().toISOString().split("T")[0],
      generali_cot_processed_at: policy.generali_cot_processed_at || "",
    });
    setShowCotModal(true);
  }

  function closeCotModal() {
    setShowCotModal(false);
    setSelectedCotPolicy(null);
    setCotForm({
      generali_cot_reference: "",
      generali_cot_created_at: "",
      generali_cot_processed_at: "",
    });
  }

  async function saveCot(e) {
    e.preventDefault();

    if (!selectedCotPolicy) {
      alert("Não foi possível identificar a apólice.");
      return;
    }

    const cleanReference = cotForm.generali_cot_reference.trim();

    if (!cleanReference) {
      alert("Preenche a referência COT.");
      return;
    }

    const { error } = await supabase
      .from("policies")
      .update({
        generali_cot_reference: cleanReference,
        generali_cot_created_at: cotForm.generali_cot_created_at || null,
        generali_cot_processed_at: cotForm.generali_cot_processed_at || null,
      })
      .eq("id", selectedCotPolicy.id);

    if (error) {
      alert(error.message);
      return;
    }

    closeCotModal();
    window.location.reload();
  }

  async function clearCot(policy) {
    const ok = window.confirm("Remover a COT desta apólice?");
    if (!ok) return;

    const { error } = await supabase
      .from("policies")
      .update({
        generali_cot_reference: null,
        generali_cot_created_at: null,
        generali_cot_processed_at: null,
      })
      .eq("id", policy.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function editPolicy(policy) {
    setEditingPolicyId(policy.id);
    setShowEditPolicyForm(true);
    setShowPolicyForm(false);
setTimeout(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, 100);
    setEditPolicyForm({
      policy_number: policy.policy_number || "",
      branch: policy.branch || "",
      license_plate: policy.license_plate || "",
      insurer_name: policy.insurers?.name || "",
      annual_premium: formatDecimalInput(calculatePremiumPerPayment(policy)),
      commission_per_payment: formatDecimalInput(policy.commission_per_payment),
      payment_frequency: policy.payment_frequency || "Mensal",
      policy_issue_date: policy.policy_issue_date || "",
      start_date: policy.start_date || "",
      renewal_date: policy.renewal_date || "",
      last_payment_date: policy.last_payment_date || "",
    });
  }

  async function updatePolicy(e) {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    if (!editingPolicyId) {
      alert("Não foi possível identificar a apólice.");
      return;
    }

    if (
      isAutomobileBranch(editPolicyForm.branch) &&
      !String(editPolicyForm.license_plate || "").trim()
    ) {
      alert("Nas apólices de ramo AUTOMÓVEL é obrigatório preencher a matrícula.");
      return;
    }

    let insurerId = null;

    if (editPolicyForm.insurer_name) {
      const { data: insurer, error: insurerError } = await supabase
        .from("insurers")
        .select("id")
        .ilike("name", editPolicyForm.insurer_name)
        .maybeSingle();

      if (insurerError) {
        alert(insurerError.message);
        return;
      }

      insurerId = insurer?.id || null;

      if (!insurerId) {
        alert(`Seguradora não encontrada: ${editPolicyForm.insurer_name}`);
        return;
      }
    }

    const cleanDate = (value) => {
      return value === "" ? null : value;
    };

    const updateData = {
      policy_number: editPolicyForm.policy_number,
      branch: editPolicyForm.branch,
      license_plate: editPolicyForm.license_plate,
      annual_premium: calculateAnnualPremiumFromPayment(editPolicyForm.annual_premium, editPolicyForm.payment_frequency),
      commission_per_payment: cleanNumber(editPolicyForm.commission_per_payment),
      payment_frequency: editPolicyForm.payment_frequency,
      policy_issue_date: cleanDate(editPolicyForm.policy_issue_date),
      start_date: cleanDate(editPolicyForm.start_date),
      renewal_date: cleanDate(editPolicyForm.renewal_date),
      last_payment_date: cleanDate(editPolicyForm.last_payment_date),
    };

    updateData.insurer_id = insurerId;

    const { error } = await supabase
      .from("policies")
      .update(updateData)
      .eq("id", editingPolicyId);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  function getPolicyEvents(policy) {
    if (Array.isArray(policy.policy_events)) {
      return policy.policy_events;
    }

    try {
      const parsed = JSON.parse(policy.policy_events || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function openPolicyEventModal(policy) {
    setSelectedEventPolicy(policy);
    setPolicyEventForm({
      type: "Desconto",
      event_date: new Date().toISOString().split("T")[0],
      description: "",
    });
    setShowPolicyEventModal(true);
  }

  function closePolicyEventModal() {
    setShowPolicyEventModal(false);
    setSelectedEventPolicy(null);
    setPolicyEventForm({
      type: "Desconto",
      event_date: new Date().toISOString().split("T")[0],
      description: "",
    });
  }

  async function savePolicyEvent(event) {
    event.preventDefault();

    if (!selectedEventPolicy) {
      alert("Não foi possível identificar a apólice.");
      return;
    }

    if (!policyEventForm.description.trim()) {
      alert("Escreve uma descrição para o movimento.");
      return;
    }

    const existingEvents = getPolicyEvents(selectedEventPolicy);

    const nextEvent = {
      id: `${Date.now()}`,
      type: policyEventForm.type,
      event_date: policyEventForm.event_date || new Date().toISOString().split("T")[0],
      description: policyEventForm.description.trim(),
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("policies")
      .update({
        policy_events: [nextEvent, ...existingEvents],
      })
      .eq("id", selectedEventPolicy.id);

    if (error) {
      alert(error.message);
      return;
    }

    closePolicyEventModal();
    window.location.reload();
  }

  async function deletePolicyEvent(policy, eventId) {
    const ok = window.confirm("Eliminar este movimento da apólice?");
    if (!ok) return;

    const nextEvents = getPolicyEvents(policy).filter(
      (event) => String(event.id) !== String(eventId)
    );

    const { error } = await supabase
      .from("policies")
      .update({
        policy_events: nextEvents,
      })
      .eq("id", policy.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  function openCancelPolicyModal(policy) {
    setSelectedCancelPolicy(policy);
    setCancelPolicyForm({
      cancelled_at: new Date().toISOString().split("T")[0],
      cancellation_reason: policy.cancellation_reason || "Preço",
      cancellation_notes: policy.cancellation_notes || "",
    });
    setShowCancelPolicyModal(true);
  }

  function closeCancelPolicyModal() {
    setShowCancelPolicyModal(false);
    setSelectedCancelPolicy(null);
    setCancelPolicyForm({
      cancelled_at: new Date().toISOString().split("T")[0],
      cancellation_reason: "Preço",
      cancellation_notes: "",
    });
  }

  async function confirmCancelPolicy(event) {
    event.preventDefault();

    if (!selectedCancelPolicy) {
      alert("Não foi possível identificar a apólice.");
      return;
    }

    if (!cancelPolicyForm.cancellation_reason) {
      alert("Escolhe o motivo da anulação.");
      return;
    }

    const { error } = await supabase
      .from("policies")
      .update({
        status: "anulada",
        cancelled_at: cancelPolicyForm.cancelled_at || new Date().toISOString().split("T")[0],
        cancellation_reason: cancelPolicyForm.cancellation_reason,
        cancellation_notes: cancelPolicyForm.cancellation_notes || null,
      })
      .eq("id", selectedCancelPolicy.id);

    if (error) {
      alert(error.message);
      return;
    }

    closeCancelPolicyModal();
    window.location.reload();
  }

  async function updatePolicyStatus(policyId, status) {
    if (status === "anulada") {
      const policy = policies.find((item) => item.id === policyId);

      if (!policy) {
        alert("Não foi possível identificar a apólice.");
        return;
      }

      openCancelPolicyModal(policy);
      return;
    }

    const { error } = await supabase
      .from("policies")
      .update({
        status,
        cancelled_at: null,
        cancellation_reason: null,
        cancellation_notes: null,
      })
      .eq("id", policyId);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function markPolicyPaid(policy) {
    try {
      const baseDate =
        policy.next_payment_date ||
        policy.start_date ||
        new Date().toISOString().split("T")[0];

      const monthsToAdd =
        getPaymentIntervalMonths(
          policy.payment_frequency
        );

      const nextPaymentDate =
        addMonths(
          baseDate,
          monthsToAdd
        )
          .toISOString()
          .split("T")[0];

      const today = new Date()
        .toISOString()
        .split("T")[0];

      const { error } = await supabase
        .from("policies")
        .update({
          last_payment_date: today,
          next_payment_date:
            nextPaymentDate,
        })
        .eq("id", policy.id);

      if (error) {
        alert(error.message);
        return;
      }

      window.location.reload();
    } catch (err) {
      console.log(err);
      alert(
        "Erro ao atualizar pagamento."
      );
    }
  }

  function calculatePaymentFromAnnual(value, frequency) {
    const annualValue = parseDecimal(value);
    const multiplier = getFrequencyMultiplier(frequency);

    if (!multiplier) return 0;

    return annualValue / multiplier;
  }

  function applyCalculatorToPolicyForm() {
    setPolicyForm({
      ...policyForm,
      annual_premium: formatDecimalInput(
        calculatePaymentFromAnnual(
          calculatorForm.annual_premium,
          calculatorForm.payment_frequency
        )
      ),
      commission_per_payment: formatDecimalInput(
        calculatePaymentFromAnnual(
          calculatorForm.annual_commission,
          calculatorForm.payment_frequency
        )
      ),
      payment_frequency: calculatorForm.payment_frequency,
    });

    setShowPolicyForm(true);
  }

  function checkPolicyDuplicate(policyNumber, insurerName) {
    const normalizedNewPolicy = normalizePolicyNumber(policyNumber);

    if (!normalizedNewPolicy) {
      setPolicyDuplicateWarning(null);
      return null;
    }

    const matches = (allPolicies || []).filter((policy) => {
      return normalizePolicyNumber(policy.policy_number) === normalizedNewPolicy;
    });

    if (matches.length === 0) {
      setPolicyDuplicateWarning(null);
      return null;
    }

    const sameInsurer = matches.find((policy) => {
      return (
        String(policy.insurers?.name || "").trim().toUpperCase() ===
        String(insurerName || "").trim().toUpperCase()
      );
    });

    const warning = {
      matches,
      sameInsurer: Boolean(sameInsurer),
      sameInsurerPolicy: sameInsurer || null,
    };

    setPolicyDuplicateWarning(warning);
    return warning;
  }

  async function createPolicy(e) {
    e.preventDefault();

    const duplicateWarning = checkPolicyDuplicate(
      policyForm.policy_number,
      policyForm.insurer_name
    );

    if (duplicateWarning?.sameInsurer) {
      alert(
        `Já existe uma apólice com este número na mesma seguradora.\n\nCliente: ${
          duplicateWarning.sameInsurerPolicy?.clients?.name || "-"
        }\nSeguradora: ${
          duplicateWarning.sameInsurerPolicy?.insurers?.name || "-"
        }\nEstado: ${
          duplicateWarning.sameInsurerPolicy?.status || "-"
        }\n\nA criação foi bloqueada para evitar duplicados.`
      );
      return;
    }

    if (duplicateWarning?.matches?.length > 0) {
      const proceed = window.confirm(
        "Atenção: já existe uma apólice com este número no CRM.\n\nA apólice encontrada pode ser de outra seguradora.\n\nQueres criar mesmo assim?"
      );

      if (!proceed) return;
    }

    if (
      isAutomobileBranch(policyForm.branch) &&
      !String(policyForm.license_plate || "").trim()
    ) {
      alert("Nas apólices de ramo AUTOMÓVEL é obrigatório preencher a matrícula.");
      return;
    }

    let insurerId = null;

    if (policyForm.insurer_name) {
      const { data: insurer, error: insurerError } = await supabase
        .from("insurers")
        .select("id")
        .ilike("name", policyForm.insurer_name)
        .maybeSingle();

      if (insurerError) {
        alert(insurerError.message);
        return;
      }

      insurerId = insurer?.id || null;

      if (!insurerId) {
        alert(`Seguradora não encontrada: ${policyForm.insurer_name}`);
        return;
      }
    }

    const cleanDate = (value) => {
      return value === "" ? null : value;
    };

    let renewalDate = null;

    if (policyForm.start_date) {
      const today = new Date();

      renewalDate = new Date(
        policyForm.start_date
      );

      while (renewalDate <= today) {
        renewalDate.setFullYear(
          renewalDate.getFullYear() + 1
        );
      }

      renewalDate = renewalDate
        .toISOString()
        .split("T")[0];
    }

    const nextPaymentDate =
      calculateInitialNextPaymentDate(
        policyForm.start_date,
        policyForm.payment_frequency
      );

    const { error } = await supabase.from("policies").insert({
      client_id: client.id,
      policy_number: policyForm.policy_number,
      branch: policyForm.branch,
      license_plate: policyForm.license_plate,
      insurer_id: insurerId,
      status: "ativa",
      annual_premium: calculateAnnualPremiumFromPayment(policyForm.annual_premium, policyForm.payment_frequency),
      commission_per_payment: cleanNumber(policyForm.commission_per_payment),
      payment_frequency: policyForm.payment_frequency,
      policy_issue_date: cleanDate(policyForm.policy_issue_date),
      start_date: cleanDate(policyForm.start_date),
      renewal_date: renewalDate,
      next_payment_date: nextPaymentDate,
    });

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  const activePolicies = policies.filter(
  (policy) => policy.status !== "anulada"
);

const cancelledPolicies = policies.filter(
  (policy) => policy.status === "anulada"
);

const openTasks = tasks.filter(
  (task) => task.status !== "concluida"
);

const scheduledTasks = openTasks.filter(
  (task) => task.due_date
);

const activeOpportunities = opportunities.filter(
  (opportunity) =>
    opportunity.status !== "ganho" &&
    opportunity.status !== "perdido"
);

const totalPremium = activePolicies.reduce(
  (sum, policy) => sum + Number(policy.annual_premium || 0),
  0
);

const totalCommission = activePolicies.reduce(
  (sum, policy) => sum + calculateAnnualCommission(policy),
  0
);

const rating = clientRating(activePolicies, totalCommission);
const fundamentalBranchStatus = getFundamentalBranchStatus(policies);
const missingFundamentalBranches = fundamentalBranchStatus.filter(
  (item) => !item.hasPolicy
);
const timelineItems = createTimeline(
  client,
  policies,
  tasks,
  opportunities,
  claims
);

  return (
    <div style={page}>
      <Sidebar />

      <main style={main}>
        <div style={header}>
          <div>
            <h1 style={title}>{client.name}</h1>
            <p style={subtitle}>NIF: {client.nif || "Sem NIF"}</p>
          </div>

          <div style={headerButtons}>
            <button style={editClientButton} onClick={editClient}>
              Editar cliente
            </button>

            <button
              style={policiesSummaryButton}
              onClick={() => setShowPoliciesSummaryModal(true)}
            >
              📄 Resumo Apólices
            </button>

            {client.phone && (
              <a
                href={getPhoneCallHref(client.phone)}
                style={callButton}
              >
                📞 Ligar
              </a>
            )}

            <Link
              href={`/tarefas/compacto?cliente=${client.id}&origem=cliente`}
              style={taskShortcutButton}
            >
              + Nova tarefa
            </Link>

            <Link
              href={`/oportunidades?cliente=${client.id}`}
              style={opportunityShortcutButton}
            >
              + Nova oportunidade
            </Link>

            <button style={button} onClick={() => setShowPolicyForm(true)}>
              + Nova Apólice
            </button>

            <button
              style={calculatorShortcutButton}
              onClick={() => setShowCommercialCalculator(!showCommercialCalculator)}
            >
              🧮 Calculadora
            </button>
          </div>
        </div>

        {showPolicyEventModal && selectedEventPolicy && (
          <div style={modalOverlay}>
            <section style={policyEventModal}>
              <div style={modalHeader}>
                <div>
                  <h2 style={modalTitle}>📝 Movimento da apólice</h2>
                  <p style={modalSubtitle}>
                    {selectedEventPolicy.policy_number || "Sem nº"} ·{" "}
                    {selectedEventPolicy.branch || "Sem ramo"}
                  </p>
                </div>

                <button
                  type="button"
                  style={cancelButton}
                  onClick={closePolicyEventModal}
                >
                  Fechar
                </button>
              </div>

              <form onSubmit={savePolicyEvent} style={policyEventFormGrid}>
                <label style={fieldLabel}>
                  Tipo de movimento
                  <select
                    style={input}
                    value={policyEventForm.type}
                    onChange={(event) =>
                      setPolicyEventForm({
                        ...policyEventForm,
                        type: event.target.value,
                      })
                    }
                  >
                    <option value="Desconto">Desconto</option>
                    <option value="Alteração de módulo">Alteração de módulo</option>
                    <option value="Alteração de capital">Alteração de capital</option>
                    <option value="Alteração de franquia">Alteração de franquia</option>
                    <option value="Pedido à seguradora">Pedido à seguradora</option>
                    <option value="Resposta da seguradora">Resposta da seguradora</option>
                    <option value="Observação">Observação</option>
                  </select>
                </label>

                <label style={fieldLabel}>
                  Data
                  <input
                    style={input}
                    type="date"
                    value={policyEventForm.event_date}
                    onChange={(event) =>
                      setPolicyEventForm({
                        ...policyEventForm,
                        event_date: event.target.value,
                      })
                    }
                  />
                </label>

                <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
                  Descrição
                  <textarea
                    style={policyEventTextarea}
                    value={policyEventForm.description}
                    onChange={(event) =>
                      setPolicyEventForm({
                        ...policyEventForm,
                        description: event.target.value,
                      })
                    }
                    placeholder="Ex: Desconto de 7,5% concedido em 18/06/2026; alteração para módulo X; pedido enviado à seguradora..."
                    required
                  />
                </label>

                <div style={formButtons}>
                  <button type="submit" style={policyEventSaveButton}>
                    Guardar movimento
                  </button>

                  <button
                    type="button"
                    style={cancelButton}
                    onClick={closePolicyEventModal}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {showCancelPolicyModal && selectedCancelPolicy && (
          <div style={modalOverlay}>
            <section style={cancelPolicyModal}>
              <div style={modalHeader}>
                <div>
                  <h2 style={modalTitle}>🚫 Anular apólice</h2>
                  <p style={modalSubtitle}>
                    {selectedCancelPolicy.policy_number || "Sem nº"} ·{" "}
                    {selectedCancelPolicy.branch || "Sem ramo"}
                  </p>
                </div>

                <button
                  type="button"
                  style={cancelButton}
                  onClick={closeCancelPolicyModal}
                >
                  Fechar
                </button>
              </div>

              <form onSubmit={confirmCancelPolicy} style={policyEventFormGrid}>
                <label style={fieldLabel}>
                  Data de anulação
                  <input
                    style={input}
                    type="date"
                    value={cancelPolicyForm.cancelled_at}
                    onChange={(event) =>
                      setCancelPolicyForm({
                        ...cancelPolicyForm,
                        cancelled_at: event.target.value,
                      })
                    }
                  />
                </label>

                <label style={fieldLabel}>
                  Motivo
                  <select
                    style={input}
                    value={cancelPolicyForm.cancellation_reason}
                    onChange={(event) =>
                      setCancelPolicyForm({
                        ...cancelPolicyForm,
                        cancellation_reason: event.target.value,
                      })
                    }
                    required
                  >
                    <option value="Preço">Preço</option>
                    <option value="Inexistência do objeto seguro">
                      Inexistência do objeto seguro
                    </option>
                    <option value="Troca de companhia">Troca de companhia</option>
                    <option value="Substituição">Substituição</option>
                    <option value="Falta de pagamento">Falta de pagamento</option>
                    <option value="Pedido do cliente">Pedido do cliente</option>
                    <option value="Outro">Outro</option>
                  </select>
                </label>

                <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
                  Observação
                  <textarea
                    style={policyEventTextarea}
                    value={cancelPolicyForm.cancellation_notes}
                    onChange={(event) =>
                      setCancelPolicyForm({
                        ...cancelPolicyForm,
                        cancellation_notes: event.target.value,
                      })
                    }
                    placeholder="Ex: cliente mudou por preço; veículo vendido; substituída pela apólice X..."
                  />
                </label>

                <div style={formButtons}>
                  <button type="submit" style={confirmCancelPolicyButton}>
                    Confirmar anulação
                  </button>

                  <button
                    type="button"
                    style={cancelButton}
                    onClick={closeCancelPolicyModal}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {showPoliciesSummaryModal && (
          <div style={modalOverlay}>
            <section style={policiesSummaryModal}>
              <div style={modalHeader}>
                <div>
                  <h2 style={modalTitle}>📄 Resumo de apólices em vigor</h2>
                  <p style={modalSubtitle}>
                    {client.name} · {activePolicies.length} apólice(s) em vigor
                  </p>
                </div>

                <button
                  type="button"
                  style={cancelButton}
                  onClick={() => setShowPoliciesSummaryModal(false)}
                >
                  Fechar
                </button>
              </div>

              {activePolicies.length === 0 ? (
                <p>Este cliente não tem apólices em vigor.</p>
              ) : (
                <div style={summaryTableWrap}>
                  <table style={summaryTable}>
                    <thead>
                      <tr>
                        <th style={summaryTh}>Nº Apólice</th>
                        <th style={summaryTh}>Seguradora</th>
                        <th style={summaryTh}>Ramo</th>
                        <th style={summaryTh}>Vencimento anual</th>
                        <th style={summaryTh}>Ações</th>
                      </tr>
                    </thead>

                    <tbody>
                      {activePolicies.map((policy) => (
                        <tr key={policy.id}>
                          <td style={summaryTd}>
                            {policy.policy_number || "-"}
                          </td>

                          <td style={summaryTd}>
                            {policy.insurers?.name || "-"}
                          </td>

                          <td style={summaryTd}>
                            {policy.branch || "-"}
                          </td>

                          <td style={summaryTd}>
                            {formatDate(policy.renewal_date)}
                          </td>

                          <td style={summaryTd}>
                            <a
                              href={`#apolice-${policy.id}`}
                              style={summaryOpenButton}
                              onClick={() => setShowPoliciesSummaryModal(false)}
                            >
                              🔍 Ver
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

{showEditClientForm && (
  <section
    style={{
      ...card,
      background:
        "linear-gradient(135deg, #dbeafe, #eff6ff)",
      border: "1px solid #bfdbfe",
    }}
  >
    <h2>Editar Cliente</h2>

    <form
      onSubmit={saveClient}
      style={formGrid}
    >
      <input
        style={input}
        placeholder="Nome"
        value={clientForm.name}
        onChange={(e) =>
          setClientForm({
            ...clientForm,
            name: e.target.value,
          })
        }
      />

      <input
        style={input}
        placeholder="NIF"
        value={clientForm.nif}
        onChange={(e) =>
          setClientForm({
            ...clientForm,
            nif: e.target.value,
          })
        }
      />

      <input
        style={input}
        placeholder="Telefone"
        value={clientForm.phone}
        onChange={(e) =>
          setClientForm({
            ...clientForm,
            phone: e.target.value,
          })
        }
      />

      <input
        style={input}
        placeholder="Email"
        value={clientForm.email}
        onChange={(e) =>
          setClientForm({
            ...clientForm,
            email: e.target.value,
          })
        }
      />

      <input
        style={input}
        placeholder="Morada"
        value={clientForm.address}
        onChange={(e) =>
          setClientForm({
            ...clientForm,
            address: e.target.value,
          })
        }
      />

      <input
        style={input}
        placeholder="Cidade"
        value={clientForm.city}
        onChange={(e) =>
          setClientForm({
            ...clientForm,
            city: e.target.value,
          })
        }
      />

      <input
        style={input}
        placeholder="Código Postal"
        value={clientForm.postal_code}
        onChange={(e) =>
          setClientForm({
            ...clientForm,
            postal_code:
              e.target.value,
          })
        }
      />

      <input
        style={input}
        type="date"
        value={clientForm.birth_date}
        onChange={(e) =>
          setClientForm({
            ...clientForm,
            birth_date:
              e.target.value,
          })
        }
      />

      <input
        style={input}
        type="date"
        value={clientForm.driving_license_start_date}
        onChange={(e) =>
          setClientForm({
            ...clientForm,
            driving_license_start_date:
              e.target.value,
          })
        }
      />

      <input
        style={input}
        placeholder="IBAN"
        value={clientForm.iban}
        onChange={(e) =>
          setClientForm({
            ...clientForm,
            iban: e.target.value,
          })
        }
      />

      <label style={fieldLabel}>
        Crédito Habitação
        <select
          style={mortgageSelectInput}
          value={clientForm.mortgage_interest || "AINDA_NAO_SEI"}
          onChange={(e) =>
            setClientForm({
              ...clientForm,
              mortgage_interest: e.target.value,
            })
          }
        >
          <option value="SIM">SIM</option>
          <option value="NAO">NÃO</option>
          <option value="AINDA_NAO_SEI">AINDA NÃO SEI</option>
        </select>
      </label>

      <textarea
        style={{
          ...input,
          minHeight: 100,
          gridColumn: "1 / -1",
        }}
        placeholder="Observações"
        value={clientForm.notes}
        onChange={(e) =>
          setClientForm({
            ...clientForm,
            notes: e.target.value,
          })
        }
      />

      <textarea
        style={{
          ...input,
          minHeight: 140,
          gridColumn: "1 / -1",
        }}
        placeholder="Histórico interações"
        value={clientForm.interactions}
        onChange={(e) =>
          setClientForm({
            ...clientForm,
            interactions:
              e.target.value,
          })
        }
      />

      <div style={formButtons}>
        <button
          type="submit"
          style={button}
        >
          Guardar Cliente
        </button>

        <button
          type="button"
          style={cancelButton}
          onClick={() =>
            setShowEditClientForm(false)
          }
        >
          Cancelar
        </button>
      </div>
    </form>
  </section>
)}
        {showCotModal && selectedCotPolicy && (
          <div style={modalOverlay}>
            <section style={cotModal}>
              <div style={modalHeader}>
                <div>
                  <h2 style={modalTitle}>🟠 COT Generali</h2>
                  <p style={modalSubtitle}>
                    {selectedCotPolicy.policy_number || "Sem nº apólice"} ·{" "}
                    {selectedCotPolicy.branch || "Sem ramo"}
                  </p>
                </div>

                <button
                  type="button"
                  style={cancelButton}
                  onClick={closeCotModal}
                >
                  Fechar
                </button>
              </div>

              <form onSubmit={saveCot} style={cotFormGrid}>
                <label style={fieldLabel}>
                  Referência COT
                  <input
                    style={input}
                    value={cotForm.generali_cot_reference}
                    onChange={(e) =>
                      setCotForm({
                        ...cotForm,
                        generali_cot_reference: e.target.value,
                      })
                    }
                    placeholder="COT-xxxxxxxx"
                    required
                  />
                </label>

                <label style={fieldLabel}>
                  Data criação COT
                  <input
                    style={input}
                    type="date"
                    value={cotForm.generali_cot_created_at}
                    onChange={(e) =>
                      setCotForm({
                        ...cotForm,
                        generali_cot_created_at: e.target.value,
                      })
                    }
                  />
                </label>

                <label style={fieldLabel}>
                  Data pedido processamento
                  <input
                    style={input}
                    type="date"
                    value={cotForm.generali_cot_processed_at}
                    onChange={(e) =>
                      setCotForm({
                        ...cotForm,
                        generali_cot_processed_at: e.target.value,
                      })
                    }
                  />
                </label>

                <div style={formButtons}>
                  <button type="submit" style={cotSaveButton}>
                    Guardar COT
                  </button>

                  <button
                    type="button"
                    style={cancelButton}
                    onClick={closeCotModal}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {showCommercialCalculator && (
          <section style={calculatorCard}>
            <div style={calculatorHeader}>
              <div>
                <h2 style={sectionTitle}>🧮 Calculadora Comercial</h2>
                <p style={calculatorSubtitle}>
                  Calcula prémio por pagamento, comissão por pagamento e percentagem de comissão antes de criar a apólice.
                </p>
              </div>

              <button
                type="button"
                style={cancelButton}
                onClick={() => setShowCommercialCalculator(false)}
              >
                Fechar
              </button>
            </div>

            <div style={calculatorGrid}>
              <div style={calculatorBox}>
                <label style={fieldLabel}>
                  Prémio anual
                  <input
                    style={input}
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 1200,00"
                    value={calculatorForm.annual_premium}
                    onChange={(e) =>
                      setCalculatorForm({
                        ...calculatorForm,
                        annual_premium: e.target.value,
                      })
                    }
                  />
                </label>

                <label style={fieldLabel}>
                  Fracionamento
                  <select
                    style={input}
                    value={calculatorForm.payment_frequency}
                    onChange={(e) =>
                      setCalculatorForm({
                        ...calculatorForm,
                        payment_frequency: e.target.value,
                      })
                    }
                  >
                    <option value="Mensal">Mensal</option>
                    <option value="Trimestral">Trimestral</option>
                    <option value="Semestral">Semestral</option>
                    <option value="Anual">Anual</option>
                  </select>
                </label>

                <div style={calculatorResult}>
                  <span>Prémio por pagamento</span>
                  <strong>
                    {formatEuro(
                      calculatePaymentFromAnnual(
                        calculatorForm.annual_premium,
                        calculatorForm.payment_frequency
                      )
                    )}
                  </strong>
                </div>
              </div>

              <div style={calculatorBox}>
                <label style={fieldLabel}>
                  Comissão anual
                  <input
                    style={input}
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 180,00"
                    value={calculatorForm.annual_commission}
                    onChange={(e) =>
                      setCalculatorForm({
                        ...calculatorForm,
                        annual_commission: e.target.value,
                      })
                    }
                  />
                </label>

                <div style={calculatorResult}>
                  <span>Comissão por pagamento</span>
                  <strong>
                    {formatEuro(
                      calculatePaymentFromAnnual(
                        calculatorForm.annual_commission,
                        calculatorForm.payment_frequency
                      )
                    )}
                  </strong>
                </div>

                <div style={calculatorResultPurple}>
                  <span>Percentagem de comissão</span>
                  <strong>
                    {formatPercent(
                      calculateCommissionPercentage(
                        parseDecimal(calculatorForm.annual_premium),
                        parseDecimal(calculatorForm.annual_commission)
                      )
                    )}
                    %
                  </strong>
                </div>
              </div>

              <div style={calculatorBox}>
                <h3 style={{ marginTop: 0 }}>Resumo para aplicar</h3>

                <div style={calculatorSummaryLine}>
                  <span>Fracionamento</span>
                  <strong>{calculatorForm.payment_frequency}</strong>
                </div>

                <div style={calculatorSummaryLine}>
                  <span>Prémio por pagamento</span>
                  <strong>
                    {formatEuro(
                      calculatePaymentFromAnnual(
                        calculatorForm.annual_premium,
                        calculatorForm.payment_frequency
                      )
                    )}
                  </strong>
                </div>

                <div style={calculatorSummaryLine}>
                  <span>Comissão por pagamento</span>
                  <strong>
                    {formatEuro(
                      calculatePaymentFromAnnual(
                        calculatorForm.annual_commission,
                        calculatorForm.payment_frequency
                      )
                    )}
                  </strong>
                </div>

                <button
                  type="button"
                  style={applyCalculatorButton}
                  onClick={applyCalculatorToPolicyForm}
                >
                  Aplicar ao formulário da apólice
                </button>
              </div>
            </div>
          </section>
        )}

        {showPolicyForm && (
          <section style={card}>
            <h2>Nova Apólice</h2>

            <form onSubmit={createPolicy} style={formGrid}>
              <input
                style={input}
                placeholder="Número da apólice"
                value={policyForm.policy_number}
                onChange={(e) => {
                  const nextForm = {
                    ...policyForm,
                    policy_number: e.target.value,
                  };

                  setPolicyForm(nextForm);
                }}
                onBlur={() =>
                  checkPolicyDuplicate(
                    policyForm.policy_number,
                    policyForm.insurer_name
                  )
                }
                required
              />

              <select
                style={input}
                value={policyForm.branch}
                onChange={(e) =>
                  setPolicyForm({
                    ...policyForm,
                    branch: e.target.value,
                  })
                }
                required
              >
                <option value="">Selecionar ramo</option>
                {branchList.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>

              <input
                style={{
                  ...input,
                  ...(isAutomobileBranch(policyForm.branch) &&
                  !String(policyForm.license_plate || "").trim()
                    ? requiredAutoInput
                    : {}),
                }}
                placeholder={
                  isAutomobileBranch(policyForm.branch)
                    ? "Matrícula obrigatória"
                    : "Matrícula"
                }
                value={policyForm.license_plate}
                onChange={(e) =>
                  setPolicyForm({
                    ...policyForm,
                    license_plate: e.target.value,
                  })
                }
                required={isAutomobileBranch(policyForm.branch)}
              />

              {isAutomobileBranch(policyForm.branch) &&
                !String(policyForm.license_plate || "").trim() && (
                  <div style={autoPlateWarning}>
                    ⚠ Matrícula obrigatória para apólices AUTOMÓVEL.
                  </div>
                )}

              <select
                style={input}
                value={policyForm.insurer_name}
                onChange={(e) => {
                  const nextForm = {
                    ...policyForm,
                    insurer_name: e.target.value,
                  };

                  setPolicyForm(nextForm);

                  checkPolicyDuplicate(
                    nextForm.policy_number,
                    nextForm.insurer_name
                  );
                }}
                required
              >
                <option value="">Selecionar seguradora</option>
                {insurersList.map((insurer) => (
                  <option key={insurer} value={insurer}>
                    {insurer}
                  </option>
                ))}
              </select>

              {policyDuplicateWarning && (
                <div
                  style={{
                    ...duplicateWarningBox,
                    ...(policyDuplicateWarning.sameInsurer
                      ? duplicateWarningDanger
                      : {}),
                  }}
                >
                  <strong>
                    {policyDuplicateWarning.sameInsurer
                      ? "❌ Apólice já existe nesta seguradora"
                      : "⚠️ Número de apólice já existe no CRM"}
                  </strong>

                  <div style={duplicateWarningList}>
                    {policyDuplicateWarning.matches.map((match) => (
                      <div key={match.id} style={duplicateWarningItem}>
                        <span>
                          <strong>Cliente:</strong>{" "}
                          {match.clients?.name || "-"}
                        </span>

                        <span>
                          <strong>Seguradora:</strong>{" "}
                          {match.insurers?.name || "-"}
                        </span>

                        <span>
                          <strong>Estado:</strong>{" "}
                          {match.status || "-"}
                        </span>

                        <Link
                          href={`/clientes/${match.client_id}`}
                          style={duplicateWarningLink}
                        >
                          Abrir cliente
                        </Link>
                      </div>
                    ))}
                  </div>

                  <p style={duplicateWarningText}>
                    {policyDuplicateWarning.sameInsurer
                      ? "A criação desta apólice será bloqueada para evitar duplicados."
                      : "Se for uma apólice de outra seguradora, podes continuar após confirmação."}
                  </p>
                </div>
              )}

              <input
                style={input}
                type="text"
                inputMode="decimal"
                placeholder="Prémio comercial do período"
                value={policyForm.annual_premium}
                onChange={(e) =>
                  setPolicyForm({
                    ...policyForm,
                    annual_premium: e.target.value,
                  })
                }
              />

              <input
                style={input}
                type="text"
                inputMode="decimal"
                placeholder="Comissão por pagamento"
                value={policyForm.commission_per_payment}
                onChange={(e) =>
                  setPolicyForm({
                    ...policyForm,
                    commission_per_payment: e.target.value,
                  })
                }
              />

              <select
                style={input}
                value={policyForm.payment_frequency}
                onChange={(e) =>
                  setPolicyForm({
                    ...policyForm,
                    payment_frequency: e.target.value,
                  })
                }
              >
                <option value="Mensal">Mensal</option>
                <option value="Trimestral">Trimestral</option>
                <option value="Semestral">Semestral</option>
                <option value="Anual">Anual</option>
              </select>

              <div style={calculationPreview}>
                <span>
                  Prémio anual:{" "}
                  <strong>
                    {formatEuro(
                      calculateAnnualPremiumFromPayment(
                        policyForm.annual_premium,
                        policyForm.payment_frequency
                      )
                    )}
                  </strong>
                </span>

                <span>
                  Comissão anual:{" "}
                  <strong>
                    {formatEuro(
                      calculateAnnualCommissionFromPayment(
                        policyForm.commission_per_payment,
                        policyForm.payment_frequency
                      )
                    )}
                  </strong>
                </span>

                <span style={commissionPreviewBadge}>
                  {formatPercent(
                    calculateCommissionPercentage(
                      calculateAnnualPremiumFromPayment(
                        policyForm.annual_premium,
                        policyForm.payment_frequency
                      ),
                      calculateAnnualCommissionFromPayment(
                        policyForm.commission_per_payment,
                        policyForm.payment_frequency
                      )
                    )
                  )}
                  % comissão
                </span>
              </div>

              <label style={fieldLabel}>
                Data emissão
                <input
                  style={input}
                  type="date"
                  value={policyForm.policy_issue_date}
                  onChange={(e) =>
                    setPolicyForm({
                      ...policyForm,
                      policy_issue_date: e.target.value,
                    })
                  }
                />
              </label>

              <label style={fieldLabel}>
                Data início
                <input
                  style={input}
                  type="date"
                  value={policyForm.start_date}
                  onChange={(e) =>
                    setPolicyForm({
                      ...policyForm,
                      start_date: e.target.value,
                    })
                  }
                />
              </label>

              <div style={formButtons}>
                <button type="submit" style={button}>
                  Guardar apólice
                </button>

                <button
                  type="button"
                  style={cancelButton}
                  onClick={() => setShowPolicyForm(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        )}

        {showEditPolicyForm && (
          <section style={card}>
            <h2>Editar Apólice</h2>

            <form onSubmit={updatePolicy} style={formGrid}>
              <input
                style={input}
                placeholder="Número da apólice"
                value={editPolicyForm.policy_number}
                onChange={(e) =>
                  setEditPolicyForm({
                    ...editPolicyForm,
                    policy_number: e.target.value,
                  })
                }
                required
              />

              <select
                style={input}
                value={editPolicyForm.branch}
                onChange={(e) =>
                  setEditPolicyForm({
                    ...editPolicyForm,
                    branch: e.target.value,
                  })
                }
                required
              >
                <option value="">Selecionar ramo</option>
                {branchList.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>

              <input
                style={{
                  ...input,
                  ...(isAutomobileBranch(editPolicyForm.branch) &&
                  !String(editPolicyForm.license_plate || "").trim()
                    ? requiredAutoInput
                    : {}),
                }}
                placeholder={
                  isAutomobileBranch(editPolicyForm.branch)
                    ? "Matrícula obrigatória"
                    : "Matrícula"
                }
                value={editPolicyForm.license_plate}
                onChange={(e) =>
                  setEditPolicyForm({
                    ...editPolicyForm,
                    license_plate: e.target.value,
                  })
                }
                required={isAutomobileBranch(editPolicyForm.branch)}
              />

              {isAutomobileBranch(editPolicyForm.branch) &&
                !String(editPolicyForm.license_plate || "").trim() && (
                  <div style={autoPlateWarning}>
                    ⚠ Matrícula obrigatória para apólices AUTOMÓVEL.
                  </div>
                )}

              <select
                style={input}
                value={editPolicyForm.insurer_name}
                onChange={(e) =>
                  setEditPolicyForm({
                    ...editPolicyForm,
                    insurer_name: e.target.value,
                  })
                }
                required
              >
                <option value="">Selecionar seguradora</option>
                {insurersList.map((insurer) => (
                  <option key={insurer} value={insurer}>
                    {insurer}
                  </option>
                ))}
              </select>

              <input
                style={input}
                type="text"
                inputMode="decimal"
                placeholder="Prémio comercial do período"
                value={editPolicyForm.annual_premium}
                onChange={(e) =>
                  setEditPolicyForm({
                    ...editPolicyForm,
                    annual_premium: e.target.value,
                  })
                }
              />

              <input
                style={input}
                type="text"
                inputMode="decimal"
                placeholder="Comissão por pagamento"
                value={editPolicyForm.commission_per_payment}
                onChange={(e) =>
                  setEditPolicyForm({
                    ...editPolicyForm,
                    commission_per_payment: e.target.value,
                  })
                }
              />

              <select
                style={input}
                value={editPolicyForm.payment_frequency}
                onChange={(e) =>
                  setEditPolicyForm({
                    ...editPolicyForm,
                    payment_frequency: e.target.value,
                  })
                }
              >
                <option value="Mensal">Mensal</option>
                <option value="Trimestral">Trimestral</option>
                <option value="Semestral">Semestral</option>
                <option value="Anual">Anual</option>
              </select>

              <div style={calculationPreview}>
                <span>
                  Prémio anual:{" "}
                  <strong>
                    {formatEuro(
                      calculateAnnualPremiumFromPayment(
                        editPolicyForm.annual_premium,
                        editPolicyForm.payment_frequency
                      )
                    )}
                  </strong>
                </span>

                <span>
                  Comissão anual:{" "}
                  <strong>
                    {formatEuro(
                      calculateAnnualCommissionFromPayment(
                        editPolicyForm.commission_per_payment,
                        editPolicyForm.payment_frequency
                      )
                    )}
                  </strong>
                </span>

                <span style={commissionPreviewBadge}>
                  {formatPercent(
                    calculateCommissionPercentage(
                      calculateAnnualPremiumFromPayment(
                        editPolicyForm.annual_premium,
                        editPolicyForm.payment_frequency
                      ),
                      calculateAnnualCommissionFromPayment(
                        editPolicyForm.commission_per_payment,
                        editPolicyForm.payment_frequency
                      )
                    )
                  )}
                  % comissão
                </span>
              </div>

              <label style={fieldLabel}>
                Data emissão
                <input
                  style={input}
                  type="date"
                  value={editPolicyForm.policy_issue_date}
                  onChange={(e) =>
                    setEditPolicyForm({
                      ...editPolicyForm,
                      policy_issue_date: e.target.value,
                    })
                  }
                />
              </label>

              <label style={fieldLabel}>
                Data início
                <input
                  style={input}
                  type="date"
                  value={editPolicyForm.start_date}
                  onChange={(e) =>
                    setEditPolicyForm({
                      ...editPolicyForm,
                      start_date: e.target.value,
                    })
                  }
                />
              </label>

              <label style={fieldLabel}>
                Data renovação
                <input
                  style={input}
                  type="date"
                  value={editPolicyForm.renewal_date}
                  onChange={(e) =>
                    setEditPolicyForm({
                      ...editPolicyForm,
                      renewal_date: e.target.value,
                    })
                  }
                />
              </label>

              <label style={fieldLabel}>
                Último pagamento
                <input
                  style={input}
                  type="date"
                  value={editPolicyForm.last_payment_date}
                  onChange={(e) =>
                    setEditPolicyForm({
                      ...editPolicyForm,
                      last_payment_date: e.target.value,
                    })
                  }
                />
              </label>

              <div style={formButtons}>
                <button
                  type="button"
                  style={button}
                  onClick={updatePolicy}
                >
                  Guardar alterações
                </button>

                <button
                  type="button"
                  style={cancelButton}
                  onClick={() => {
                    setShowEditPolicyForm(false);
                    setEditingPolicyId(null);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        )}

        <section style={clientInfoCard}>
          <h2 style={sectionTitle}>Dados do cliente</h2>

          <div style={clientInfoGrid}>
            <InfoItem label="Nome" value={client.name} />
            <InfoItem label="NIF" value={client.nif} />
            <InfoItem label="Telefone" value={client.phone} />
            <InfoItem label="Email" value={client.email} />
            <InfoItem label="Morada" value={client.address} />
            <InfoItem label="Cidade" value={client.city} />
            <InfoItem label="Código Postal" value={client.postal_code} />
           <InfoItem
  label="Data nascimento"
  value={`${formatDate(
    client.birth_date
  )} · ${calculateAge(
    client.birth_date
  )} anos`}
/>

            <InfoItem
              label="Carta de condução"
              value={formatDate(
                client.driving_license_start_date
              )}
            />

            <InfoItem label="IBAN" value={client.iban} />

            <div style={mortgageInfoItem}>
              <span style={mortgageInfoLabel}>
                🏠 Crédito Habitação
              </span>

              <strong style={mortgageInfoValue}>
                {client.mortgage_interest === "SIM"
                  ? "SIM"
                  : client.mortgage_interest === "NAO"
                  ? "NÃO"
                  : "AINDA NÃO SEI"}
              </strong>
            </div>

            <InfoItem label="Observações" value={client.notes} />
          
  
          </div>
<div
  style={{
    background: "white",
    padding: 16,
    borderRadius: 14,
    marginTop: 20,
    whiteSpace: "pre-wrap",
  }}
>
  <strong>Histórico Interações</strong>

  <div style={{ marginTop: 10 }}>
    {client.interactions || "Sem interações registadas."}
  </div>
</div>
          <div style={clientStats}>
            <div style={statBox}>
  <span style={statLabel}>Apólices em vigor</span>
  <strong style={statValue}>
    {activePolicies.length}
  </strong>
</div>

<div style={statBox}>
  <span style={statLabel}>Apólices anuladas</span>
  <strong style={statValue}>
    {cancelledPolicies.length}
  </strong>
</div>

<Link href={`/tarefas/compacto?cliente=${client.id}&origem=cliente`} style={statBoxLink}>
  <span style={statLabel}>Tarefas agendadas</span>
  <strong style={statValue}>
    {scheduledTasks.length}
  </strong>
</Link>

<Link href={`/oportunidades?cliente=${client.id}`} style={statBoxLink}>
  <span style={statLabel}>Oportunidades abertas</span>
  <strong style={statValue}>
    {activeOpportunities.length}
  </strong>
</Link>

            <div style={statBox}>
              <span style={statLabel}>Sinistros</span>
              <strong style={statValue}>{claims.length}</strong>
            </div>

            <div style={statBox}>
              <span style={statLabel}>Prémio anual</span>
              <strong style={statValue}>{formatEuro(totalPremium)}</strong>
            </div>

            <div style={statBox}>
              <span style={statLabel}>Comissão anual</span>
              <strong style={statValue}>{formatEuro(totalCommission)}</strong>
            </div>

            <div style={{ ...statBox, ...ratingStyle(rating) }}>
              <span style={{ ...statLabel, color: ratingStyle(rating).color }}>
                Classificação
              </span>
              <strong style={{ ...statValue, color: ratingStyle(rating).color }}>
                {rating}
              </strong>
            </div>
          </div>

          <div style={fundamentalBranchesBox}>
            <div>
              <h3 style={fundamentalBranchesTitle}>
                Ramos fundamentais
              </h3>

              <p style={fundamentalBranchesText}>
                Com base nas apólices em vigor, estes são os ramos fundamentais que o cliente tem ou ainda não tem.
              </p>
            </div>

            <div style={fundamentalBranchesGrid}>
              {fundamentalBranchStatus.map((item) => (
                <div
                  key={item.branch}
                  style={{
                    ...fundamentalBranchBadge,
                    ...(item.hasPolicy
                      ? fundamentalBranchOk
                      : fundamentalBranchMissing),
                  }}
                >
                  <strong>{item.branch}</strong>
                  <span>{item.hasPolicy ? "Tem" : "Falta"}</span>
                </div>
              ))}
            </div>

            <div style={missingBranchesSummary}>
              <strong>Em falta:</strong>{" "}
              {missingFundamentalBranches.length === 0
                ? "Nenhum. Cliente completo nos 4 ramos fundamentais."
                : missingFundamentalBranches
                    .map((item) => item.branch)
                    .join(", ")}
            </div>
          </div>
        </section>

        <section style={communicationCard}>
          <div style={communicationHeader}>
            <div>
              <h2 style={sectionTitle}>💬 Centro de Comunicação</h2>
              <p style={communicationSubtitle}>
                Escolhe um template, confirma a apólice, edita a mensagem e grava o contacto no histórico.
              </p>
            </div>

            <div style={contactSummary}>
              <span>
                <strong>Telefone:</strong> {client.phone || "-"}
              </span>

              <span>
                <strong>Email:</strong> {client.email || "-"}
              </span>
            </div>
          </div>

          {getSuggestedCommunicationTemplates().length > 0 && (
            <div style={suggestedTemplatesBox}>
              <strong>Templates sugeridos para este cliente:</strong>

              <div style={suggestedTemplatesList}>
                {getSuggestedCommunicationTemplates().slice(0, 6).map((template) => (
                  <button
                    key={`suggested-${template.id}`}
                    type="button"
                    style={suggestedTemplateButton}
                    onClick={() => applyCommunicationTemplate(template.id)}
                  >
                    {getTemplateLabel(template)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={communicationGrid}>
            <label style={fieldLabel}>
              Categoria
              <select
                style={input}
                value={selectedCommunicationCategory}
                onChange={(e) => {
                  const category = e.target.value;
                  const firstTemplate = availableCommunicationTemplates.find(
                    (template) => String(template.category || "GERAL") === category
                  );

                  setSelectedCommunicationCategory(category);

                  if (firstTemplate) {
                    applyCommunicationTemplate(firstTemplate.id);
                  }
                }}
              >
                {getCommunicationCategories().map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label style={fieldLabel}>
              Template
              <select
                style={input}
                value={selectedCommunicationTemplateId}
                onChange={(e) => applyCommunicationTemplate(e.target.value)}
              >
                {getFilteredCommunicationTemplates().map((template) => (
                  <option key={template.id} value={template.id}>
                    {getTemplateLabel(template)} · {template.channel || "WHATSAPP"}
                  </option>
                ))}
              </select>
            </label>

            <label style={fieldLabel}>
              Apólice para preencher variáveis
              <select
                style={input}
                value={selectedCommunicationPolicyId}
                onChange={(e) => applyPolicyToCommunication(e.target.value)}
              >
                <option value="">Sem apólice</option>
                {policies.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {policy.policy_number || "Sem nº"} · {policy.branch || "Sem ramo"} · {policy.insurers?.name || "Sem seguradora"}
                  </option>
                ))}
              </select>
            </label>

            <label style={fieldLabel}>
              Assunto do email
              <input
                style={input}
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Ex: Proposta seguro casa"
              />
            </label>

            <div style={variablesBox}>
              <strong>Variáveis disponíveis</strong>
              <p>
                {`{NOME} {PRIMEIRO_NOME} {TELEFONE} {EMAIL} {NUMERO_APOLICE} {SEGURADORA} {RAMO} {MATRICULA} {MATRICULA_TEXTO} {PREMIO} {RENOVACAO}`}
              </p>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={fieldLabel}>
                Mensagem editável antes do envio
              </label>

              <textarea
                style={communicationTextarea}
                value={communicationMessage}
                onChange={(e) => setCommunicationMessage(e.target.value)}
                placeholder="Escolhe um template para preencher automaticamente a mensagem..."
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={fieldLabel}>
                Observações internas para o histórico
              </label>

              <input
                style={input}
                value={communicationObservations}
                onChange={(e) => setCommunicationObservations(e.target.value)}
                placeholder="Ex: Enviado após anulação por preço; cliente ficou de analisar..."
              />
            </div>

            <div style={communicationButtons}>
              <button
                type="button"
                style={whatsappButton}
                onClick={openWhatsApp}
              >
                Abrir WhatsApp e gravar histórico
              </button>

              <button
                type="button"
                style={emailButton}
                onClick={openEmail}
              >
                Abrir Email e gravar histórico
              </button>

              <button
                type="button"
                style={clearCommunicationButton}
                onClick={() => {
                  setCommunicationMessage("");
                  setCommunicationObservations("");
                }}
              >
                Limpar mensagem
              </button>
            </div>
          </div>
        </section>

        <section style={communicationHistoryCard}>
          <h2 style={sectionTitle}>📞 Histórico de Comunicação</h2>

          {!communicationLogs || communicationLogs.length === 0 ? (
            <p>Sem comunicações registadas.</p>
          ) : (
            <div style={communicationHistoryList}>
              {communicationLogs.slice(0, 20).map((log) => (
                <div key={log.id} style={communicationHistoryItem}>
                  <div style={communicationHistoryTop}>
                    <span style={communicationHistoryBadge}>
                      {log.channel || log.communication_channel || "-"}
                    </span>

                    <span style={communicationHistoryDate}>
                      {formatTimelineDate(log.created_at || log.sent_at || log.date)}
                    </span>
                  </div>

                  <strong style={communicationHistoryTitle}>
                    {log.template_name || log.communication_templates?.name || log.template_code || "Contacto manual"}
                  </strong>

                  <p style={communicationHistoryObservation}>
                    {log.observations || log.notes || "Sem observações."}
                  </p>

                  {log.message && (
                    <details style={communicationHistoryDetails}>
                      <summary>Ver mensagem</summary>
                      <p>{log.message}</p>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={quickNoteCard}>
          <h2 style={sectionTitle}>Nota rápida</h2>

          <form onSubmit={saveQuickNote} style={quickNoteForm}>
            <textarea
              style={quickNoteTextarea}
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="Ex: Cliente prefere contacto por WhatsApp. Vai trocar de carro em setembro..."
            />

            <button type="submit" style={button}>
              Guardar nota na timeline
            </button>
          </form>
        </section>

        <section style={timelineCard}>
          <h2 style={sectionTitle}>Timeline do Cliente</h2>

          <div style={timelineSummaryGrid}>
            <Link href={`/tarefas/compacto?cliente=${client.id}&origem=cliente`} style={timelineSummaryBoxLink}>
              <span style={timelineSummaryLabel}>Tarefas abertas</span>
              <strong style={timelineSummaryValue}>{openTasks.length}</strong>
            </Link>

            <Link href={`/tarefas/compacto?cliente=${client.id}&origem=cliente`} style={timelineSummaryBoxLink}>
              <span style={timelineSummaryLabel}>Tarefas agendadas</span>
              <strong style={timelineSummaryValue}>{scheduledTasks.length}</strong>
            </Link>

            <Link href={`/oportunidades?cliente=${client.id}`} style={timelineSummaryBoxLink}>
              <span style={timelineSummaryLabel}>Oportunidades abertas</span>
              <strong style={timelineSummaryValue}>{activeOpportunities.length}</strong>
            </Link>

            <div style={timelineSummaryBox}>
              <span style={timelineSummaryLabel}>Eventos na timeline</span>
              <strong style={timelineSummaryValue}>{timelineItems.length}</strong>
            </div>
          </div>

          {timelineItems.length === 0 ? (
            <p>Sem histórico registado.</p>
          ) : (
            <div style={timelineList}>
              {timelineItems.map((item, index) => (
                <div key={`${item.type}-${item.date}-${index}`} style={timelineItem}>
                  <div style={timelineDot}></div>

                  <div style={timelineContent}>
                    <div style={timelineTop}>
                      <span style={{ ...timelineBadge, ...timelineStyle(item.type) }}>
                        {item.type}
                      </span>

                      <span style={timelineDate}>
                        {formatTimelineDate(item.date)}
                      </span>
                    </div>

                    <strong style={timelineTitle}>
                      {item.title}
                    </strong>

                    <p style={timelineDescription}>
                      {item.description || "-"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={card}>
          <h2>Apólices</h2>

          {policies.length === 0 ? (
            <p>Sem apólices.</p>
          ) : (
            <div style={policiesGrid}>
              {policies.map((policy) => (
                <div
  key={policy.id}
  id={`apolice-${policy.id}`}
  style={{
    ...policyCard,
    scrollMarginTop: 24,
    background:
      policy.status === "anulada"
        ? "#fee2e2"
        : "#f9fafb",
    border:
      policy.status === "anulada"
        ? "2px solid #dc2626"
        : "none",
    opacity:
      policy.status === "anulada"
        ? 0.9
        : 1,
  }}
>
                  <div style={policyTop}>
                    <h3>{policy.branch || "Sem ramo"}</h3>
                    <span style={badge}>{policy.status || "ativa"}</span>
                  </div>

                  <p>
                    <strong>Nº:</strong> {policy.policy_number || "-"}
                  </p>

                  <p>
                    <strong>Matrícula:</strong> {policy.license_plate || "-"}
                  </p>

                  <p>
                    <strong>Seguradora:</strong> {policy.insurers?.name || "-"}
                  </p>

                  <p>
                    <strong>Prémio anual:</strong> {formatEuro(policy.annual_premium)}
                  </p>

                  <p>
                    <strong>Comissão anual:</strong>{" "}
                    {formatEuro(calculateAnnualCommission(policy))}
                  </p>

                  <div style={commissionBadge}>
                    {formatPercent(
                      calculateCommissionPercentage(
                        policy.annual_premium,
                        calculateAnnualCommission(policy)
                      )
                    )}
                    % comissão
                  </div>

                  <p>
                    <strong>Data emissão:</strong> {formatDate(policy.policy_issue_date)}
                  </p>

                  <p>
                    <strong>Data início:</strong> {formatDate(policy.start_date)}
                  </p>

                  <p>
                    <strong>Renovação anual:</strong> {formatDate(policy.renewal_date)}
                  </p>

                  {String(policy.insurers?.name || "").toUpperCase().includes("GENERALI") && (
                    <div style={generaliCotBox}>
                      <div style={generaliCotHeader}>
                        <strong>COT Generali</strong>

                        <span
                          style={
                            policy.generali_cot_reference
                              ? policy.generali_cot_processed_at
                                ? cotProcessedBadge
                                : cotOpenBadge
                              : cotEmptyBadge
                          }
                        >
                          {policy.generali_cot_reference
                            ? policy.generali_cot_processed_at
                              ? "Processada"
                              : "Aberta"
                            : "Sem COT"}
                        </span>
                      </div>

                      <p style={cotLine}>
                        <strong>Referência:</strong>{" "}
                        {policy.generali_cot_reference || "-"}
                      </p>

                      <p style={cotLine}>
                        <strong>Data criação:</strong>{" "}
                        {formatDate(policy.generali_cot_created_at)}
                      </p>

                      <p style={cotLine}>
                        <strong>Pedido processamento:</strong>{" "}
                        {formatDate(policy.generali_cot_processed_at)}
                      </p>

                      <div style={cotActions}>
                        <button
                          type="button"
                          style={cotButton}
                          onClick={() => openCotModal(policy)}
                        >
                          Editar COT
                        </button>

                        {policy.generali_cot_reference && (
                          <button
                            type="button"
                            style={cotClearButton}
                            onClick={() => clearCot(policy)}
                          >
                            Remover COT
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <p>
                    <strong>Próximo pagamento:</strong>{" "}
                    {formatDate(policy.next_payment_date)}
                  </p>

                  {policy.status === "anulada" && (
                    <div style={cancellationInfoBox}>
                      <strong>Motivo anulação:</strong>{" "}
                      {policy.cancellation_reason || "-"}
                      <p style={cancellationNote}>
                        {policy.cancellation_notes || "Sem observação."}
                      </p>
                    </div>
                  )}

                  <div style={policyHistoryBox}>
                    <div style={policyHistoryHeader}>
                      <strong>Histórico da apólice</strong>

                      <button
                        type="button"
                        style={policyEventMiniButton}
                        onClick={() => openPolicyEventModal(policy)}
                      >
                        + Movimento
                      </button>
                    </div>

                    {getPolicyEvents(policy).length === 0 ? (
                      <p style={policyHistoryEmpty}>Sem movimentos registados.</p>
                    ) : (
                      <div style={policyEventsList}>
                        {getPolicyEvents(policy).slice(0, 4).map((event) => (
                          <div key={event.id} style={policyEventItem}>
                            <div>
                              <strong>{event.type}</strong>
                              <span style={policyEventDate}>
                                {formatDate(event.event_date)}
                              </span>
                            </div>

                            <p style={policyEventDescription}>
                              {event.description}
                            </p>

                            <button
                              type="button"
                              style={policyEventDeleteButton}
                              onClick={() => deletePolicyEvent(policy, event.id)}
                            >
                              Eliminar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={buttonGroup}>
                    <button style={editButton} onClick={() => editPolicy(policy)}>
                      Editar
                    </button>

                    <button
                      style={{ ...smallButton, background: "#16a34a" }}
                      onClick={() => updatePolicyStatus(policy.id, "ativa")}
                    >
                      Em vigor
                    </button>

                    <button
                      style={{ ...smallButton, background: "#dc2626" }}
                      onClick={() => openCancelPolicyModal(policy)}
                    >
                      Anular
                    </button>

                    <button
                      style={{ ...smallButton, background: "#2563eb" }}
                      onClick={() => markPolicyPaid(policy)}
                    >
                      Marcar pagamento recebido
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={card}>
          <h2>Sinistros associados</h2>

          {claims.length === 0 ? (
            <p>Sem sinistros.</p>
          ) : (
            <div style={claimsGrid}>
              {claims.map((claim) => (
                <Link key={claim.id} href={`/sinistros/${claim.id}`} style={claimCard}>
                  <h3>{claim.claim_branch || "Sem ramo"}</h3>

                  <p>
                    <strong>Nº:</strong> {claim.claim_number || "-"}
                  </p>

                  <p>
                    <strong>Estado:</strong> {claim.status || "ABERTO"}
                  </p>
                </Link>
              ))}
            </div>
          )}
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

const main = {
  flex: 1,
  padding: 40,
};

const header = {
  display: "grid",
  gap: 22,
  marginBottom: 30,
  paddingBottom: 26,
  borderBottom: "1px solid #cbd5e1",
};

const headerButtons = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
};

const title = {
  fontSize: 42,
  margin: 0,
  color: "#1e3a8a",
  fontWeight: 900,
  lineHeight: 1.05,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const subtitle = {
  color: "#6b7280",
  marginTop: 8,
  fontSize: 17,
};

const sectionTitle = {
  marginTop: 0,
};

const clientInfoCard = {
  background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
  padding: 24,
  borderRadius: 20,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const clientInfoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
  marginBottom: 24,
};

const infoItem = {
  background: "white",
  padding: 14,
  borderRadius: 14,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const infoLabel = {
  color: "#6b7280",
  fontSize: 13,
};

const infoValue = {
  color: "#111827",
  fontSize: 15,
};

const mortgageInfoItem = {
  background: "#fee2e2",
  border: "2px solid #dc2626",
  padding: 14,
  borderRadius: 14,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const mortgageInfoLabel = {
  color: "#991b1b",
  fontSize: 13,
  fontWeight: "bold",
};

const mortgageInfoValue = {
  color: "#991b1b",
  fontSize: 16,
  fontWeight: "bold",
};

const mortgageSelectInput = {
  padding: 12,
  borderRadius: 10,
  border: "2px solid #dc2626",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
  background: "#fee2e2",
  color: "#991b1b",
  fontWeight: "bold",
};

const clientStats = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 16,
};

const statBox = {
  background: "white",
  padding: 18,
  borderRadius: 14,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const statBoxLink = {
  background: "white",
  padding: 18,
  borderRadius: 14,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  textDecoration: "none",
  color: "#111827",
  border: "1px solid #bfdbfe",
};

const statLabel = {
  color: "#6b7280",
  fontSize: 13,
};

const statValue = {
  fontSize: 24,
  color: "#2563eb",
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

const editClientButton = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const callButton = {
  background: "#16a34a",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
  textDecoration: "none",
  display: "inline-block",
};

const taskShortcutButton = {
  background: "#7c3aed",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
  textDecoration: "none",
  display: "inline-block",
};

const opportunityShortcutButton = {
  background: "#0f766e",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
  textDecoration: "none",
  display: "inline-block",
};

const calculatorShortcutButton = {
  background: "#7c3aed",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const calculatorCard = {
  background: "linear-gradient(135deg, #f5f3ff, #ffffff)",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  border: "1px solid #ddd6fe",
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const calculatorHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 18,
};

const calculatorSubtitle = {
  color: "#6b7280",
  margin: "8px 0 0",
};

const calculatorGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
};

const calculatorBox = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 12,
};

const calculatorResult = {
  background: "#ecfdf5",
  color: "#166534",
  border: "1px solid #bbf7d0",
  borderRadius: 12,
  padding: 12,
  display: "grid",
  gap: 6,
};

const calculatorResultPurple = {
  background: "#ede9fe",
  color: "#5b21b6",
  border: "1px solid #ddd6fe",
  borderRadius: 12,
  padding: 12,
  display: "grid",
  gap: 6,
};

const calculatorSummaryLine = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  padding: "10px 0",
  borderBottom: "1px solid #e5e7eb",
};

const applyCalculatorButton = {
  background: "#16a34a",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const card = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const policiesGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
};

const policyCard = {
  background: "#f9fafb",
  padding: 18,
  borderRadius: 14,
};

const policyTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
};

const badge = {
  background: "#e5e7eb",
  color: "#111827",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
};

const requiredAutoInput = {
  border: "2px solid #dc2626",
  background: "#fff7ed",
};

const autoPlateWarning = {
  gridColumn: "1 / -1",
  background: "#fff7ed",
  border: "1px solid #fdba74",
  color: "#9a3412",
  padding: 12,
  borderRadius: 12,
  fontWeight: "bold",
};

const duplicateWarningBox = {
  gridColumn: "1 / -1",
  background: "#fef3c7",
  border: "1px solid #f59e0b",
  color: "#92400e",
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 10,
};

const duplicateWarningDanger = {
  background: "#fee2e2",
  border: "1px solid #dc2626",
  color: "#991b1b",
};

const duplicateWarningList = {
  display: "grid",
  gap: 8,
};

const duplicateWarningItem = {
  background: "white",
  borderRadius: 10,
  padding: 10,
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
};

const duplicateWarningLink = {
  background: "#2563eb",
  color: "white",
  padding: "7px 10px",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: "bold",
};

const duplicateWarningText = {
  margin: 0,
  fontSize: 13,
  fontWeight: "bold",
};

const calculationPreview = {
  gridColumn: "1 / -1",
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
  alignItems: "center",
};

const commissionPreviewBadge = {
  background: "#ede9fe",
  color: "#5b21b6",
  padding: "7px 11px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: "bold",
};

const commissionBadge = {
  background: "#ede9fe",
  color: "#5b21b6",
  padding: "7px 11px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: "bold",
  display: "inline-block",
  marginBottom: 10,
};

const claimsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
};

const claimCard = {
  background: "#f9fafb",
  padding: 18,
  borderRadius: 14,
  textDecoration: "none",
  color: "#111827",
};

const editButton = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const smallButton = {
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const buttonGroup = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 16,
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const input = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};

const fieldLabel = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  color: "#374151",
  fontSize: 13,
};

const quickNoteCard = {
  background: "linear-gradient(135deg, #f9fafb, #f3f4f6)",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const quickNoteForm = {
  display: "grid",
  gap: 12,
};

const quickNoteTextarea = {
  width: "100%",
  minHeight: 100,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 15,
  boxSizing: "border-box",
  fontFamily: "Arial, sans-serif",
};

const timelineCard = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const timelineSummaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
  marginBottom: 18,
};

const timelineSummaryBox = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 6,
};

const timelineSummaryBoxLink = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 6,
  textDecoration: "none",
  color: "#111827",
};

const timelineSummaryLabel = {
  color: "#64748b",
  fontSize: 13,
  fontWeight: "bold",
};

const timelineSummaryValue = {
  color: "#2563eb",
  fontSize: 26,
};

const timelineList = {
  display: "grid",
  gap: 14,
};

const timelineItem = {
  display: "grid",
  gridTemplateColumns: "16px 1fr",
  gap: 12,
  alignItems: "flex-start",
};

const timelineDot = {
  width: 12,
  height: 12,
  borderRadius: 999,
  background: "#2563eb",
  marginTop: 8,
};

const timelineContent = {
  background: "#f9fafb",
  padding: 14,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
};

const timelineTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  marginBottom: 8,
};

const timelineBadge = {
  padding: "5px 9px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: "bold",
};

const timelineDate = {
  color: "#6b7280",
  fontSize: 13,
};

const timelineTitle = {
  display: "block",
  color: "#111827",
  marginBottom: 4,
};

const timelineDescription = {
  color: "#6b7280",
  margin: 0,
  lineHeight: 1.5,
};

const fundamentalBranchesBox = {
  background: "white",
  padding: 18,
  borderRadius: 16,
  marginTop: 20,
  border: "1px solid #bfdbfe",
};

const fundamentalBranchesTitle = {
  margin: "0 0 6px",
};

const fundamentalBranchesText = {
  color: "#6b7280",
  margin: "0 0 14px",
};

const fundamentalBranchesGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
};

const fundamentalBranchBadge = {
  padding: 14,
  borderRadius: 14,
  display: "grid",
  gap: 6,
  textAlign: "center",
};

const fundamentalBranchOk = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #86efac",
};

const fundamentalBranchMissing = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
};

const missingBranchesSummary = {
  marginTop: 14,
  color: "#111827",
};

const communicationCard = {
  background:
    "linear-gradient(135deg, #ecfdf5, #f0fdf4)",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  border: "1px solid #bbf7d0",
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const communicationHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: 16,
};

const communicationSubtitle = {
  color: "#166534",
  margin: "6px 0 0",
};

const suggestedTemplatesBox = {
  background: "white",
  border: "1px solid #bbf7d0",
  borderRadius: 14,
  padding: 14,
  marginBottom: 16,
  display: "grid",
  gap: 10,
};

const suggestedTemplatesList = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const suggestedTemplateButton = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #86efac",
  padding: "8px 11px",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: "bold",
};

const communicationGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
};

const contactSummary = {
  background: "white",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #d1fae5",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const communicationTextarea = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 15,
  boxSizing: "border-box",
  minHeight: 130,
  fontFamily: "Arial, sans-serif",
};

const variablesBox = {
  gridColumn: "1 / -1",
  background: "white",
  border: "1px solid #d1fae5",
  borderRadius: 12,
  padding: 12,
  color: "#166534",
};

const communicationButtons = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  gridColumn: "1 / -1",
};

const whatsappButton = {
  background: "#16a34a",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const emailButton = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};


const clearCommunicationButton = {
  background: "#6b7280",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const communicationHistoryCard = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const communicationHistoryList = {
  display: "grid",
  gap: 12,
};

const communicationHistoryItem = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
};

const communicationHistoryTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 8,
};

const communicationHistoryBadge = {
  background: "#dcfce7",
  color: "#166534",
  padding: "5px 9px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
};

const communicationHistoryDate = {
  color: "#6b7280",
  fontSize: 13,
};

const communicationHistoryTitle = {
  display: "block",
  color: "#111827",
  marginBottom: 6,
};

const communicationHistoryObservation = {
  color: "#6b7280",
  margin: 0,
};

const communicationHistoryDetails = {
  marginTop: 10,
  color: "#374151",
  whiteSpace: "pre-wrap",
};

const formButtons = {
  display: "flex",
  gap: 12,
  gridColumn: "1 / -1",
};

const cancelButton = {
  background: "#6b7280",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
   cursor: "pointer",
  fontWeight: "bold",
};


const policiesSummaryButton = {
  background: "#7c3aed",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
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

const policiesSummaryModal = {
  width: "min(980px, 96vw)",
  maxHeight: "86vh",
  overflowY: "auto",
  background: "white",
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

const summaryTableWrap = {
  width: "100%",
  overflowX: "auto",
};

const summaryTable = {
  width: "100%",
  borderCollapse: "collapse",
  background: "white",
};

const summaryTh = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: "2px solid #e5e7eb",
  color: "#374151",
  fontSize: 13,
};

const summaryTd = {
  padding: "12px 10px",
  borderBottom: "1px solid #e5e7eb",
  color: "#111827",
};

const summaryOpenButton = {
  background: "#2563eb",
  color: "white",
  padding: "7px 11px",
  borderRadius: 9,
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: 12,
  display: "inline-block",
  whiteSpace: "nowrap",
};


const cotModal = {
  width: "min(760px, 96vw)",
  background: "linear-gradient(135deg,#fff7ed,#ffedd5)",
  border: "2px solid #ea580c",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 25px 80px rgba(0,0,0,0.35)",
};

const cotFormGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const generaliCotBox = {
  background: "#fff7ed",
  border: "1px solid #fdba74",
  borderRadius: 14,
  padding: 14,
  marginTop: 12,
  marginBottom: 12,
};

const generaliCotHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginBottom: 10,
};

const cotLine = {
  margin: "6px 0",
  color: "#374151",
};

const cotActions = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 8,
};

const cotButton = {
  background: "#ea580c",
  color: "white",
  border: "none",
  padding: "9px 12px",
  borderRadius: 9,
  cursor: "pointer",
  fontWeight: "bold",
};

const cotSaveButton = {
  background: "#ea580c",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const cotClearButton = {
  background: "#6b7280",
  color: "white",
  border: "none",
  padding: "9px 12px",
  borderRadius: 9,
  cursor: "pointer",
  fontWeight: "bold",
};

const cotOpenBadge = {
  background: "#fef3c7",
  color: "#92400e",
  border: "1px solid #f59e0b",
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 12,
  fontWeight: "bold",
};

const cotProcessedBadge = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #86efac",
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 12,
  fontWeight: "bold",
};

const cotEmptyBadge = {
  background: "#e5e7eb",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 12,
  fontWeight: "bold",
};


const policyEventModal = {
  width: "min(780px, 96vw)",
  background: "linear-gradient(135deg,#eff6ff,#ffffff)",
  border: "2px solid #2563eb",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 25px 80px rgba(0,0,0,0.35)",
};

const cancelPolicyModal = {
  width: "min(780px, 96vw)",
  background: "linear-gradient(135deg,#fff1f2,#ffffff)",
  border: "2px solid #dc2626",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 25px 80px rgba(0,0,0,0.35)",
};

const policyEventFormGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const policyEventTextarea = {
  width: "100%",
  minHeight: 120,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 14,
  boxSizing: "border-box",
  fontFamily: "Arial, sans-serif",
};

const policyEventSaveButton = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const confirmCancelPolicyButton = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const policyHistoryBox = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  marginTop: 12,
};

const policyHistoryHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginBottom: 10,
};

const policyEventMiniButton = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "7px 10px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: 12,
};

const policyHistoryEmpty = {
  color: "#6b7280",
  margin: 0,
  fontSize: 13,
};

const policyEventsList = {
  display: "grid",
  gap: 10,
};

const policyEventItem = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 10,
};

const policyEventDate = {
  color: "#6b7280",
  fontSize: 12,
  marginLeft: 8,
};

const policyEventDescription = {
  margin: "8px 0",
  color: "#374151",
  whiteSpace: "pre-wrap",
};

const policyEventDeleteButton = {
  background: "#6b7280",
  color: "white",
  border: "none",
  padding: "6px 9px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: 12,
};

const cancellationInfoBox = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: 12,
  padding: 12,
  marginTop: 12,
};

const cancellationNote = {
  margin: "6px 0 0",
  color: "#7f1d1d",
  whiteSpace: "pre-wrap",
};
