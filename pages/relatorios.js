import { useState } from "react";
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
  const { data: clients } = await supabase
    .from("clients")
    .select("*");

  const { data: policies } = await supabase
    .from("policies")
    .select(`
      *,
      clients(id, name, nif, phone, email, generali_trabalhado),
      insurers(name)
    `);

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, client_id, insurance_type, status, contact_date");

  return {
    props: {
      clients: clients || [],
      policies: policies || [],
      opportunities: opportunities || [],
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

function calculateAge(date) {
  if (!date) return null;

  const today = new Date();
  const birthDate = new Date(date);

  let age = today.getFullYear() - birthDate.getFullYear();

  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

function parseBirthDate(date) {
  if (!date) return null;

  const text = String(date).trim();

  if (!text) return null;

  let parsedDate = null;

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const [year, month, day] = text.slice(0, 10).split("-").map(Number);
    parsedDate = new Date(year, month - 1, day);
  } else if (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(text)) {
    const [dayRaw, monthRaw, yearRaw] = text.split(/[\/\-.]/);
    const day = Number(dayRaw);
    const month = Number(monthRaw);
    let year = Number(yearRaw);

    if (yearRaw.length === 2) {
      year = year >= 50 ? 1900 + year : 2000 + year;
    }

    parsedDate = new Date(year, month - 1, day);
  } else {
    parsedDate = new Date(text);
  }

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) return null;

  return parsedDate;
}

function buildClientsBornOnMarch21Report(clients) {
  return clients
    .map((client) => {
      const birthDate = parseBirthDate(client.birth_date);

      return {
        id: client.id,
        name: client.name || "Sem nome",
        nif: client.nif || "-",
        phone: client.phone || "-",
        email: client.email || "-",
        birthDate: client.birth_date || null,
        parsedBirthDate: birthDate,
        age: calculateAge(client.birth_date),
      };
    })
    .filter(
      (client) =>
        client.parsedBirthDate &&
        client.parsedBirthDate.getDate() === 21 &&
        client.parsedBirthDate.getMonth() === 2
    )
    .sort((a, b) => {
      const ageA = a.age ?? 999;
      const ageB = b.age ?? 999;

      if (ageA !== ageB) return ageB - ageA;

      return a.name.localeCompare(b.name);
    });
}


function calculateAnnualCommission(policy) {
  const commission = Number(policy.commission_per_payment || 0);
  const frequency = String(policy.payment_frequency || "anual").toLowerCase();

  if (frequency === "mensal") return commission * 12;
  if (frequency === "trimestral") return commission * 4;
  if (frequency === "semestral") return commission * 2;

  return commission;
}

const officialBranchList = [
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

function normalizeBranch(value) {
  return String(value || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const officialBranchSet = new Set(officialBranchList.map(normalizeBranch));

function parsePolicyStartDate(startDate) {
  if (!startDate) return null;

  const text = String(startDate).trim();

  if (!text) return null;

  let date = null;

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const [year, month, day] = text.slice(0, 10).split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else if (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(text)) {
    const [dayRaw, monthRaw, yearRaw] = text.split(/[\/\-.]/);
    const day = Number(dayRaw);
    const month = Number(monthRaw);
    let year = Number(yearRaw);

    if (yearRaw.length === 2) {
      year = year >= 50 ? 1900 + year : 2000 + year;
    }

    if (yearRaw.length === 1) {
      year = 2000 + year;
    }

    date = new Date(year, month - 1, day);
  } else {
    date = new Date(text);
  }

  if (!date || Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();

  if (year < 1900 || year > new Date().getFullYear() + 1) {
    return null;
  }

  return date;
}

function formatPolicyStartDate(startDate) {
  const date = parsePolicyStartDate(startDate);

  if (!date) return "-";

  return new Intl.DateTimeFormat("pt-PT").format(date);
}

function calculatePolicyAgeFromStartDate(startDate) {
  const start = parsePolicyStartDate(startDate);

  if (!start) {
    return {
      years: 0,
      months: 0,
      label: "-",
    };
  }

  const today = new Date();

  let years = today.getFullYear() - start.getFullYear();
  let months = today.getMonth() - start.getMonth();

  if (today.getDate() < start.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const label =
    years <= 0
      ? `${months} meses`
      : months === 0
      ? `${years} anos`
      : `${years} anos e ${months} meses`;

  return {
    years,
    months,
    label,
  };
}

function buildEmailLink(email, clientName) {
  if (!email || email === "-") return "";

  const subject = "Revisão da carteira de seguros";
  const body = `Boa tarde ${clientName || ""},\n\nFala Carlos Vieira da Loja de Seguros de Trajouce.\n\nEstou a rever a sua carteira de seguros e gostava de confirmar alguns dados consigo.\n\nObrigado.`;

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildOldPoliciesReport(policies) {
  return policies
    .filter((policy) => {
      const startDate = policy.start_date ? new Date(policy.start_date) : null;

      return (
        policy.status !== "anulada" &&
        policy.start_date &&
        startDate &&
        !Number.isNaN(startDate.getTime()) &&
        startDate.getFullYear() >= 1900 &&
        startDate.getFullYear() <= new Date().getFullYear() + 1 &&
        policy.client_id
      );
    })
    .map((policy) => {
      const age = calculatePolicyAgeFromStartDate(policy.start_date);

      return {
        id: policy.id,
        clientId: policy.client_id,
        clientName: policy.clients?.name || "Sem cliente",
        clientNif: policy.clients?.nif || "-",
        clientPhone: policy.clients?.phone || "-",
        clientEmail: policy.clients?.email || "-",
        policyNumber: policy.policy_number || "-",
        branch: policy.branch || "-",
        insurerName: policy.insurers?.name || "-",
        startDate: policy.start_date,
        ageLabel: age.label,
        annualPremium: Number(policy.annual_premium || 0),
      };
    })
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )
    .slice(0, 20);
}

function buildClientsWithoutHomeInsuranceReport(clients, policies) {
  const clientsWithHomeInsurance = new Set();

  policies
    .filter((policy) => policy.status !== "anulada")
    .forEach((policy) => {
      const branch = String(policy.branch || "")
        .toLowerCase()
        .trim();

      if (branch === "casa" && policy.client_id) {
        clientsWithHomeInsurance.add(policy.client_id);
      }
    });

  return clients
    .filter((client) => !clientsWithHomeInsurance.has(client.id))
    .map((client) => ({
      id: client.id,
      name: client.name || "Sem nome",
      nif: client.nif || "-",
      phone: client.phone || "-",
      email: client.email || "-",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildClientsWithoutHealthInsuranceReport(clients, policies) {
  const clientsWithHealthInsurance = new Set();

  policies
    .filter((policy) => policy.status !== "anulada")
    .forEach((policy) => {
      const branch = String(policy.branch || "")
        .toLowerCase()
        .trim();

      if (branch === "saude" && policy.client_id) {
        clientsWithHealthInsurance.add(policy.client_id);
      }
    });

  return clients
    .filter((client) => !clientsWithHealthInsurance.has(client.id))
    .map((client) => ({
      id: client.id,
      name: client.name || "Sem nome",
      nif: client.nif || "-",
      phone: client.phone || "-",
      email: client.email || "-",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildTopClientsPremiumReport(policies) {
  const activePolicies = policies.filter(
    (policy) => policy.status !== "anulada"
  );

  const clientStats = {};

  activePolicies.forEach((policy) => {
    const clientId = policy.client_id || "sem_cliente";
    const clientName = policy.clients?.name || "Sem cliente";
    const clientNif = policy.clients?.nif || "-";
    const premium = Number(policy.annual_premium || 0);

    if (!clientStats[clientId]) {
      clientStats[clientId] = {
        id: clientId,
        name: clientName,
        nif: clientNif,
        policies: 0,
        premium: 0,
      };
    }

    clientStats[clientId].policies += 1;
    clientStats[clientId].premium += premium;
  });

  return Object.values(clientStats)
    .sort((a, b) => b.premium - a.premium)
    .slice(0, 10);
}

function buildTopClientsCommissionReport(policies) {
  const activePolicies = policies.filter(
    (policy) => policy.status !== "anulada"
  );

  const clientStats = {};

  activePolicies.forEach((policy) => {
    const clientId = policy.client_id || "sem_cliente";
    const clientName = policy.clients?.name || "Sem cliente";
    const clientNif = policy.clients?.nif || "-";
    const premium = Number(policy.annual_premium || 0);
    const commission = calculateAnnualCommission(policy);

    if (!clientStats[clientId]) {
      clientStats[clientId] = {
        id: clientId,
        name: clientName,
        nif: clientNif,
        policies: 0,
        premium: 0,
        commission: 0,
      };
    }

    clientStats[clientId].policies += 1;
    clientStats[clientId].premium += premium;
    clientStats[clientId].commission += commission;
  });

  return Object.values(clientStats)
    .sort((a, b) => b.commission - a.commission)
    .slice(0, 10);
}

function buildRealVida2026Report(policies) {
  return policies
    .filter((policy) => {
      const insurerName = String(policy.insurers?.name || "")
        .toLowerCase()
        .trim();

      const startDate = policy.start_date
        ? new Date(policy.start_date)
        : null;

      return (
        insurerName === "real vida" &&
        startDate &&
        startDate >= new Date("2026-01-01") &&
        startDate <= new Date("2026-12-31") &&
        policy.status !== "anulada"
      );
    })
    .map((policy) => ({
      id: policy.id,
      clientId: policy.client_id || null,
      clientName: policy.clients?.name || "Sem cliente",
      clientNif: policy.clients?.nif || "-",
      policyNumber: policy.policy_number || "-",
      branch: policy.branch || "-",
      startDate: policy.start_date || null,
      annualPremium: Number(policy.annual_premium || 0),
    }))
    .sort((a, b) => {
      const nameCompare = a.clientName.localeCompare(b.clientName);

      if (nameCompare !== 0) return nameCompare;

      return new Date(a.startDate || 0) - new Date(b.startDate || 0);
    });
}

function buildClientsUntil40Report(clients) {
  return clients
    .map((client) => ({
      id: client.id,
      name: client.name || "Sem nome",
      nif: client.nif || "-",
      phone: client.phone || "-",
      email: client.email || "-",
      birthDate: client.birth_date || null,
      age: calculateAge(client.birth_date),
    }))
    .filter((client) => client.age !== null && client.age <= 40)
    .sort((a, b) => {
      if (a.age !== b.age) return a.age - b.age;
      return a.name.localeCompare(b.name);
    });
}

function buildPortfolioAuditReport(policies) {
  return policies
    .map((policy) => {
      const commissionPerPayment = Number(policy.commission_per_payment || 0);
      const annualCommission = calculateAnnualCommission(policy);
      const annualPremium = Number(policy.annual_premium || 0);

      return {
        id: policy.id,
        clientId: policy.client_id || null,
        clientName: policy.clients?.name || "Sem cliente",
        clientNif: policy.clients?.nif || "-",
        insurerName: policy.insurers?.name || "-",
        branch: policy.branch || "-",
        policyNumber: policy.policy_number || "-",
        paymentFrequency: policy.payment_frequency || "-",
        annualPremium,
        commissionPerPayment,
        annualCommission,
        status: policy.status || "ativa",
        startDate: policy.start_date || null,
        renewalDate: policy.renewal_date || null,
        warning:
          annualPremium >= 10000 ||
          annualCommission >= 5000 ||
          commissionPerPayment >= 1000,
      };
    })
    .sort((a, b) => {
      const insurerCompare = a.insurerName.localeCompare(b.insurerName);

      if (insurerCompare !== 0) return insurerCompare;

      const clientCompare = a.clientName.localeCompare(b.clientName);

      if (clientCompare !== 0) return clientCompare;

      return String(a.policyNumber).localeCompare(String(b.policyNumber));
    });
}


function onlyNumbers(value) {
  return String(value || "").replace(/\D/g, "");
}

function buildWhatsappLink(phone) {
  const numbers = onlyNumbers(phone);
  if (!numbers) return "";
  if (numbers.startsWith("351")) return `https://wa.me/${numbers}`;
  return `https://wa.me/351${numbers}`;
}

function buildGeneraliBranchesToClassifyReport(policies) {
  return policies
    .filter((policy) => {
      const insurerName = String(policy.insurers?.name || "")
        .toLowerCase()
        .trim();

      const branch = normalizeBranch(policy.branch);

      return (
        insurerName.includes("generali") &&
        policy.status !== "anulada" &&
        policy.client_id &&
        branch &&
        !officialBranchSet.has(branch)
      );
    })
    .map((policy) => ({
      id: policy.id,
      clientId: policy.client_id,
      clientName: policy.clients?.name || "Sem cliente",
      clientNif: policy.clients?.nif || "-",
      clientPhone: policy.clients?.phone || "-",
      clientEmail: policy.clients?.email || "-",
      policyNumber: policy.policy_number || "-",
      importedBranch: policy.branch || "-",
      startDate: policy.start_date || null,
      annualPremium: Number(policy.annual_premium || 0),
      status: policy.status || "ativa",
    }))
    .sort((a, b) => {
      const branchCompare = String(a.importedBranch).localeCompare(String(b.importedBranch));

      if (branchCompare !== 0) return branchCompare;

      return a.clientName.localeCompare(b.clientName);
    });
}

function buildGeneraliClientsReport(policies, opportunities) {
  const opportunitiesByClient = new Map();

  opportunities.forEach((opportunity) => {
    if (!opportunity.client_id) return;

    if (!opportunitiesByClient.has(opportunity.client_id)) {
      opportunitiesByClient.set(opportunity.client_id, []);
    }

    opportunitiesByClient.get(opportunity.client_id).push(opportunity);
  });

  const clientStats = {};

  policies
    .filter((policy) => {
      const insurerName = String(policy.insurers?.name || "")
        .toLowerCase()
        .trim();

      return (
        insurerName.includes("generali") &&
        policy.status !== "anulada" &&
        policy.client_id
      );
    })
    .forEach((policy) => {
      const clientId = policy.client_id;
      const client = policy.clients || {};
      const premium = Number(policy.annual_premium || 0);
      const commission = calculateAnnualCommission(policy);

      if (!clientStats[clientId]) {
        clientStats[clientId] = {
          id: clientId,
          name: client.name || "Sem cliente",
          nif: client.nif || "-",
          phone: client.phone || "-",
          email: client.email || "-",
          policies: 0,
          premium: 0,
          commission: 0,
          branches: new Set(),
          policyNumbers: [],
          hasOpportunity: opportunitiesByClient.has(clientId),
          isWorked: Boolean(client.generali_trabalhado),
          opportunities: opportunitiesByClient.get(clientId) || [],
        };
      }

      clientStats[clientId].policies += 1;
      clientStats[clientId].premium += premium;
      clientStats[clientId].commission += commission;

      if (policy.branch) {
        clientStats[clientId].branches.add(policy.branch);
      }

      if (policy.policy_number) {
        clientStats[clientId].policyNumbers.push(policy.policy_number);
      }
    });

  return Object.values(clientStats)
    .map((client) => ({
      ...client,
      branches: [...client.branches].join(", ") || "-",
      policyNumbers: client.policyNumbers.join(", ") || "-",
    }))
    .sort((a, b) => {
      if (a.hasOpportunity !== b.hasOpportunity) {
        return a.hasOpportunity ? 1 : -1;
      }

      return b.premium - a.premium;
    });
}

function exportCsv(filename, header, rows) {
  const csvContent = [header, ...rows]
    .map((row) =>
      row
        .map((cell) =>
          `"${String(cell).replace(/"/g, '""')}"`
        )
        .join(";")
    )
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.setAttribute("download", filename);

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export default function Relatorios({ clients, policies, opportunities }) {
  const [selectedReport, setSelectedReport] = useState("generaliRamosClassificar");
  const [showOnlyGeneraliWithoutOpportunity, setShowOnlyGeneraliWithoutOpportunity] = useState(true);
  const [showOnlyGeneraliPending, setShowOnlyGeneraliPending] = useState(true);
  const [workedGeneraliClients, setWorkedGeneraliClients] = useState(() => {
    const initial = new Set();

    clients.forEach((client) => {
      if (client.generali_trabalhado) {
        initial.add(client.id);
      }
    });

    policies.forEach((policy) => {
      if (policy.clients?.generali_trabalhado && policy.client_id) {
        initial.add(policy.client_id);
      }
    });

    return initial;
  });

  const topClientsPremium = buildTopClientsPremiumReport(policies);
  const topClientsCommission = buildTopClientsCommissionReport(policies);

  const clientsWithoutHomeInsurance =
    buildClientsWithoutHomeInsuranceReport(
      clients,
      policies
    );

  const clientsWithoutHealthInsurance =
    buildClientsWithoutHealthInsuranceReport(
      clients,
      policies
    );

  const realVida2026 = buildRealVida2026Report(policies);

  const realVida2026Totals = {
    clients: new Set(realVida2026.map((item) => item.clientNif)).size,
    policies: realVida2026.length,
    premium: realVida2026.reduce(
      (sum, item) => sum + Number(item.annualPremium || 0),
      0
    ),
  };

  const generaliBranchesToClassify = buildGeneraliBranchesToClassifyReport(policies);

  const generaliBranchesToClassifyTotals = {
    policies: generaliBranchesToClassify.length,
    clients: new Set(generaliBranchesToClassify.map((item) => item.clientId)).size,
    premium: generaliBranchesToClassify.reduce(
      (sum, item) => sum + Number(item.annualPremium || 0),
      0
    ),
  };

  const generaliClients = buildGeneraliClientsReport(policies, opportunities);

  const generaliClientsWithWorkState = generaliClients.map((client) => ({
    ...client,
    isWorked: client.isWorked || workedGeneraliClients.has(client.id),
  }));

  const generaliClientsFiltered = generaliClientsWithWorkState.filter((client) => {
    if (showOnlyGeneraliWithoutOpportunity && client.hasOpportunity) return false;
    if (showOnlyGeneraliPending && client.isWorked) return false;

    return true;
  });

  const generaliTotals = {
    clients: generaliClientsWithWorkState.length,
    withoutOpportunity: generaliClientsWithWorkState.filter((client) => !client.hasOpportunity).length,
    withOpportunity: generaliClientsWithWorkState.filter((client) => client.hasOpportunity).length,
    pending: generaliClientsWithWorkState.filter((client) => !client.isWorked).length,
    worked: generaliClientsWithWorkState.filter((client) => client.isWorked).length,
    policies: generaliClientsWithWorkState.reduce((sum, client) => sum + client.policies, 0),
    premium: generaliClientsWithWorkState.reduce((sum, client) => sum + Number(client.premium || 0), 0),
    commission: generaliClientsWithWorkState.reduce((sum, client) => sum + Number(client.commission || 0), 0),
  };

  async function markGeneraliClientWorked(clientId) {
    if (!clientId) return;

    const confirm = window.confirm("Marcar este cliente Generali como trabalhado?");
    if (!confirm) return;

    const { error } = await supabase
      .from("clients")
      .update({
        generali_trabalhado: true,
      })
      .eq("id", clientId);

    if (error) {
      alert(error.message);
      return;
    }

    setWorkedGeneraliClients((current) => {
      const next = new Set(current);
      next.add(clientId);
      return next;
    });
  }

  const clientsUntil40 = buildClientsUntil40Report(clients);
  const clientsBornOnMarch21 = buildClientsBornOnMarch21Report(clients);

  const portfolioAudit = buildPortfolioAuditReport(policies);

  const portfolioAuditTotals = {
    policies: portfolioAudit.length,
    activePolicies: portfolioAudit.filter((policy) => policy.status !== "anulada").length,
    premium: portfolioAudit.reduce((sum, policy) => sum + Number(policy.annualPremium || 0), 0),
    commission: portfolioAudit.reduce((sum, policy) => sum + Number(policy.annualCommission || 0), 0),
    warnings: portfolioAudit.filter((policy) => policy.warning).length,
  };

  const oldPolicies = buildOldPoliciesReport(policies);

  const selectedReportInfo = reportOptions.find(
    (report) => report.value === selectedReport
  );

  function printReportPdf() {
    window.print();
  }

  function exportTopClientsPremiumCsv() {
    const header = [
      "Posição",
      "Cliente",
      "NIF",
      "Nº Apólices em vigor",
      "Prémio total em vigor",
    ];

    const rows = topClientsPremium.map((client, index) => [
      index + 1,
      client.name,
      client.nif,
      client.policies,
      client.premium.toFixed(2),
    ]);

    exportCsv(
      "top_10_clientes_premio_em_vigor.csv",
      header,
      rows
    );
  }

  function exportTopClientsCommissionCsv() {
    const header = [
      "Posição",
      "Cliente",
      "NIF",
      "Nº Apólices em vigor",
      "Prémio total em vigor",
      "Comissão anual",
    ];

    const rows = topClientsCommission.map((client, index) => [
      index + 1,
      client.name,
      client.nif,
      client.policies,
      client.premium.toFixed(2),
      client.commission.toFixed(2),
    ]);

    exportCsv(
      "top_10_clientes_comissoes.csv",
      header,
      rows
    );
  }

  function exportClientsWithoutHealthCsv() {
    const header = [
      "Cliente",
      "NIF",
      "Telefone",
      "Email",
    ];

    const rows = clientsWithoutHealthInsurance.map((client) => [
      client.name,
      client.nif,
      client.phone,
      client.email,
    ]);

    exportCsv(
      "clientes_sem_seguro_saude.csv",
      header,
      rows
    );
  }

  function exportClientsWithoutHomeCsv() {
    const header = [
      "Cliente",
      "NIF",
      "Telefone",
      "Email",
    ];

    const rows = clientsWithoutHomeInsurance.map((client) => [
      client.name,
      client.nif,
      client.phone,
      client.email,
    ]);

    exportCsv(
      "clientes_sem_seguro_casa.csv",
      header,
      rows
    );
  }

  function exportRealVida2026Csv() {
    const header = [
      "Cliente",
      "NIF",
      "Nº Apólice",
      "Ramo",
      "Data início",
      "Prémio anual",
    ];

    const rows = realVida2026.map((item) => [
      item.clientName,
      item.clientNif,
      item.policyNumber,
      item.branch,
      formatDate(item.startDate),
      item.annualPremium.toFixed(2),
    ]);

    exportCsv(
      "real_vida_apolices_iniciadas_2026.csv",
      header,
      rows
    );
  }

  function exportGeneraliBranchesToClassifyCsv() {
    const header = [
      "Cliente",
      "NIF",
      "Telefone",
      "Email",
      "Nº Apólice",
      "Ramo atual",
      "Data início",
      "Prémio anual",
      "Estado",
    ];

    const rows = generaliBranchesToClassify.map((item) => [
      item.clientName,
      item.clientNif,
      item.clientPhone,
      item.clientEmail,
      item.policyNumber,
      item.importedBranch,
      formatDate(item.startDate),
      item.annualPremium.toFixed(2),
      item.status,
    ]);

    exportCsv(
      "generali_ramos_por_classificar.csv",
      header,
      rows
    );
  }

  function exportGeneraliClientsCsv() {
    const header = [
      "Cliente",
      "NIF",
      "Telefone",
      "Email",
      "Nº Apólices",
      "Ramos",
      "Nº Apólices Generali",
      "Prémio anual",
      "Comissão anual estimada",
      "Tem oportunidade",
      "Trabalhado",
    ];

    const rows = generaliClientsFiltered.map((client) => [
      client.name,
      client.nif,
      client.phone,
      client.email,
      client.policies,
      client.branches,
      client.policyNumbers,
      client.premium.toFixed(2),
      client.commission.toFixed(2),
      client.hasOpportunity ? "Sim" : "Não",
      client.isWorked ? "Sim" : "Não",
    ]);

    exportCsv(
      "generali_clientes_oportunidades.csv",
      header,
      rows
    );
  }

  function exportClientsUntil40Csv() {
    const header = [
      "Cliente",
      "NIF",
      "Idade",
      "Data nascimento",
      "Telefone",
      "Email",
    ];

    const rows = clientsUntil40.map((client) => [
      client.name,
      client.nif,
      client.age,
      formatDate(client.birthDate),
      client.phone,
      client.email,
    ]);

    exportCsv(
      "clientes_ate_40_anos.csv",
      header,
      rows
    );
  }

  function exportClientsBornOnMarch21Csv() {
    const header = [
      "Cliente",
      "NIF",
      "Idade",
      "Data nascimento",
      "Telefone",
      "Email",
    ];

    const rows = clientsBornOnMarch21.map((client) => [
      client.name,
      client.nif,
      client.age ?? "-",
      formatDate(client.birthDate),
      client.phone,
      client.email,
    ]);

    exportCsv(
      "clientes_nascidos_21_marco.csv",
      header,
      rows
    );
  }


  function exportPortfolioAuditCsv() {
    const header = [
      "Cliente",
      "NIF",
      "Seguradora",
      "Ramo",
      "Nº Apólice",
      "Fracionamento",
      "Prémio anual",
      "Comissão por pagamento",
      "Comissão anual",
      "Estado",
      "Data início",
      "Data renovação",
      "Alerta valor elevado",
    ];

    const rows = portfolioAudit.map((policy) => [
      policy.clientName,
      policy.clientNif,
      policy.insurerName,
      policy.branch,
      policy.policyNumber,
      policy.paymentFrequency,
      policy.annualPremium.toFixed(2),
      policy.commissionPerPayment.toFixed(2),
      policy.annualCommission.toFixed(2),
      policy.status,
      formatDate(policy.startDate),
      formatDate(policy.renewalDate),
      policy.warning ? "Sim" : "Não",
    ]);

    exportCsv(
      "auditoria_carteira_completa.csv",
      header,
      rows
    );
  }

  function exportOldPoliciesCsv() {
    const header = [
      "Posição",
      "Cliente",
      "NIF",
      "Telefone",
      "Email",
      "Seguradora",
      "Ramo",
      "Nº Apólice",
      "Data início da apólice",
      "Antiguidade",
      "Prémio anual",
    ];

    const rows = oldPolicies.map((policy, index) => [
      index + 1,
      policy.clientName,
      policy.clientNif,
      policy.clientPhone,
      policy.clientEmail,
      policy.insurerName,
      policy.branch,
      policy.policyNumber,
      formatDate(policy.startDate),
      policy.ageLabel,
      policy.annualPremium.toFixed(2),
    ]);

    exportCsv(
      "20_apolices_mais_antigas_por_data_inicio.csv",
      header,
      rows
    );
  }

  function exportSelectedReport() {
    if (selectedReport === "topClientesPremio") {
      exportTopClientsPremiumCsv();
      return;
    }

    if (selectedReport === "topClientesComissoes") {
      exportTopClientsCommissionCsv();
      return;
    }

    if (selectedReport === "semCasa") {
      exportClientsWithoutHomeCsv();
      return;
    }

    if (selectedReport === "semSaude") {
      exportClientsWithoutHealthCsv();
      return;
    }

    if (selectedReport === "realVida2026") {
      exportRealVida2026Csv();
      return;
    }

    if (selectedReport === "generaliRamosClassificar") {
      exportGeneraliBranchesToClassifyCsv();
      return;
    }

    if (selectedReport === "generaliClientes") {
      exportGeneraliClientsCsv();
      return;
    }

    if (selectedReport === "clientesAte40") {
      exportClientsUntil40Csv();
      return;
    }

    if (selectedReport === "clientesNascidos21Marco") {
      exportClientsBornOnMarch21Csv();
      return;
    }

    if (selectedReport === "auditoriaCarteira") {
      exportPortfolioAuditCsv();
      return;
    }

    if (selectedReport === "apolicesAntigas") {
      exportOldPoliciesCsv();
    }
  }

  return (
    <div style={page}>
      <Sidebar active="relatorios" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Relatórios</h1>
            <p style={subtitle}>
              Seleciona um relatório e consulta os dados na hora.
            </p>
          </div>
        </header>

        <section style={selectorCard}>
          <label style={label}>Selecionar relatório</label>

          <select
            style={select}
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value)}
          >
            {reportOptions.map((report) => (
              <option key={report.value} value={report.value}>
                {report.label}
              </option>
            ))}
          </select>

          {selectedReportInfo && (
            <p style={muted}>
              {selectedReportInfo.description}
            </p>
          )}

          <div style={buttonGroup}>
            <button
              style={secondaryButton}
              onClick={printReportPdf}
            >
              Gerar PDF
            </button>

            <button
              style={button}
              onClick={exportSelectedReport}
            >
              Exportar Excel
            </button>
          </div>
        </section>

        {selectedReport === "topClientesPremio" && (
          <section style={panel}>
            <h2 style={panelTitle}>
              Top 10 clientes por prémio total em vigor
            </h2>

            <p style={muted}>
              Considera apenas apólices em vigor. Apólices anuladas ficam excluídas.
            </p>

            {topClientsPremium.length === 0 ? (
              <p style={muted}>
                Sem dados disponíveis.
              </p>
            ) : (
              <div style={table}>
                <div style={tableHeaderTop}>
                  <span>#</span>
                  <span>Cliente</span>
                  <span>NIF</span>
                  <span>Apólices</span>
                  <span>Prémio em vigor</span>
                  <span>Ficha</span>
                </div>

                {topClientsPremium.map((client, index) => (
                  <div
                    key={client.id}
                    style={tableRowTop}
                  >
                    <strong>{index + 1}</strong>
                    <strong>{client.name}</strong>
                    <span>{client.nif}</span>
                    <span>{client.policies}</span>
                    <strong style={premiumValue}>
                      {formatEuro(client.premium)}
                    </strong>

                    {client.id && client.id !== "sem_cliente" ? (
                      <Link
                        href={`/clientes/${client.id}`}
                        style={openClientButton}
                      >
                        Abrir ficha
                      </Link>
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {selectedReport === "topClientesComissoes" && (
          <section style={panel}>
            <h2 style={panelTitle}>
              Top 10 clientes por comissões
            </h2>

            <p style={muted}>
              Considera a comissão anual estimada das apólices em vigor.
            </p>

            {topClientsCommission.length === 0 ? (
              <p style={muted}>
                Sem dados disponíveis.
              </p>
            ) : (
              <div style={table}>
                <div style={tableHeaderCommission}>
                  <span>#</span>
                  <span>Cliente</span>
                  <span>NIF</span>
                  <span>Apólices</span>
                  <span>Prémio</span>
                  <span>Comissão anual</span>
                  <span>Ficha</span>
                </div>

                {topClientsCommission.map((client, index) => (
                  <div
                    key={client.id}
                    style={tableRowCommission}
                  >
                    <strong>{index + 1}</strong>
                    <strong>{client.name}</strong>
                    <span>{client.nif}</span>
                    <span>{client.policies}</span>
                    <span>{formatEuro(client.premium)}</span>
                    <strong style={premiumValue}>
                      {formatEuro(client.commission)}
                    </strong>

                    {client.id && client.id !== "sem_cliente" ? (
                      <Link
                        href={`/clientes/${client.id}`}
                        style={openClientButton}
                      >
                        Abrir ficha
                      </Link>
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {selectedReport === "semSaude" && (
          <section style={panel}>
            <h2 style={panelTitle}>
              Clientes sem seguro de saúde
            </h2>

            <p style={muted}>
              Considera clientes sem nenhuma apólice SAÚDE em vigor.
            </p>

            {clientsWithoutHealthInsurance.length === 0 ? (
              <p style={muted}>
                Todos os clientes têm seguro de saúde em vigor.
              </p>
            ) : (
              <ClientsSimpleTable clients={clientsWithoutHealthInsurance} />
            )}
          </section>
        )}

        {selectedReport === "semCasa" && (
          <section style={panel}>
            <h2 style={panelTitle}>
              Clientes sem seguro da casa
            </h2>

            <p style={muted}>
              Considera clientes que não têm nenhuma apólice CASA em vigor.
            </p>

            {clientsWithoutHomeInsurance.length === 0 ? (
              <p style={muted}>
                Todos os clientes têm seguro da casa em vigor.
              </p>
            ) : (
              <ClientsSimpleTable clients={clientsWithoutHomeInsurance} />
            )}
          </section>
        )}

        {selectedReport === "realVida2026" && (
          <section style={panel}>
            <h2 style={panelTitle}>
              Real Vida — Apólices iniciadas em 2026
            </h2>

            <p style={muted}>
              Lista de clientes, apólices e prémios anuais de apólices em vigor iniciadas em 2026 na Real Vida.
            </p>

            <div style={summaryGrid}>
              <div style={summaryBox}>
                <span style={summaryLabel}>Clientes</span>
                <strong style={summaryValue}>{realVida2026Totals.clients}</strong>
              </div>

              <div style={summaryBox}>
                <span style={summaryLabel}>Apólices</span>
                <strong style={summaryValue}>{realVida2026Totals.policies}</strong>
              </div>

              <div style={summaryBox}>
                <span style={summaryLabel}>Prémio anual total</span>
                <strong style={summaryValue}>{formatEuro(realVida2026Totals.premium)}</strong>
              </div>
            </div>

            {realVida2026.length === 0 ? (
              <p style={muted}>
                Sem apólices Real Vida iniciadas em 2026.
              </p>
            ) : (
              <div style={table}>
                <div style={tableHeaderRealVida}>
                  <span>Cliente</span>
                  <span>NIF</span>
                  <span>Nº Apólice</span>
                  <span>Ramo</span>
                  <span>Data início</span>
                  <span>Prémio anual</span>
                </div>

                {realVida2026.map((item) => (
                  <div
                    key={item.id}
                    style={tableRowRealVida}
                  >
                    <strong>
                      {item.clientName}
                    </strong>

                    <span>
                      {item.clientNif}
                    </span>

                    <span>
                      {item.policyNumber}
                    </span>

                    <span>
                      {item.branch}
                    </span>

                    <span>
                      {formatDate(item.startDate)}
                    </span>

                    <strong style={premiumValue}>
                      {formatEuro(item.annualPremium)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {selectedReport === "generaliRamosClassificar" && (
          <section style={panel}>
            <h2 style={panelTitle}>
              Generali — Ramos por classificar
            </h2>

            <p style={muted}>
              Mostra apenas apólices Generali em vigor cujo ramo atual não pertence à lista oficial usada na criação/edição de apólices.
              Quando corrigires o ramo na ficha do cliente para um dos ramos oficiais, a apólice desaparece automaticamente deste relatório.
            </p>

            <div style={officialBranchesBox}>
              <strong>Ramos oficiais aceites:</strong>{" "}
              {officialBranchList.join(", ")}
            </div>

            <div style={summaryGrid}>
              <div style={summaryBox}>
                <span style={summaryLabel}>Apólices por classificar</span>
                <strong style={summaryValue}>{generaliBranchesToClassifyTotals.policies}</strong>
              </div>

              <div style={summaryBox}>
                <span style={summaryLabel}>Clientes envolvidos</span>
                <strong style={summaryValue}>{generaliBranchesToClassifyTotals.clients}</strong>
              </div>

              <div style={summaryBox}>
                <span style={summaryLabel}>Prémio anual</span>
                <strong style={summaryValue}>{formatEuro(generaliBranchesToClassifyTotals.premium)}</strong>
              </div>
            </div>

            {generaliBranchesToClassify.length === 0 ? (
              <p style={muted}>
                Sem apólices Generali com ramos fora da lista oficial.
              </p>
            ) : (
              <div style={table}>
                <div style={tableHeaderGeneraliClassify}>
                  <span>Cliente</span>
                  <span>NIF</span>
                  <span>Telefone</span>
                  <span>Email</span>
                  <span>Apólice</span>
                  <span>Ramo atual</span>
                  <span>Data início</span>
                  <span>Prémio</span>
                  <span>Ações</span>
                </div>

                {generaliBranchesToClassify.map((item) => {
                  const whatsappLink = buildWhatsappLink(item.clientPhone);
                  const emailLink = buildEmailLink(item.clientEmail, item.clientName);

                  return (
                    <div key={item.id} style={tableRowGeneraliClassify}>
                      <strong>{item.clientName}</strong>
                      <span>{item.clientNif}</span>
                      <span>{item.clientPhone}</span>
                      <span>{item.clientEmail}</span>
                      <span>{item.policyNumber}</span>
                      <strong style={branchWarningValue}>{item.importedBranch}</strong>
                      <span>{formatDate(item.startDate)}</span>
                      <strong style={premiumValue}>{formatEuro(item.annualPremium)}</strong>

                      <div style={generaliActions}>
                        <Link href={`/clientes/${item.clientId}`} style={openClientButton}>
                          Abrir ficha
                        </Link>

                        {whatsappLink ? (
                          <a href={whatsappLink} target="_blank" rel="noreferrer" style={whatsappButton}>
                            WhatsApp
                          </a>
                        ) : (
                          <span style={disabledAction}>Sem WhatsApp</span>
                        )}

                        {emailLink ? (
                          <a href={emailLink} style={emailButton}>
                            Email
                          </a>
                        ) : (
                          <span style={disabledAction}>Sem Email</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {selectedReport === "generaliClientes" && (
          <section style={panel}>
            <h2 style={panelTitle}>
              Generali — Clientes para oportunidades
            </h2>

            <p style={muted}>
              Lista de clientes com apólices Generali em vigor, preparada para abrir ficha, contactar e criar oportunidades.
            </p>

            <div style={summaryGrid}>
              <div style={summaryBox}>
                <span style={summaryLabel}>Clientes Generali</span>
                <strong style={summaryValue}>{generaliTotals.clients}</strong>
              </div>

              <div style={summaryBox}>
                <span style={summaryLabel}>Sem oportunidade</span>
                <strong style={summaryValue}>{generaliTotals.withoutOpportunity}</strong>
              </div>

              <div style={summaryBox}>
                <span style={summaryLabel}>Com oportunidade</span>
                <strong style={summaryValue}>{generaliTotals.withOpportunity}</strong>
              </div>

              <div style={summaryBox}>
                <span style={summaryLabel}>Pendentes</span>
                <strong style={summaryValue}>{generaliTotals.pending}</strong>
              </div>

              <div style={summaryBox}>
                <span style={summaryLabel}>Trabalhados</span>
                <strong style={summaryValue}>{generaliTotals.worked}</strong>
              </div>

              <div style={summaryBox}>
                <span style={summaryLabel}>Apólices</span>
                <strong style={summaryValue}>{generaliTotals.policies}</strong>
              </div>

              <div style={summaryBox}>
                <span style={summaryLabel}>Prémio anual</span>
                <strong style={summaryValue}>{formatEuro(generaliTotals.premium)}</strong>
              </div>

              <div style={summaryBox}>
                <span style={summaryLabel}>Comissão anual</span>
                <strong style={summaryValue}>{formatEuro(generaliTotals.commission)}</strong>
              </div>
            </div>

            <div style={filterRow}>
              <label style={filterCheck}>
                <input
                  type="checkbox"
                  checked={showOnlyGeneraliWithoutOpportunity}
                  onChange={(event) =>
                    setShowOnlyGeneraliWithoutOpportunity(event.target.checked)
                  }
                />
                Mostrar apenas clientes sem oportunidade
              </label>

              <label style={filterCheck}>
                <input
                  type="checkbox"
                  checked={showOnlyGeneraliPending}
                  onChange={(event) =>
                    setShowOnlyGeneraliPending(event.target.checked)
                  }
                />
                Mostrar apenas pendentes
              </label>
            </div>

            {generaliClientsFiltered.length === 0 ? (
              <p style={muted}>
                Sem clientes Generali nesta seleção.
              </p>
            ) : (
              <div style={table}>
                <div style={tableHeaderGenerali}>
                  <span>Cliente</span>
                  <span>NIF</span>
                  <span>Telefone</span>
                  <span>Email</span>
                  <span>Apólices</span>
                  <span>Ramos</span>
                  <span>Prémio</span>
                  <span>Comissão</span>
                  <span>Oportunidade</span>
                  <span>Estado</span>
                  <span>Ações</span>
                </div>

                {generaliClientsFiltered.map((client) => {
                  const whatsappLink = buildWhatsappLink(client.phone);

                  return (
                    <div
                      key={client.id}
                      style={{
                        ...tableRowGenerali,
                        ...(client.isWorked ? workedGeneraliRow : {}),
                      }}
                    >
                      <strong>{client.name}</strong>
                      <span>{client.nif}</span>
                      <span>{client.phone}</span>
                      <span>{client.email}</span>
                      <span>{client.policies}</span>
                      <span>{client.branches}</span>
                      <strong style={premiumValue}>{formatEuro(client.premium)}</strong>
                      <strong style={premiumValue}>{formatEuro(client.commission)}</strong>

                      <span style={client.hasOpportunity ? badgeExisting : badgeMissing}>
                        {client.hasOpportunity ? "EXISTE" : "CRIAR"}
                      </span>

                      <span style={client.isWorked ? badgeWorked : badgePending}>
                        {client.isWorked ? "TRABALHADO" : "PENDENTE"}
                      </span>

                      <div style={generaliActions}>
                        <Link
                          href={`/clientes/${client.id}`}
                          style={openClientButton}
                        >
                          Abrir ficha
                        </Link>

                        <Link
                          href={`/oportunidades?cliente=${client.id}`}
                          style={createOpportunityButton}
                        >
                          Criar oportunidade
                        </Link>

                        {whatsappLink ? (
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noreferrer"
                            style={whatsappButton}
                          >
                            WhatsApp
                          </a>
                        ) : (
                          <span style={muted}>Sem telefone</span>
                        )}

                        {!client.isWorked && (
                          <button
                            type="button"
                            style={workedButton}
                            onClick={() => markGeneraliClientWorked(client.id)}
                          >
                            ✓ Trabalhado
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {selectedReport === "clientesAte40" && (
          <section style={panel}>
            <h2 style={panelTitle}>
              Clientes até 40 anos
            </h2>

            <p style={muted}>
              Lista de clientes com data de nascimento registada e idade até 40 anos.
            </p>

            {clientsUntil40.length === 0 ? (
              <p style={muted}>
                Sem clientes até 40 anos com data de nascimento registada.
              </p>
            ) : (
              <div style={table}>
                <div style={tableHeaderClientsAge}>
                  <span>Cliente</span>
                  <span>NIF</span>
                  <span>Idade</span>
                  <span>Data nascimento</span>
                  <span>Telefone</span>
                  <span>Ficha</span>
                </div>

                {clientsUntil40.map((client) => (
                  <div
                    key={client.id}
                    style={tableRowClientsAge}
                  >
                    <strong>{client.name}</strong>
                    <span>{client.nif}</span>
                    <strong>{client.age}</strong>
                    <span>{formatDate(client.birthDate)}</span>
                    <span>{client.phone}</span>

                    <Link
                      href={`/clientes/${client.id}`}
                      style={openClientButton}
                    >
                      Abrir ficha
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {selectedReport === "clientesNascidos21Marco" && (
          <section style={panel}>
            <h2 style={panelTitle}>
              Clientes nascidos a 21 de Março
            </h2>

            <p style={muted}>
              Lista de clientes com data de nascimento registada no dia 21 de Março.
            </p>

            <div style={summaryGrid}>
              <div style={summaryBox}>
                <span style={summaryLabel}>Clientes encontrados</span>
                <strong style={summaryValue}>{clientsBornOnMarch21.length}</strong>
              </div>
            </div>

            {clientsBornOnMarch21.length === 0 ? (
              <p style={muted}>
                Sem clientes nascidos a 21 de Março.
              </p>
            ) : (
              <div style={table}>
                <div style={tableHeaderClientsAge}>
                  <span>Cliente</span>
                  <span>NIF</span>
                  <span>Idade</span>
                  <span>Data nascimento</span>
                  <span>Telefone</span>
                  <span>Ficha</span>
                </div>

                {clientsBornOnMarch21.map((client) => (
                  <div
                    key={client.id}
                    style={tableRowClientsAge}
                  >
                    <strong>{client.name}</strong>
                    <span>{client.nif}</span>
                    <strong>{client.age ?? "-"}</strong>
                    <span>{formatDate(client.birthDate)}</span>
                    <span>{client.phone}</span>

                    <Link
                      href={`/clientes/${client.id}`}
                      style={openClientButton}
                    >
                      Abrir ficha
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {selectedReport === "apolicesAntigas" && (
          <section style={panel}>
            <h2 style={panelTitle}>
              20 apólices mais antigas por data de início
            </h2>

            <p style={muted}>
              Este relatório usa a <strong>data de início da apólice</strong>. Apólices anuladas, sem data ou com ano inválido ficam excluídas.
            </p>

            {oldPolicies.length === 0 ? (
              <p style={muted}>
                Sem apólices em vigor com data de início válida.
              </p>
            ) : (
              <div style={table}>
                <div style={tableHeaderOldPolicies}>
                  <span>#</span>
                  <span>Cliente</span>
                  <span>NIF</span>
                  <span>Apólice</span>
                  <span>Ramo</span>
                  <span>Seguradora</span>
                  <span>Data início</span>
                  <span>Antiguidade</span>
                  <span>Ações</span>
                </div>

                {oldPolicies.map((policy, index) => {
                  const whatsappLink = buildWhatsappLink(policy.clientPhone);
                  const emailLink = buildEmailLink(policy.clientEmail, policy.clientName);

                  return (
                    <div key={policy.id} style={tableRowOldPolicies}>
                      <strong>{index + 1}</strong>

                      <div>
                        <strong>{policy.clientName}</strong>
                        <div style={smallMuted}>
                          Tel: {policy.clientPhone || "-"} · Email: {policy.clientEmail || "-"}
                        </div>
                      </div>

                      <span>{policy.clientNif}</span>
                      <span>{policy.policyNumber}</span>
                      <span>{policy.branch}</span>
                      <span>{policy.insurerName}</span>
                      <strong style={startDateValue}>{formatDate(policy.startDate)}</strong>
                      <span style={ageBadge}>{policy.ageLabel}</span>

                      <div style={oldPolicyActions}>
                        <Link href={`/clientes/${policy.clientId}`} style={openClientButton}>
                          Abrir ficha
                        </Link>

                        {whatsappLink ? (
                          <a href={whatsappLink} target="_blank" rel="noreferrer" style={whatsappButton}>
                            WhatsApp
                          </a>
                        ) : (
                          <span style={disabledAction}>Sem WhatsApp</span>
                        )}

                        {emailLink ? (
                          <a href={emailLink} style={emailButton}>
                            Email
                          </a>
                        ) : (
                          <span style={disabledAction}>Sem Email</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function ClientsSimpleTable({ clients }) {
  return (
    <div style={table}>
      <div style={tableHeaderHome}>
        <span>Cliente</span>
        <span>NIF</span>
        <span>Telefone</span>
        <span>Email</span>
        <span>Ficha</span>
      </div>

      {clients.map((client) => (
        <div
          key={client.id}
          style={tableRowHome}
        >
          <strong>
            {client.name}
          </strong>

          <span>
            {client.nif}
          </span>

          <span>
            {client.phone}
          </span>

          <span>
            {client.email}
          </span>

          <Link
            href={`/clientes/${client.id}`}
            style={openClientButton}
          >
            Abrir ficha
          </Link>
        </div>
      ))}
    </div>
  );
}

const reportOptions = [
  {
    value: "topClientesPremio",
    label: "Top 10 clientes por prémio",
    description: "Clientes com maior prémio comercial total em vigor.",
  },
  {
    value: "topClientesComissoes",
    label: "Top 10 clientes por comissões",
    description: "Clientes com maior comissão anual estimada.",
  },
  {
    value: "auditoriaCarteira",
    label: "Auditoria da carteira completa",
    description: "Exportação completa de apólices, prémios, comissões e fracionamento.",
  },
  {
    value: "semCasa",
    label: "Clientes sem seguro da casa",
    description: "Clientes que não têm nenhuma apólice CASA em vigor.",
  },
  {
    value: "semSaude",
    label: "Clientes sem seguro de saúde",
    description: "Clientes que não têm nenhuma apólice SAÚDE em vigor.",
  },
  {
    value: "realVida2026",
    label: "Real Vida 2026",
    description: "Apólices Real Vida iniciadas em 2026.",
  },
  {
    value: "generaliRamosClassificar",
    label: "Generali - Ramos por classificar",
    description: "Apólices Generali cujo ramo não pertence à lista oficial do CRM.",
  },
  {
    value: "generaliClientes",
    label: "Generali - Clientes para oportunidades",
    description: "Clientes Generali com botões para abrir ficha, criar oportunidade e WhatsApp.",
  },
  {
    value: "clientesAte40",
    label: "Clientes até 40 anos",
    description: "Clientes com idade até 40 anos.",
  },
  {
    value: "clientesNascidos21Marco",
    label: "Clientes nascidos a 21 de Março",
    description: "Clientes com aniversário no dia 21 de Março.",
  },
  {
    value: "apolicesAntigas",
    label: "20 apólices mais antigas",
    description: "Ordena pela data de início da apólice e exclui anos inválidos.",
  },
];

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

const selectorCard = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  display: "grid",
  gap: 12,
};

const label = {
  fontSize: 13,
  color: "#6b7280",
  fontWeight: "bold",
};

const select = {
  padding: 14,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 16,
  maxWidth: 520,
};

const panel = {
  background: "white",
  borderRadius: 18,
  padding: 24,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const panelTitle = {
  marginTop: 0,
};

const buttonGroup = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const button = {
  background: "#111827",
  color: "white",
  border: "none",
  padding: "11px 16px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryButton = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "11px 16px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const table = {
  display: "grid",
  gap: 8,
};

const tableHeaderPortfolioAudit = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1.3fr 1fr 1.2fr 1.2fr 1.2fr 1fr",
  gap: 12,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 14,
  minWidth: 1200,
};

const tableRowPortfolioAudit = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1.3fr 1fr 1.2fr 1.2fr 1.2fr 1fr",
  gap: 12,
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
  alignItems: "center",
  minWidth: 1200,
};

const warningRow = {
  background: "#fff7ed",
};

const smallMuted = {
  color: "#6b7280",
  fontSize: 12,
  marginTop: 4,
};

const tableHeaderTop = {
  display: "grid",
  gridTemplateColumns: "0.4fr 2fr 1fr 1fr 1.4fr 1fr",
  gap: 12,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 14,
};

const tableRowTop = {
  display: "grid",
  gridTemplateColumns: "0.4fr 2fr 1fr 1fr 1.4fr 1fr",
  gap: 12,
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
  alignItems: "center",
};

const tableHeaderCommission = {
  display: "grid",
  gridTemplateColumns: "0.4fr 2fr 1fr 1fr 1.3fr 1.3fr 1fr",
  gap: 12,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 14,
};

const tableRowCommission = {
  display: "grid",
  gridTemplateColumns: "0.4fr 2fr 1fr 1fr 1.3fr 1.3fr 1fr",
  gap: 12,
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
  alignItems: "center",
};

const tableHeaderHome = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1.6fr 1fr",
  gap: 12,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 14,
};

const tableRowHome = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1.6fr 1fr",
  gap: 12,
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
  alignItems: "center",
};

const tableHeaderRealVida = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1.2fr 1fr 1fr 1.2fr",
  gap: 12,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 14,
};

const tableRowRealVida = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1.2fr 1fr 1fr 1.2fr",
  gap: 12,
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
  alignItems: "center",
};

const tableHeaderClientsAge = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 0.7fr 1.2fr 1fr 1fr",
  gap: 12,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 14,
};

const tableRowClientsAge = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 0.7fr 1.2fr 1fr 1fr",
  gap: 12,
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
  alignItems: "center",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
  marginBottom: 24,
};

const summaryBox = {
  background: "#f9fafb",
  padding: 16,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  display: "grid",
  gap: 8,
};

const summaryLabel = {
  color: "#6b7280",
  fontSize: 13,
};

const summaryValue = {
  color: "#111827",
  fontSize: 24,
};

const officialBranchesBox = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e3a8a",
  padding: 14,
  borderRadius: 14,
  marginBottom: 18,
  lineHeight: 1.5,
};

const branchWarningValue = {
  color: "#b45309",
};

const tableHeaderGeneraliClassify = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1.5fr 1.1fr 1.5fr 1fr 1fr 2.2fr",
  gap: 10,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 13,
  minWidth: 1450,
};

const tableRowGeneraliClassify = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1.5fr 1.1fr 1.5fr 1fr 1fr 2.2fr",
  gap: 10,
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
  alignItems: "center",
  minWidth: 1450,
  fontSize: 13,
};

const openClientButton = {
  background: "#2563eb",
  color: "white",
  padding: "9px 12px",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: "bold",
  textAlign: "center",
};

const premiumValue = {
  color: "#16a34a",
};

const filterRow = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 16,
};

const filterCheck = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  padding: 12,
  borderRadius: 12,
  color: "#374151",
  fontWeight: "bold",
};

const tableHeaderGenerali = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1.5fr 0.7fr 1.4fr 1.1fr 1.1fr 1fr 1fr 2.7fr",
  gap: 10,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 13,
  minWidth: 1650,
};

const tableRowGenerali = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1.5fr 0.7fr 1.4fr 1.1fr 1.1fr 1fr 1fr 2.7fr",
  gap: 10,
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
  alignItems: "center",
  minWidth: 1650,
  fontSize: 13,
};

const generaliActions = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const createOpportunityButton = {
  background: "#16a34a",
  color: "white",
  padding: "9px 12px",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: "bold",
  textAlign: "center",
};

const whatsappButton = {
  background: "#22c55e",
  color: "white",
  padding: "9px 12px",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: "bold",
  textAlign: "center",
};

const emailButton = {
  background: "#0f766e",
  color: "white",
  padding: "9px 12px",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: "bold",
  textAlign: "center",
};

const disabledAction = {
  background: "#e5e7eb",
  color: "#6b7280",
  padding: "9px 12px",
  borderRadius: 8,
  fontWeight: "bold",
  textAlign: "center",
};

const startDateValue = {
  color: "#1d4ed8",
};

const ageBadge = {
  background: "#fef3c7",
  color: "#92400e",
  padding: "7px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
  textAlign: "center",
};

const oldPolicyActions = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const tableHeaderOldPolicies = {
  display: "grid",
  gridTemplateColumns: "0.35fr 2fr 0.9fr 1.1fr 0.9fr 1.1fr 1fr 1fr 2.4fr",
  gap: 10,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 13,
  minWidth: 1450,
};

const tableRowOldPolicies = {
  display: "grid",
  gridTemplateColumns: "0.35fr 2fr 0.9fr 1.1fr 0.9fr 1.1fr 1fr 1fr 2.4fr",
  gap: 10,
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
  alignItems: "center",
  minWidth: 1450,
  fontSize: 13,
};

const badgeExisting = {
  background: "#dbeafe",
  color: "#1d4ed8",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: "bold",
  textAlign: "center",
};

const badgeMissing = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: "bold",
  textAlign: "center",
};

const badgeWorked = {
  background: "#bbf7d0",
  color: "#166534",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: "bold",
  textAlign: "center",
};

const badgePending = {
  background: "#fef3c7",
  color: "#92400e",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: "bold",
  textAlign: "center",
};

const workedButton = {
  background: "#15803d",
  color: "white",
  border: "none",
  padding: "9px 12px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
  textAlign: "center",
};

const muted = {
  color: "#6b7280",
};
                 
  
