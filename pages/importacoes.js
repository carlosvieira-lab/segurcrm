import { useMemo, useState } from "react";
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
    .select("id, name, nif");

  const { data: policies } = await supabase
    .from("policies")
    .select("id, policy_number, client_id");

  const { data: insurers } = await supabase
    .from("insurers")
    .select("id, name");

  return {
    props: {
      clients: clients || [],
      policies: policies || [],
      insurers: insurers || [],
    },
  };
}

function onlyNumbers(value) {
  return String(value || "").replace(/\D/g, "");
}

function cleanText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatClientName(value) {
  const smallWords = new Set([
    "de",
    "da",
    "do",
    "das",
    "dos",
    "e",
  ]);

  return String(value || "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => {
      if (index > 0 && smallWords.has(word)) {
        return word;
      }

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function formatEuro(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function excelDateToIso(value) {
  if (!value) return "";

  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  if (typeof value === "number") {
    const utcDays = Math.floor(value - 25569);
    const utcValue = utcDays * 86400;
    const date = new Date(utcValue * 1000);
    return date.toISOString().split("T")[0];
  }

  const text = String(value).trim();

  if (!text) return "";

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }

  const parts = text.split(/[\/\-\.]/);

  if (parts.length === 3) {
    const [day, month, year] = parts;

    if (year?.length === 4) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  return text;
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") return value;

  let text = String(value)
    .replace(/\s/g, "")
    .replace(/€/g, "")
    .trim();

  if (!text) return 0;

  const isNegative =
    text.startsWith("-") ||
    /^\(.*\)$/.test(text);

  text = text.replace(/[()]/g, "").replace(/^-/, "");

  const hasComma = text.includes(",");
  const hasDot = text.includes(".");

  if (hasComma && hasDot) {
    const lastComma = text.lastIndexOf(",");
    const lastDot = text.lastIndexOf(".");

    if (lastComma > lastDot) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (hasComma) {
    text = text.replace(/\./g, "").replace(",", ".");
  }

  const number = Number(text) || 0;

  return isNegative ? -number : number;
}

function daysBetweenIsoDates(startDate, endDate) {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  const diff = Math.round((end - start) / 86400000);

  return diff > 0 ? diff : 0;
}

function annualizePremiumByReceiptPeriod(premiumValue, startDate, endDate) {
  const premium = parseNumber(premiumValue);
  const days = daysBetweenIsoDates(startDate, endDate);

  if (!premium || !days) return premium;

  if (days >= 360 && days <= 370) return premium;

  if (days >= 175 && days <= 190) return premium * 2;

  if (days >= 85 && days <= 95) return premium * 4;

  if (days >= 27 && days <= 32) return premium * 12;

  return premium * (365 / days);
}

function keepExistingOrFill(existingValue, importedValue) {
  const existing = String(existingValue || "").trim();
  const imported = String(importedValue || "").trim();

  return existing || imported || null;
}

function buildClientEnrichmentPayload(existingClient, importedClient) {
  if (!existingClient || !importedClient) return {};

  return {
    name: keepExistingOrFill(existingClient.name, importedClient.name),
    phone: keepExistingOrFill(existingClient.phone, importedClient.phone),
    email: keepExistingOrFill(existingClient.email, importedClient.email),
    address: keepExistingOrFill(existingClient.address, importedClient.address),
    city: keepExistingOrFill(existingClient.city, importedClient.city),
    postal_code: keepExistingOrFill(existingClient.postal_code, importedClient.postal_code),
  };
}

function encodeOpportunityText(item) {
  const parts = [
    "Novo cliente importado Generali.",
    item?.branch ? `Ramo atual: ${item.branch}.` : "",
    item?.policyNumber ? `Apólice: ${item.policyNumber}.` : "",
    "Validar potencial de cross-selling e completar dados em falta.",
  ].filter(Boolean);

  return encodeURIComponent(parts.join("\n"));
}

function buildNewClientOpportunityHref(item) {
  if (!item) return "/oportunidades";

  if (item.existingClient?.id) {
    return `/oportunidades?cliente=${item.existingClient.id}`;
  }

  const params = new URLSearchParams();

  if (item.clientName) params.set("nome", item.clientName);
  if (item.nif) params.set("nif", item.nif);
  if (item.phone) params.set("telefone", item.phone);

  params.set("descricao", decodeURIComponent(encodeOpportunityText(item)));

  return `/oportunidades?${params.toString()}`;
}

function crossSellingSuggestion(branch) {
  const value = String(branch || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (value.includes("CASA")) return "Sugerir Saúde ou Vida";
  if (value.includes("AUTOMOVEL")) return "Sugerir Casa + Saúde";
  if (value.includes("SAUDE")) return "Sugerir Vida";
  if (value.includes("VIDA")) return "Sugerir Saúde";
  if (value.includes("MULTIRRISCO")) return "Sugerir Saúde ou Vida";

  return "Validar oportunidade de cross-selling";
}


function normalizePaymentFrequency(value) {
  const text = cleanText(value);

  if (text.includes("mensal")) return "Mensal";
  if (text.includes("trimestral")) return "Trimestral";
  if (text.includes("semestral")) return "Semestral";
  if (text.includes("anual")) return "Anual";

  return value || "Anual";
}

function normalizeStatus(value) {
  const text = cleanText(value);

  if (text.includes("anulad") || text.includes("cancel")) return "anulada";

  return "ativa";
}

function normalizeColumnName(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s/g, "")
    .toLowerCase();
}

function getCell(row, possibleNames) {
  const normalizedRow = {};

  Object.keys(row || {}).forEach((key) => {
    normalizedRow[normalizeColumnName(key)] = row[key];
  });

  for (const name of possibleNames) {
    const normalizedName = normalizeColumnName(name);

    if (normalizedName in normalizedRow) {
      return normalizedRow[normalizedName];
    }
  }

  return "";
}

function normalizePolicyNumber(value) {
  const raw = String(value || "")
    .trim()
    .replace(/\s/g, "")
    .toUpperCase();

  if (!raw) return "";

  const parts = raw.split("/");

  if (parts.length === 2) {
    const module = String(Number(parts[0]));
    const number = parts[1].replace(/^0+/, "") || "0";

    return `${module}/${number}`;
  }

  return raw.replace(/^0+/, "") || "0";
}

function buildRealVidaPolicyNumber(row) {
  const mod = String(getCell(row, ["Mod", "Modulo", "Módulo"]))
    .trim();

  const apolice = String(getCell(row, ["Apolice", "Apólice", "Policy"]))
    .trim();

  if (mod && apolice) {
    return `${mod}/${apolice}`;
  }

  return apolice;
}

function loadSheetJs() {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.XLSX) {
      resolve(window.XLSX);
      return;
    }

    const existingScript = document.getElementById("sheetjs-script");

    if (existingScript) {
      existingScript.onload = () => resolve(window.XLSX);
      existingScript.onerror = reject;
      return;
    }

    const script = document.createElement("script");
    script.id = "sheetjs-script";
    script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.onload = () => resolve(window.XLSX);
    script.onerror = reject;

    document.body.appendChild(script);
  });
}

function Summary({ title, value }) {
  return (
    <div style={summaryCard}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function Importacoes({ clients, policies, insurers }) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [previewSearch, setPreviewSearch] = useState("");
  const [onlyNewClients, setOnlyNewClients] = useState(false);
  const [onlyMissingPhone, setOnlyMissingPhone] = useState(false);
  const [onlyMissingEmail, setOnlyMissingEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [importMode, setImportMode] = useState("realvida");

  const realVida =
    insurers.find(
      (insurer) => String(insurer.name || "").trim() === "REAL VIDA"
    ) ||
    insurers.find(
      (insurer) => cleanText(insurer.name) === "real vida"
    );

  const generali =
    insurers.find(
      (insurer) => cleanText(insurer.name).includes("generali")
    );

  const existingClientsByNif = useMemo(() => {
    const map = new Map();

    clients.forEach((client) => {
      const nif = onlyNumbers(client.nif);

      if (nif) {
        map.set(nif, client);
      }
    });

    return map;
  }, [clients]);

  const existingPoliciesByNumber = useMemo(() => {
    const map = new Map();

    policies.forEach((policy) => {
      const policyNumber = normalizePolicyNumber(policy.policy_number);

      if (policyNumber) {
        map.set(policyNumber, policy);
      }
    });

    return map;
  }, [policies]);

  const analyzedRows = useMemo(() => {
    return rows.map((row, index) => {
      const isGenerali = importMode === "generali";

      const policyNumber = isGenerali
        ? String(
            getCell(row, [
              "Nº Apólice",
              "N Apolice",
              "Nº Apolice",
              "Numero Apolice",
              "Número Apólice",
              "Apolice",
              "Apólice",
            ])
          ).trim()
        : buildRealVidaPolicyNumber(row);

      const clientName = formatClientName(
        isGenerali
          ? getCell(row, ["Nome Cliente", "Cliente", "Tomador", "Nome"])
          : getCell(row, ["Tomador", "Cliente", "Nome"])
      );

      const nif = onlyNumbers(
        isGenerali
          ? getCell(row, ["Nº Contribuinte", "N Contribuinte", "NIF", "Nif", "Contribuinte"])
          : getCell(row, ["Nif", "NIF", "Contribuinte"])
      );

      const phone = onlyNumbers(
        isGenerali
          ? getCell(row, ["Nº Telemóvel", "N Telemovel", "Telemóvel", "Telemovel", "Telefone", "Contacto"])
          : getCell(row, ["Telefone", "Telemovel", "Telemóvel"])
      );

      const email = String(
        isGenerali
          ? getCell(row, ["Email", "E-mail", "Mail"])
          : getCell(row, ["Email", "E-mail"])
      ).trim();

      const address = String(
        isGenerali
          ? getCell(row, ["Morada", "Endereço", "Endereco"])
          : getCell(row, ["Morada"])
      ).trim();

      const locality = String(
        isGenerali
          ? getCell(row, ["Localidade"])
          : getCell(row, ["Localidade"])
      ).trim();

      const postalCode = String(
        isGenerali
          ? getCell(row, ["Código Postal", "Codigo Postal", "C Postal", "CP"])
          : getCell(row, ["Código Postal", "Codigo Postal", "CP"])
      ).trim();

      const branch = String(
        isGenerali
          ? getCell(row, ["Produto", "Ramo", "Modalidade"])
          : getCell(row, ["Produto", "Ramo"])
      ).trim();

      const startDate = excelDateToIso(
        isGenerali
          ? getCell(row, ["Data Início Período", "Data Inicio Periodo", "Inicio Periodo", "Data Inicio", "Início"])
          : getCell(row, ["PeriodoDe", "Período De", "Inicio", "DataInicio"])
      );

      const renewalDate = excelDateToIso(
        isGenerali
          ? getCell(row, ["Data Fim Período", "Data Fim Periodo", "Fim Periodo", "Data Fim", "Fim"])
          : getCell(row, ["PeriodoAte", "Período Até", "Fim", "DataFim"])
      );

      const status = normalizeStatus(
        isGenerali
          ? getCell(row, ["Situação", "Situacao", "Estado"])
          : getCell(row, ["Situacao", "Situação", "Estado"])
      );

      const premiumRaw = isGenerali
        ? getCell(row, ["Prémio Comercial", "Premio Comercial", "Prémio", "Premio"])
        : getCell(row, ["Premio", "Prémio"]);

      const commercialPremiumRaw = isGenerali
        ? getCell(row, ["Prémio Comercial", "Premio Comercial"])
        : getCell(row, ["PremioComercial", "Prémio Comercial"]);

      const premium = isGenerali
        ? annualizePremiumByReceiptPeriod(premiumRaw, startDate, renewalDate)
        : parseNumber(premiumRaw);

      const commercialPremium = isGenerali
        ? annualizePremiumByReceiptPeriod(commercialPremiumRaw || premiumRaw, startDate, renewalDate)
        : parseNumber(commercialPremiumRaw);

      const paymentFrequency = normalizePaymentFrequency(
        isGenerali
          ? getCell(row, ["Tipo Fraccionamento", "Tipo Fracionamento", "Fraccionamento", "Fracionamento"])
          : getCell(row, ["FormaPagamento", "Forma Pagamento", "Fracionamento"])
      );

      const commissionDistribution = parseNumber(
        isGenerali
          ? getCell(row, ["Comissão Distribuição", "Comissao Distribuicao", "Comissão", "Comissao"])
          : getCell(row, ["Comissao", "Comissão"])
      );

      const commissionCollection = parseNumber(
        isGenerali
          ? getCell(row, [
              "Comissão Cobrança",
              "Comissao Cobranca",
              "Comissão de Cobrança",
              "Comissao de Cobranca",
              "Comissão Cob.",
              "Comissao Cob.",
              "Cobrança",
              "Cobranca",
            ])
          : 0
      );

      const commissionRaw = isGenerali
        ? commissionDistribution + commissionCollection
        : commissionDistribution;

      const commission = isGenerali ? Math.abs(commissionRaw) : commissionRaw;

      const existingClient = nif
        ? existingClientsByNif.get(nif)
        : null;

      const existingPolicy = policyNumber
        ? existingPoliciesByNumber.get(normalizePolicyNumber(policyNumber))
        : null;

      return {
        index: index + 1,
        policyNumber,
        clientName,
        nif,
        phone,
        email,
        address,
        locality,
        postalCode,
        branch,
        startDate,
        renewalDate,
        status,
        premium,
        commercialPremium,
        paymentFrequency,
        commission,
        commissionCollection,
        commissionDistribution,
        commissionTotalRaw: commissionRaw,
        existingClient,
        existingPolicy,
      };
    });
  }, [rows, importMode, existingClientsByNif, existingPoliciesByNumber]);

  const duplicatedNifsInExcel = useMemo(() => {
    const counts = new Map();

    analyzedRows.forEach((row) => {
      if (!row.nif) return;
      counts.set(row.nif, (counts.get(row.nif) || 0) + 1);
    });

    return new Set(
      [...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([nif]) => nif)
    );
  }, [analyzedRows]);

  const duplicatedPoliciesInExcel = useMemo(() => {
    const counts = new Map();

    analyzedRows.forEach((row) => {
      const policyNumber = normalizePolicyNumber(row.policyNumber);
      if (!policyNumber) return;
      counts.set(policyNumber, (counts.get(policyNumber) || 0) + 1);
    });

    return new Set(
      [...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([policyNumber]) => policyNumber)
    );
  }, [analyzedRows]);

  function rowBlockingReason(row) {
    if (!row.nif) return "Sem NIF";
    if (!row.policyNumber) return "Sem nº apólice";
    if (duplicatedPoliciesInExcel.has(normalizePolicyNumber(row.policyNumber))) {
      return "Apólice duplicada no Excel";
    }

    return "";
  }

  function rowQualityWarnings(row) {
    const warnings = [];

    if (!row.phone) warnings.push("Sem telefone");
    if (!row.email) warnings.push("Sem email");
    if (!row.address) warnings.push("Sem morada");
    if (!row.postalCode) warnings.push("Sem código postal");
    if (!row.branch) warnings.push("Sem ramo");
    if (!row.commercialPremium && !row.premium) warnings.push("Sem prémio");
    if (!row.commission) warnings.push("Sem comissão");

    return warnings;
  }

  const summary = useMemo(() => {
    const clientsNew = analyzedRows.filter(
      (row) => row.nif && !row.existingClient
    ).length;

    const clientsExisting = analyzedRows.filter(
      (row) => row.nif && row.existingClient
    ).length;

    const policiesNew = analyzedRows.filter(
      (row) =>
        row.policyNumber &&
        !row.existingPolicy &&
        !duplicatedPoliciesInExcel.has(normalizePolicyNumber(row.policyNumber))
    ).length;

    const policiesExisting = analyzedRows.filter(
      (row) => row.policyNumber && row.existingPolicy
    ).length;

    const rowsWithErrors = analyzedRows.filter((row) => rowBlockingReason(row)).length;

    const withoutPhone = analyzedRows.filter((row) => !row.phone).length;
    const withoutEmail = analyzedRows.filter((row) => !row.email).length;
    const withoutAddress = analyzedRows.filter((row) => !row.address).length;
    const withoutPostalCode = analyzedRows.filter((row) => !row.postalCode).length;
    const withoutBranch = analyzedRows.filter((row) => !row.branch).length;
    const withoutPremium = analyzedRows.filter((row) => !row.commercialPremium && !row.premium).length;
    const withoutCommission = analyzedRows.filter((row) => !row.commission).length;

    return {
      total: analyzedRows.length,
      clientsNew,
      clientsExisting,
      policiesNew,
      policiesExisting,
      rowsWithErrors,
      duplicatedNifs: duplicatedNifsInExcel.size,
      duplicatedPolicies: duplicatedPoliciesInExcel.size,
      withoutPhone,
      withoutEmail,
      withoutAddress,
      withoutPostalCode,
      withoutBranch,
      withoutPremium,
      withoutCommission,
    };
  }, [analyzedRows, duplicatedNifsInExcel, duplicatedPoliciesInExcel]);

  const filteredPreviewRows = useMemo(() => {
    const term = cleanText(previewSearch);
    const numbers = onlyNumbers(previewSearch);

    if (!term && !numbers) return analyzedRows;

    return analyzedRows.filter((row) => {
      const text = cleanText(`
        ${row.clientName || ""}
        ${row.nif || ""}
        ${row.policyNumber || ""}
        ${row.existingClient?.name || ""}
        ${row.existingClient?.nif || ""}
        ${row.existingPolicy?.policy_number || ""}
        ${row.phone || ""}
        ${row.email || ""}
        ${row.address || ""}
        ${row.locality || ""}
        ${row.postalCode || ""}
        ${row.branch || ""}
      `);

      const numericText = onlyNumbers(`
        ${row.nif || ""}
        ${row.policyNumber || ""}
        ${row.existingClient?.nif || ""}
        ${row.existingPolicy?.policy_number || ""}
        ${row.phone || ""}
        ${row.email || ""}
        ${row.address || ""}
        ${row.locality || ""}
        ${row.postalCode || ""}
        ${row.branch || ""}
      `);

      return (
        text.includes(term) ||
        (numbers && numericText.includes(numbers))
      );
    });
  }, [analyzedRows, previewSearch]);

  async function readExcel(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setLoading(true);
    setErrorMessage("");
    setImportResult(null);
    setRows([]);
    setFileName(file.name);

    try {
      const XLSX = await loadSheetJs();
      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
      });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const jsonRows = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: false,
      });

      setRows(jsonRows);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "Não foi possível ler o Excel. Confirma se o ficheiro é um Excel válido da Real Vida ou Generali."
      );
    } finally {
      setLoading(false);
    }
  }


  async function confirmImport() {
    const confirm = window.confirm(
      "Confirmas a importação Real Vida?\n\nSerão criados clientes novos e criadas/atualizadas apólices. A importação NÃO preenche data de início e deixa o ramo em branco para preencher manualmente. Apólices existentes só atualizam prémio, comissão, fracionamento, estado e data de renovação."
    );

    if (!confirm) return;

    if (!realVida) {
      alert("Não encontrei a seguradora REAL VIDA na tabela insurers.");
      return;
    }

    setImporting(true);
    setErrorMessage("");
    setImportResult(null);

    const result = {
      clientsCreated: 0,
      clientsUpdated: 0,
      policiesCreated: 0,
      policiesUpdated: 0,
      skipped: 0,
      errors: [],
    };

    const localClientsByNif = new Map(existingClientsByNif);
    const localPoliciesByNumber = new Map(existingPoliciesByNumber);

    for (const row of analyzedRows) {
      try {
        if (!row.nif || !row.clientName || !row.policyNumber) {
          result.skipped += 1;
          result.errors.push(
            `Linha ${row.index}: falta NIF, cliente ou nº apólice.`
          );
          continue;
        }

        let client = localClientsByNif.get(row.nif);

        if (client) {
          const { error: clientUpdateError } = await supabase
            .from("clients")
            .update({
              name: client.name || row.clientName,
              status: "ativo",
            })
            .eq("id", client.id);

          if (clientUpdateError) {
            throw clientUpdateError;
          }

          result.clientsUpdated += 1;
        } else {
          const { data: createdClient, error: clientCreateError } =
            await supabase
              .from("clients")
              .insert({
                type: "particular",
                status: "ativo",
                name: row.clientName,
                nif: row.nif,
              })
              .select("id, name, nif")
              .single();

          if (clientCreateError) {
            throw clientCreateError;
          }

          client = createdClient;
          localClientsByNif.set(row.nif, client);
          result.clientsCreated += 1;
        }

        const normalizedPolicyNumber =
          normalizePolicyNumber(row.policyNumber);

        const existingPolicy =
          localPoliciesByNumber.get(normalizedPolicyNumber);

        const policyPayload = {
          client_id: client.id,
          insurer_id: realVida.id,
          policy_number: row.policyNumber,
          status: row.status,
          renewal_date: row.renewalDate || null,
          annual_premium: row.commercialPremium || row.premium || 0,
          payment_frequency: row.paymentFrequency || "Anual",
          commission_per_payment: row.commission || 0,
        };

        if (existingPolicy) {
          const { error: policyUpdateError } = await supabase
            .from("policies")
            .update({
              status: policyPayload.status,
              renewal_date: policyPayload.renewal_date,
              annual_premium: policyPayload.annual_premium,
              payment_frequency: policyPayload.payment_frequency,
              commission_per_payment: policyPayload.commission_per_payment,
            })
            .eq("id", existingPolicy.id);

          if (policyUpdateError) {
            throw policyUpdateError;
          }

          result.policiesUpdated += 1;
        } else {
          const { data: createdPolicy, error: policyCreateError } =
            await supabase
              .from("policies")
              .insert({
                ...policyPayload,
                branch: "",
              })
              .select("id, policy_number, client_id")
              .single();

          if (policyCreateError) {
            throw policyCreateError;
          }

          localPoliciesByNumber.set(
            normalizePolicyNumber(createdPolicy.policy_number),
            createdPolicy
          );

          result.policiesCreated += 1;
        }
      } catch (error) {
        result.errors.push(
          `Linha ${row.index}: ${error.message || "erro desconhecido"}`
        );
      }
    }

    setImportResult(result);
    setImporting(false);
  }


  async function confirmGeneraliImport() {
    const confirm = window.confirm(
      "Confirmas a importação Generali?\n\nRegras:\n- Clientes existentes por NIF serão usados e NÃO serão duplicados.\n- Dados do cliente existente só são preenchidos se estiverem vazios.\n- Clientes novos serão criados.\n- Apólices já existentes serão ignoradas.\n- Linhas sem NIF, sem nº apólice ou com nº apólice repetido no Excel NÃO serão importadas.\n- NIF repetido é permitido quando o cliente tem várias apólices.\n- A comissão importada é a soma da Comissão Cobrança + Comissão Distribuição.\n- O prémio comercial anual é calculado pelo período do recibo."
    );

    if (!confirm) return;

    if (!generali) {
      alert("Não encontrei a seguradora GENERALI na tabela insurers.");
      return;
    }

    setImporting(true);
    setErrorMessage("");
    setImportResult(null);

    const result = {
      clientsCreated: 0,
      clientsUpdated: 0,
      clientsEnriched: 0,
      clientsSkipped: 0,
      policiesCreated: 0,
      policiesUpdated: 0,
      policiesExistingIgnored: 0,
      skipped: 0,
      qualityWarnings: {
        withoutPhone: 0,
        withoutEmail: 0,
        withoutAddress: 0,
        withoutPostalCode: 0,
        withoutBranch: 0,
        withoutPremium: 0,
        withoutCommission: 0,
      },
      errors: [],
    };

    const localClientsByNif = new Map(existingClientsByNif);
    const localPoliciesByNumber = new Map(existingPoliciesByNumber);

    for (const row of analyzedRows) {
      try {
        const blockingReason = rowBlockingReason(row);

        if (blockingReason) {
          result.skipped += 1;
          result.errors.push(`Linha ${row.index}: ${blockingReason}.`);
          continue;
        }

        const warnings = rowQualityWarnings(row);

        warnings.forEach((warning) => {
          if (warning === "Sem telefone") result.qualityWarnings.withoutPhone += 1;
          if (warning === "Sem email") result.qualityWarnings.withoutEmail += 1;
          if (warning === "Sem morada") result.qualityWarnings.withoutAddress += 1;
          if (warning === "Sem código postal") result.qualityWarnings.withoutPostalCode += 1;
          if (warning === "Sem ramo") result.qualityWarnings.withoutBranch += 1;
          if (warning === "Sem prémio") result.qualityWarnings.withoutPremium += 1;
          if (warning === "Sem comissão") result.qualityWarnings.withoutCommission += 1;
        });

        let client = localClientsByNif.get(row.nif);

        if (client) {
          const updatePayload = {
            name: client.name || row.clientName,
            status: "ativo",
          };

          if (row.phone) updatePayload.phone = row.phone;
          if (row.email) updatePayload.email = row.email;
          if (row.address) updatePayload.address = row.address;
          if (row.locality) updatePayload.city = row.locality;
          if (row.postalCode) updatePayload.postal_code = row.postalCode;

          const { error: clientUpdateError } = await supabase
            .from("clients")
            .update(updatePayload)
            .eq("id", client.id);

          if (clientUpdateError) {
            throw clientUpdateError;
          }

          result.clientsUpdated += 1;

          if (row.phone || row.email || row.address || row.locality || row.postalCode) {
            result.clientsEnriched += 1;
          }
        } else {
          const insertPayload = {
            type: "particular",
            status: "ativo",
            name: row.clientName,
            nif: row.nif,
          };

          if (row.phone) insertPayload.phone = row.phone;
          if (row.email) insertPayload.email = row.email;
          if (row.address) insertPayload.address = row.address;
          if (row.locality) insertPayload.city = row.locality;
          if (row.postalCode) insertPayload.postal_code = row.postalCode;

          const { data: createdClient, error: clientCreateError } =
            await supabase
              .from("clients")
              .insert(insertPayload)
              .select("id, name, nif")
              .single();

          if (clientCreateError) {
            throw clientCreateError;
          }

          client = createdClient;
          localClientsByNif.set(row.nif, client);
          result.clientsCreated += 1;
        }

        const normalizedPolicyNumber = normalizePolicyNumber(row.policyNumber);
        const existingPolicy = localPoliciesByNumber.get(normalizedPolicyNumber);

        if (existingPolicy) {
          result.policiesExistingIgnored += 1;
          continue;
        }

        const { data: createdPolicy, error: policyCreateError } =
          await supabase
            .from("policies")
            .insert({
              client_id: client.id,
              insurer_id: generali.id,
              policy_number: row.policyNumber,
              status: row.status,
              branch: row.branch || "",
              start_date: null,
              renewal_date: row.renewalDate || null,
              annual_premium: row.commercialPremium || row.premium || 0,
              payment_frequency: row.paymentFrequency || "Anual",
              commission_per_payment: row.commission || 0,
            })
            .select("id, policy_number, client_id")
            .single();

        if (policyCreateError) {
          throw policyCreateError;
        }

        localPoliciesByNumber.set(
          normalizePolicyNumber(createdPolicy.policy_number),
          createdPolicy
        );

        result.policiesCreated += 1;
      } catch (error) {
        result.errors.push(
          `Linha ${row.index}: ${error.message || "erro desconhecido"}`
        );
      }
    }

    setImportResult(result);
    setImporting(false);
  }

  return (
    <div style={page}>
      <Sidebar active="importacoes" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Importações</h1>
            <p style={subtitle}>
              Importação segura com pré-visualização antes de gravar dados no CRM.
            </p>
          </div>
        </header>

        <section style={card}>
          <h2>Importar Excel</h2>

          <div style={modeSelector}>
            <button
              type="button"
              style={importMode === "realvida" ? modeButtonActive : modeButton}
              onClick={() => {
                setImportMode("realvida");
                setRows([]);
                setFileName("");
                setImportResult(null);
                setErrorMessage("");
              }}
            >
              Real Vida
            </button>

            <button
              type="button"
              style={importMode === "generali" ? modeButtonActive : modeButton}
              onClick={() => {
                setImportMode("generali");
                setRows([]);
                setFileName("");
                setImportResult(null);
                setErrorMessage("");
              }}
            >
              Generali
            </button>
          </div>

          <p style={muted}>
            {importMode === "realvida"
              ? "Esta versão lê, valida e permite importar após confirmação. Por segurança, não preenche data de início e deixa o ramo em branco para preencher manualmente. Os nomes dos clientes são gravados com maiúscula apenas na primeira letra de cada nome. O nº de apólice Real Vida é tratado como Mod/Apolice e compara 07/170634 com 7/170634."
              : "Esta fase lê e valida o Excel Generali em pré-visualização, sem gravar nada no CRM. Vamos confirmar clientes, NIF, telefone, email, morada, apólice, ramo, prémio, comissão e datas antes de ativar a importação final."}
          </p>

          {importMode === "realvida" && !realVida && (
            <div style={warningBox}>
              Não encontrei a seguradora REAL VIDA na tabela insurers.
              A pré-visualização funciona, mas antes da importação final convém confirmar a seguradora.
            </div>
          )}

          {importMode === "generali" && !generali && (
            <div style={warningBox}>
              Não encontrei a seguradora GENERALI na tabela insurers.
              A pré-visualização funciona, mas antes da importação final convém confirmar a seguradora.
            </div>
          )}

          <label style={uploadBox}>
            <strong>Escolher ficheiro Excel</strong>
            <span>{fileName || "Nenhum ficheiro selecionado"}</span>

            <input
              type="file"
              accept=".xls,.xlsx,.csv"
              onChange={readExcel}
              style={{ display: "none" }}
            />
          </label>

          {loading && (
            <p style={muted}>A ler ficheiro...</p>
          )}

          {errorMessage && (
            <div style={errorBox}>{errorMessage}</div>
          )}
        </section>

        {analyzedRows.length > 0 && (
          <>
            <section style={summaryGrid}>
              <SummaryCard title="Linhas encontradas" value={summary.total} color="#111827" />
              <SummaryCard title="Clientes existentes" value={summary.clientsExisting} color="#2563eb" />
              <SummaryCard title="Clientes novos" value={summary.clientsNew} color="#16a34a" />
              <SummaryCard title="Apólices existentes" value={summary.policiesExisting} color="#7c3aed" />
              <SummaryCard title="Apólices novas" value={summary.policiesNew} color="#0f766e" />
              <SummaryCard title="Linhas bloqueadas" value={summary.rowsWithErrors} color="#dc2626" />
              <SummaryCard title="NIF repetidos Excel" value={summary.duplicatedNifs} color="#2563eb" />
              <SummaryCard title="Apólices duplicadas Excel" value={summary.duplicatedPolicies} color="#f59e0b" />
            </section>

            <section style={qualityGrid}>
              <QualityCard title="Sem telefone" value={summary.withoutPhone} />
              <QualityCard title="Sem email" value={summary.withoutEmail} />
              <QualityCard title="Sem morada" value={summary.withoutAddress} />
              <QualityCard title="Sem código postal" value={summary.withoutPostalCode} />
              <QualityCard title="Sem ramo" value={summary.withoutBranch} />
              <QualityCard title="Sem prémio" value={summary.withoutPremium} />
              <QualityCard title="Sem comissão" value={summary.withoutCommission} />
            </section>

            <section style={card}>
              <div style={tableHeaderArea}>
                <div>
                  <h2>Pré-visualização</h2>
                  <p style={muted}>
                    Confirma estes dados antes de avançarmos para a fase de importação final.
                  </p>
                </div>

                {importMode === "realvida" ? (
                  <button
                    style={importButton}
                    onClick={confirmImport}
                    disabled={importing || summary.rowsWithErrors > 0}
                  >
                    {importing ? "A importar..." : "Confirmar importação"}
                  </button>
                ) : (
                  <button
                    style={importButton}
                    onClick={confirmGeneraliImport}
                    disabled={importing}
                  >
                    {importing ? "A importar..." : "Confirmar importação Generali"}
                  </button>
                )}
              </div>

              {summary.rowsWithErrors > 0 && (
                <div style={warningBox}>
                  Existem linhas bloqueadas. Só ficam bloqueadas linhas sem NIF, sem nº apólice ou com nº apólice repetido no Excel. NIF repetido é permitido quando o cliente tem várias apólices.
                </div>
              )}

              {importResult && (
                <div style={resultBox}>
                  <h3 style={{ marginTop: 0 }}>Importação concluída</h3>

                  <div style={resultGrid}>
                    <span>Clientes criados: <strong>{importResult.clientsCreated}</strong></span>
                    <span>Clientes atualizados: <strong>{importResult.clientsUpdated}</strong></span>
                    <span>Clientes enriquecidos: <strong>{importResult.clientsEnriched || 0}</strong></span>
                    <span>Apólices criadas: <strong>{importResult.policiesCreated}</strong></span>
                    <span>Apólices atualizadas: <strong>{importResult.policiesUpdated || 0}</strong></span>
                    <span>Apólices já existentes: <strong>{importResult.policiesExistingIgnored || 0}</strong></span>
                    <span>Linhas ignoradas: <strong>{importResult.skipped}</strong></span>
                    <span>Erros/alertas: <strong>{importResult.errors.length}</strong></span>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div style={errorList}>
                      {importResult.errors.slice(0, 20).map((error, index) => (
                        <div key={index}>{error}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {analyzedRows.length > 0 && (
            <section style={newClientsWorkPanel}>
              <div>
                <h3 style={workPanelTitle}>Trabalhar clientes novos Generali</h3>
                <p style={workPanelText}>
                  Usa este painel para focar apenas os clientes novos, completar dados em falta e abrir oportunidades comerciais.
                </p>
              </div>

              <div style={newClientsStatsGrid}>
                <Summary title="Novos" value={newClientWorkSummary.total} />
                <Summary title="Sem telefone" value={newClientWorkSummary.missingPhone} />
                <Summary title="Sem email" value={newClientWorkSummary.missingEmail} />
                <Summary title="Com telefone" value={newClientWorkSummary.withPhone} />
              </div>

              <div style={workFilters}>
                <label style={checkLabel}>
                  <input
                    type="checkbox"
                    checked={onlyNewClients}
                    onChange={(event) => setOnlyNewClients(event.target.checked)}
                  />
                  Apenas clientes novos
                </label>

                <label style={checkLabel}>
                  <input
                    type="checkbox"
                    checked={onlyMissingPhone}
                    onChange={(event) => setOnlyMissingPhone(event.target.checked)}
                  />
                  Sem telefone
                </label>

                <label style={checkLabel}>
                  <input
                    type="checkbox"
                    checked={onlyMissingEmail}
                    onChange={(event) => setOnlyMissingEmail(event.target.checked)}
                  />
                  Sem email
                </label>
              </div>
            </section>
          )}

          <div style={previewSearchBox}>
                <label style={previewSearchLabel}>
                  Pesquisar na pré-visualização
                </label>

                <input
                  style={previewSearchInput}
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  placeholder="Pesquisar por nome, NIF ou nº apólice..."
                />

                <p style={muted}>
                  Resultados na pré-visualização: {filteredPreviewRows.length}
                </p>
              </div>

              <div style={table}>
                <div style={tableHeader}>
                  <span>#</span>
                  <span>Cliente</span>
                  <span>NIF</span>
                  <span>Telefone</span>
                  <span>Email</span>
                  <span>Apólice</span>
                  <span>Ramo</span>
                  <span>Início</span>
                  <span>Até</span>
                  <span>Prémio anual</span>
                  <span>Comissão total</span>
                  <span>Cliente</span>
                  <span>Apólice</span>
                </div>

                {filteredPreviewRows.map((row) => {
                  const blockingReason = rowBlockingReason(row);
                  const qualityWarnings = rowQualityWarnings(row);
                  const hasWarning = Boolean(blockingReason);

                  return (
                    <div
                      key={`${row.index}-${row.policyNumber}-${row.nif}`}
                      style={{
                        ...tableRow,
                        ...(hasWarning ? tableRowWarning : {}),
                      }}
                    >
                      <span>{row.index}</span>

                      <div>
                        <strong>
                          {row.clientName || "Sem nome"}
                        </strong>

                        {row.existingClient && (
                          <div style={matchedText}>
                            CRM: {row.existingClient.name}
                          </div>
                        )}

                        {blockingReason && (
                          <div style={warningText}>
                            ⚠ {blockingReason}
                          </div>
                        )}

                        {!blockingReason && qualityWarnings.length > 0 && (
                          <div style={softWarningText}>
                            ⚠ {qualityWarnings.slice(0, 3).join(" · ")}
                          </div>
                        )}
                      </div>

                      <span>
                        {row.nif || "-"}
                      </span>

                      <span>
                        {row.phone || "-"}
                      </span>

                      <span>
                        {row.email || "-"}
                      </span>

                      <span>
                        {row.policyNumber || "-"}
                      </span>

                      <span>
                        {row.branch || "-"}
                      </span>

                      <span>
                        {row.startDate || "-"}
                      </span>

                      <span>
                        {row.renewalDate || "-"}
                      </span>

                      <strong>
                        {formatEuro(row.commercialPremium)}
                      </strong>

                      <span>
                        {formatEuro(row.commission)}
                      </span>

                      <span style={row.existingClient ? badgeExisting : badgeNew}>
                        {row.existingClient ? "EXISTE" : "NOVO"}
                      </span>

                      <span style={row.existingPolicy ? badgeExisting : badgeNew}>
                        {row.existingPolicy ? "EXISTE" : "NOVA"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function QualityCard({ title, value }) {
  const hasWarning = Number(value || 0) > 0;

  return (
    <div style={hasWarning ? qualityCardWarning : qualityCard}>
      <p style={qualityLabel}>{title}</p>
      <strong style={hasWarning ? qualityValueWarning : qualityValue}>{value}</strong>
    </div>
  );
}

function SummaryCard({ title, value, color }) {
  return (
    <div style={{ ...summaryCard, borderTop: `6px solid ${color}` }}>
      <p style={summaryLabel}>{title}</p>
      <h2 style={{ ...summaryValue, color }}>{value}</h2>
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

const card = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const modeSelector = {
  display: "flex",
  gap: 10,
  margin: "18px 0",
  flexWrap: "wrap",
};

const modeButton = {
  background: "#f3f4f6",
  color: "#374151",
  border: "1px solid #d1d5db",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const modeButtonActive = {
  background: "#2563eb",
  color: "white",
  border: "1px solid #2563eb",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const uploadBox = {
  display: "grid",
  gap: 8,
  border: "2px dashed #bfdbfe",
  background: "#eff6ff",
  color: "#1d4ed8",
  padding: 24,
  borderRadius: 16,
  cursor: "pointer",
  marginTop: 18,
};

const warningBox = {
  background: "#fef3c7",
  border: "1px solid #f59e0b",
  color: "#92400e",
  padding: 14,
  borderRadius: 12,
  marginTop: 12,
};

const errorBox = {
  background: "#fee2e2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  padding: 14,
  borderRadius: 12,
  marginTop: 12,
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 16,
  marginBottom: 24,
};

const summaryCard = {
  background: "white",
  padding: 20,
  borderRadius: 16,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const summaryLabel = {
  color: "#6b7280",
  margin: 0,
};

const summaryValue = {
  fontSize: 30,
  margin: "10px 0 0",
};

const qualityGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
  marginBottom: 24,
};

const qualityCard = {
  background: "white",
  padding: 14,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
};

const qualityCardWarning = {
  background: "#fff7ed",
  padding: 14,
  borderRadius: 14,
  border: "1px solid #fdba74",
};

const qualityLabel = {
  color: "#6b7280",
  margin: 0,
  fontSize: 13,
};

const qualityValue = {
  display: "block",
  marginTop: 6,
  color: "#16a34a",
  fontSize: 24,
};

const qualityValueWarning = {
  display: "block",
  marginTop: 6,
  color: "#dc2626",
  fontSize: 24,
};

const importButton = {
  background: "#16a34a",
  color: "white",
  border: "none",
  padding: "12px 16px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const resultBox = {
  background: "#dcfce7",
  border: "1px solid #86efac",
  color: "#166534",
  padding: 16,
  borderRadius: 14,
  marginBottom: 16,
};

const resultGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
};

const errorList = {
  background: "white",
  color: "#991b1b",
  padding: 12,
  borderRadius: 10,
  marginTop: 12,
  display: "grid",
  gap: 6,
};

const previewSearchBox = {
  background: "#f9fafb",
  padding: 14,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  marginBottom: 16,
};

const previewSearchLabel = {
  display: "block",
  fontSize: 13,
  color: "#6b7280",
  fontWeight: "bold",
  marginBottom: 8,
};

const previewSearchInput = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 15,
  boxSizing: "border-box",
};

const matchedText = {
  color: "#2563eb",
  fontSize: 12,
  marginTop: 4,
  fontWeight: "bold",
};

const warningText = {
  color: "#dc2626",
  fontSize: 12,
  marginTop: 4,
  fontWeight: "bold",
};

const softWarningText = {
  color: "#92400e",
  fontSize: 12,
  marginTop: 4,
  fontWeight: "bold",
};

const tableHeaderArea = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
};

const table = {
  display: "grid",
  gap: 8,
  overflowX: "auto",
};

const tableHeader = {
  display: "grid",
  gridTemplateColumns: "0.4fr 2fr 1fr 1fr 1.4fr 1.2fr 1.2fr 1fr 1fr 1.2fr 1fr 0.8fr 0.8fr",
  gap: 10,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 13,
  minWidth: 1500,
};

const tableRow = {
  display: "grid",
  gridTemplateColumns: "0.4fr 2fr 1fr 1fr 1.4fr 1.2fr 1.2fr 1fr 1fr 1.2fr 1fr 0.8fr 0.8fr",
  gap: 10,
  padding: "12px 14px",
  borderBottom: "1px solid #e5e7eb",
  alignItems: "center",
  minWidth: 1500,
  fontSize: 13,
};

const tableRowWarning = {
  background: "#fff7ed",
};

const badgeExisting = {
  background: "#dbeafe",
  color: "#1d4ed8",
  padding: "5px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: "bold",
  textAlign: "center",
};

const badgeNew = {
  background: "#dcfce7",
  color: "#166534",
  padding: "5px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: "bold",
  textAlign: "center",
};

const muted = {
  color: "#6b7280",
};


const newClientsWorkPanel = {
  background: "linear-gradient(135deg, #ecfdf5, #eff6ff)",
  border: "1px solid #bbf7d0",
  borderRadius: 16,
  padding: 16,
  marginBottom: 18,
  display: "grid",
  gap: 12,
};

const workPanelTitle = {
  margin: 0,
  color: "#166534",
};

const workPanelText = {
  margin: "6px 0 0",
  color: "#475569",
};

const newClientsStatsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
};

const workFilters = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
};

const checkLabel = {
  background: "white",
  border: "1px solid #d1fae5",
  borderRadius: 999,
  padding: "8px 12px",
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontWeight: "bold",
  color: "#166534",
};

const rowActions = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const miniActionButton = {
  background: "#111827",
  color: "white",
  padding: "7px 10px",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: "bold",
  display: "inline-block",
};

const miniOpportunityButton = {
  background: "#0f766e",
  color: "white",
  padding: "7px 10px",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: "bold",
  display: "inline-block",
};
