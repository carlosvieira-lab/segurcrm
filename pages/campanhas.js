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

const insurers = ["REAL VIDA", "GENERALI", "ZURICH", "AGEAS", "ALLIANZ", "OUTRA"];
const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export async function getServerSideProps() {
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("*")
    .order("start_date", { ascending: false });

  const { data: contributions } = await supabase
    .from("campaign_external_policy_items")
    .select("*")
    .order("created_at", { ascending: true });

  const { data: policies } = await supabase
    .from("policies")
    .select(`
      id,
      client_id,
      policy_number,
      branch,
      status,
      start_date,
      created_at,
      annual_premium,
      clients(id, name, nif),
      insurers(name)
    `)
    .neq("status", "anulada");

  return {
    props: {
      campaigns: campaigns || [],
      contributions: contributions || [],
      policies: policies || [],
    },
  };
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
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

  const text = String(value).replace(/\s/g, "").replace("€", "").trim();
  if (!text) return 0;

  if (text.includes(",")) {
    return Number(text.replace(/\./g, "").replace(",", ".")) || 0;
  }

  return Number(text) || 0;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function getCampaignThresholds(campaign) {
  if (Array.isArray(campaign.thresholds)) return campaign.thresholds;

  try {
    return JSON.parse(campaign.thresholds || "[]");
  } catch {
    return [];
  }
}

function parseThresholdsText(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [target, bonus] = line.split(":");
      return {
        target: parseDecimal(target),
        bonus: parseDecimal(bonus),
      };
    })
    .filter((item) => item.target > 0)
    .sort((a, b) => a.target - b.target);
}

function getUniqueBranches(policies) {
  return [...new Set(
    policies
      .map((policy) => String(policy.branch || "").trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));
}

function getPolicyCampaignDate(policy, campaign) {
  if (campaign.date_basis === "created_at") {
    return policy.created_at || null;
  }

  return policy.start_date || null;
}

function getDateBasisLabel(dateBasis) {
  if (dateBasis === "created_at") return "Data de criação no CRM";
  return "Data de início da apólice";
}

function policyCountsForCampaign(policy, campaign) {
  const rawDate = getPolicyCampaignDate(policy, campaign);
  const policyDate = rawDate ? new Date(rawDate) : null;
  const startDate = new Date(campaign.start_date);
  const endDate = new Date(campaign.end_date);

  if (!policyDate || Number.isNaN(policyDate.getTime())) return false;

  const policyInsurer = normalizeText(policy.insurers?.name);
  const campaignInsurer = normalizeText(campaign.insurer_name);

  if (!policyInsurer.includes(campaignInsurer)) return false;

  const allowedBranches = (campaign.product_branches || []).map(normalizeText);
  const policyBranch = normalizeText(policy.branch);

  if (allowedBranches.length > 0 && !allowedBranches.includes(policyBranch)) {
    return false;
  }

  return policyDate >= startDate && policyDate <= endDate;
}

function calculateCampaignResult(campaign, policies, contributions) {
  const matchingPolicies = policies.filter((policy) =>
    policyCountsForCampaign(policy, campaign)
  );

  const internalPremium = matchingPolicies.reduce(
    (sum, policy) => sum + Number(policy.annual_premium || 0),
    0
  );

  const campaignContributions = contributions.filter(
    (contribution) => contribution.campaign_id === campaign.id
  );

  const externalPremium = campaignContributions.reduce(
    (sum, contribution) => sum + Number(contribution.annual_premium || 0),
    0
  );

  const totalPremium = internalPremium + externalPremium;

  const thresholds = getCampaignThresholds(campaign)
    .map((threshold) => ({
      target: Number(threshold.target || 0),
      bonus: Number(threshold.bonus || 0),
    }))
    .sort((a, b) => a.target - b.target);

  const achievedThresholds = thresholds.filter(
    (threshold) => totalPremium >= threshold.target
  );

  const currentThreshold =
    achievedThresholds.length > 0
      ? achievedThresholds[achievedThresholds.length - 1]
      : null;

  const nextThreshold =
    thresholds.find((threshold) => totalPremium < threshold.target) || null;

  return {
    matchingPolicies,
    internalPremium,
    externalPremium,
    totalPremium,
    thresholds,
    currentBonus: currentThreshold?.bonus || 0,
    currentTarget: currentThreshold?.target || 0,
    nextTarget: nextThreshold?.target || null,
    nextBonus: nextThreshold?.bonus || null,
    missingToNext: nextThreshold
      ? Math.max(nextThreshold.target - totalPremium, 0)
      : 0,
    campaignContributions,
  };
}

function buildInitialCampaignForm(availableBranches) {
  return {
    name: "",
    insurer_name: "REAL VIDA",
    product_branches: availableBranches.slice(0, 0),
    start_date: todayIso(),
    end_date: todayIso(),
    date_basis: "start_date",
    payment_month: new Date().getMonth() + 1,
    payment_year: new Date().getFullYear(),
    thresholds_text: "1000:50\n2000:120\n5000:350\n7500:600\n10000:900",
    notes: "",
  };
}

export default function Campanhas({ campaigns, contributions, policies }) {
  const availableBranches = useMemo(() => getUniqueBranches(policies), [policies]);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newCampaign, setNewCampaign] = useState(() =>
    buildInitialCampaignForm(availableBranches)
  );
  const [savingCampaignId, setSavingCampaignId] = useState(null);
  const [externalForms, setExternalForms] = useState({});

  const activeCampaigns = campaigns.filter(
    (campaign) => campaign.is_active && campaign.payment_status !== "pago"
  );
  const paidCampaigns = campaigns.filter(
    (campaign) => campaign.payment_status === "pago"
  );

  function getExternalForm(campaignId) {
    return (
      externalForms[campaignId] || {
        contributor_name: "Délia",
        client_name: "",
        policy_number: "",
        annual_premium: "",
        notes: "",
      }
    );
  }

  async function createCampaign(event) {
    event.preventDefault();

    if (
      !newCampaign.name ||
      !newCampaign.insurer_name ||
      !newCampaign.start_date ||
      !newCampaign.end_date
    ) {
      alert("Preenche nome, seguradora e período da campanha.");
      return;
    }

    const { error } = await supabase.from("campaigns").insert({
      name: newCampaign.name,
      insurer_name: newCampaign.insurer_name,
      product_branches: newCampaign.product_branches,
      start_date: newCampaign.start_date,
      end_date: newCampaign.end_date,
      date_basis: newCampaign.date_basis,
      thresholds: parseThresholdsText(newCampaign.thresholds_text),
      payment_month: Number(newCampaign.payment_month || 0) || null,
      payment_year: Number(newCampaign.payment_year || 0) || null,
      notes: newCampaign.notes || null,
      payment_status: "pendente",
      is_active: true,
    });

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function addExternalPolicy(campaignId) {
    const form = getExternalForm(campaignId);

    if (!form.client_name || !form.annual_premium) {
      alert("Preenche pelo menos o nome do cliente e o prémio anual.");
      return;
    }

    setSavingCampaignId(campaignId);

    const { error } = await supabase
      .from("campaign_external_policy_items")
      .insert({
        campaign_id: campaignId,
        contributor_name: form.contributor_name || "Délia",
        client_name: form.client_name,
        policy_number: form.policy_number || null,
        annual_premium: parseDecimal(form.annual_premium),
        notes: form.notes || null,
      });

    setSavingCampaignId(null);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function deleteExternalPolicy(itemId) {
    const ok = window.confirm("Eliminar esta contribuição externa?");
    if (!ok) return;

    const { error } = await supabase
      .from("campaign_external_policy_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function updateCampaign(campaign, updates) {
    const { error } = await supabase
      .from("campaigns")
      .update(updates)
      .eq("id", campaign.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function markPaid(campaign) {
    const ok = window.confirm("Marcar esta campanha como paga?");
    if (!ok) return;

    await updateCampaign(campaign, {
      payment_status: "pago",
      paid_at: new Date().toISOString(),
    });
  }

  async function markPending(campaign) {
    await updateCampaign(campaign, {
      payment_status: "pendente",
      paid_at: null,
    });
  }

  const totals = useMemo(() => {
    return campaigns.reduce(
      (acc, campaign) => {
        const result = calculateCampaignResult(
          campaign,
          policies,
          contributions
        );

        if (campaign.payment_status === "pago") {
          acc.paidBonus += result.currentBonus;
        } else {
          acc.pendingBonus += result.currentBonus;
        }

        acc.totalBonus += result.currentBonus;
        acc.totalPremium += result.totalPremium;
        acc.totalPolicies += result.matchingPolicies.length;
        acc.externalPolicies += result.campaignContributions.length;
        return acc;
      },
      {
        totalPremium: 0,
        totalBonus: 0,
        paidBonus: 0,
        pendingBonus: 0,
        totalPolicies: 0,
        externalPolicies: 0,
      }
    );
  }, [campaigns, policies, contributions]);

  return (
    <div style={page}>
      <Sidebar active="campanhas" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Campanhas</h1>
            <p style={subtitle}>
              Campanhas por seguradora, período, produtos, produção CRM, Délia e controlo de pagamento.
            </p>
          </div>

          <button style={button} onClick={() => setShowNewForm(!showNewForm)}>
            + Nova Campanha
          </button>
        </header>

        <section style={summaryGrid}>
          <Summary title="Campanhas ativas" value={activeCampaigns.length} />
          <Summary title="Apólices CRM" value={totals.totalPolicies} />
          <Summary title="Apólices Délia" value={totals.externalPolicies} />
          <Summary title="Prémio em campanha" value={formatEuro(totals.totalPremium)} />
          <Summary title="Prémios previstos" value={formatEuro(totals.totalBonus)} />
          <Summary title="Por receber" value={formatEuro(totals.pendingBonus)} />
        </section>

        {showNewForm && (
          <section style={formCard}>
            <h2 style={sectionTitle}>Nova campanha</h2>

            <form style={newFormGrid} onSubmit={createCampaign}>
              <label style={fieldLabel}>
                Nome da campanha
                <input
                  style={input}
                  value={newCampaign.name}
                  onChange={(event) =>
                    setNewCampaign({ ...newCampaign, name: event.target.value })
                  }
                  placeholder="Ex: ALERTA VERÃO UMA ONDA DE PROTECÇÃO"
                />
              </label>

              <label style={fieldLabel}>
                Seguradora
                <select
                  style={input}
                  value={newCampaign.insurer_name}
                  onChange={(event) =>
                    setNewCampaign({
                      ...newCampaign,
                      insurer_name: event.target.value,
                    })
                  }
                >
                  {insurers.map((insurer) => (
                    <option key={insurer} value={insurer}>
                      {insurer}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldLabel}>
                Data início campanha
                <input
                  type="date"
                  style={input}
                  value={newCampaign.start_date}
                  onChange={(event) =>
                    setNewCampaign({
                      ...newCampaign,
                      start_date: event.target.value,
                    })
                  }
                />
              </label>

              <label style={fieldLabel}>
                Data fim campanha
                <input
                  type="date"
                  style={input}
                  value={newCampaign.end_date}
                  onChange={(event) =>
                    setNewCampaign({
                      ...newCampaign,
                      end_date: event.target.value,
                    })
                  }
                />
              </label>

              <label style={fieldLabel}>
                Critério de contagem
                <select
                  style={input}
                  value={newCampaign.date_basis}
                  onChange={(event) =>
                    setNewCampaign({
                      ...newCampaign,
                      date_basis: event.target.value,
                    })
                  }
                >
                  <option value="start_date">Data de início da apólice</option>
                  <option value="created_at">Data de criação no CRM</option>
                </select>
              </label>

              <label style={fieldLabel}>
                Mês pagamento
                <select
                  style={input}
                  value={newCampaign.payment_month}
                  onChange={(event) =>
                    setNewCampaign({
                      ...newCampaign,
                      payment_month: Number(event.target.value),
                    })
                  }
                >
                  {monthNames.map((month, index) => (
                    <option key={month} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldLabel}>
                Ano pagamento
                <input
                  style={input}
                  inputMode="numeric"
                  value={newCampaign.payment_year}
                  onChange={(event) =>
                    setNewCampaign({
                      ...newCampaign,
                      payment_year: event.target.value,
                    })
                  }
                />
              </label>

              <div style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
                Produtos/Ramos em campanha
                <div style={branchGrid}>
                  {availableBranches.map((branch) => (
                    <label key={branch} style={checkLabel}>
                      <input
                        type="checkbox"
                        checked={newCampaign.product_branches.includes(branch)}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          const next = checked
                            ? [...newCampaign.product_branches, branch]
                            : newCampaign.product_branches.filter(
                                (item) => item !== branch
                              );

                          setNewCampaign({
                            ...newCampaign,
                            product_branches: next,
                          });
                        }}
                      />
                      {branch}
                    </label>
                  ))}
                </div>
              </div>

              <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
                Escalões
                <textarea
                  style={textarea}
                  value={newCampaign.thresholds_text}
                  onChange={(event) =>
                    setNewCampaign({
                      ...newCampaign,
                      thresholds_text: event.target.value,
                    })
                  }
                />
                <span style={smallMuted}>
                  Um por linha. Exemplo: 1000:50
                </span>
              </label>

              <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
                Observações
                <textarea
                  style={textarea}
                  value={newCampaign.notes}
                  onChange={(event) =>
                    setNewCampaign({ ...newCampaign, notes: event.target.value })
                  }
                />
              </label>

              <button style={button} type="submit">
                Criar campanha
              </button>
            </form>
          </section>
        )}

        <CampaignList
          title="Campanhas ativas / por receber"
          campaigns={activeCampaigns}
          policies={policies}
          contributions={contributions}
          availableBranches={availableBranches}
          externalForms={externalForms}
          setExternalForms={setExternalForms}
          getExternalForm={getExternalForm}
          savingCampaignId={savingCampaignId}
          addExternalPolicy={addExternalPolicy}
          deleteExternalPolicy={deleteExternalPolicy}
          markPaid={markPaid}
          markPending={markPending}
          updateCampaign={updateCampaign}
        />

        <CampaignList
          title="Campanhas pagas / histórico"
          campaigns={paidCampaigns}
          policies={policies}
          contributions={contributions}
          availableBranches={availableBranches}
          externalForms={externalForms}
          setExternalForms={setExternalForms}
          getExternalForm={getExternalForm}
          savingCampaignId={savingCampaignId}
          addExternalPolicy={addExternalPolicy}
          deleteExternalPolicy={deleteExternalPolicy}
          markPaid={markPaid}
          markPending={markPending}
          updateCampaign={updateCampaign}
        />
      </main>
    </div>
  );
}

function Summary({ title, value }) {
  return (
    <div style={summaryBox}>
      <span style={summaryLabel}>{title}</span>
      <strong style={summaryValue}>{value}</strong>
    </div>
  );
}

function CampaignList({
  title,
  campaigns,
  policies,
  contributions,
  availableBranches,
  externalForms,
  setExternalForms,
  getExternalForm,
  savingCampaignId,
  addExternalPolicy,
  deleteExternalPolicy,
  markPaid,
  markPending,
  updateCampaign,
}) {
  return (
    <section style={listSection}>
      <h2 style={sectionTitle}>{title}</h2>

      {campaigns.length === 0 ? (
        <p style={muted}>Sem campanhas nesta secção.</p>
      ) : (
        campaigns.map((campaign) => {
          const result = calculateCampaignResult(
            campaign,
            policies,
            contributions
          );
          const form = getExternalForm(campaign.id);

          return (
            <section key={campaign.id} style={campaignCard}>
              <div style={campaignHeader}>
                <div>
                  <h3 style={campaignTitle}>{campaign.name}</h3>
                  <p style={muted}>
                    {campaign.insurer_name} · {formatDate(campaign.start_date)} a{" "}
                    {formatDate(campaign.end_date)}
                  </p>

                  <p style={basisText}>
                    Critério: <strong>{getDateBasisLabel(campaign.date_basis)}</strong>
                  </p>

                  <div style={tagRow}>
                    {(campaign.product_branches || []).map((branch) => (
                      <span key={branch} style={tag}>
                        {branch}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={bonusBox}>
                  <span style={summaryLabel}>Bónus previsto</span>
                  <strong style={bonusValue}>
                    {formatEuro(result.currentBonus)}
                  </strong>
                  <span
                    style={
                      campaign.payment_status === "pago"
                        ? paidBadge
                        : pendingBadge
                    }
                  >
                    {campaign.payment_status === "pago" ? "PAGO" : "PENDENTE"}
                  </span>
                </div>
              </div>

              <div style={campaignStatsGrid}>
                <Mini title="Prémio CRM" value={formatEuro(result.internalPremium)} />
                <Mini title="Prémio Délia" value={formatEuro(result.externalPremium)} />
                <Mini title="Total campanha" value={formatEuro(result.totalPremium)} />
                <Mini title="Apólices CRM" value={result.matchingPolicies.length} />
                <Mini title="Apólices Délia" value={result.campaignContributions.length} />
                <Mini title="Patamar" value={formatEuro(result.currentTarget)} />
                <Mini
                  title="Próximo"
                  value={
                    result.nextTarget ? formatEuro(result.nextTarget) : "Máximo"
                  }
                />
              </div>

              {result.nextTarget ? (
                <div style={progressInfo}>
                  Faltam <strong>{formatEuro(result.missingToNext)}</strong>{" "}
                  para atingir <strong>{formatEuro(result.nextTarget)}</strong>{" "}
                  e bónus de <strong>{formatEuro(result.nextBonus)}</strong>.
                </div>
              ) : (
                <div style={successInfo}>
                  Campanha no patamar máximo configurado.
                </div>
              )}

              <section style={settingsCard}>
                <h4 style={sectionTitle}>Definições editáveis da campanha</h4>

                <div style={externalGrid}>
                  <label style={fieldLabel}>
                    Critério
                    <select
                      style={input}
                      value={campaign.date_basis || "start_date"}
                      onChange={(event) =>
                        updateCampaign(campaign, {
                          date_basis: event.target.value,
                        })
                      }
                    >
                      <option value="start_date">Data início apólice</option>
                      <option value="created_at">Data criação CRM</option>
                    </select>
                  </label>

                  <label style={fieldLabel}>
                    Mês pagamento
                    <select
                      style={input}
                      value={campaign.payment_month || ""}
                      onChange={(event) =>
                        updateCampaign(campaign, {
                          payment_month: Number(event.target.value),
                        })
                      }
                    >
                      <option value="">-</option>
                      {monthNames.map((month, index) => (
                        <option key={month} value={index + 1}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={fieldLabel}>
                    Ano pagamento
                    <input
                      style={input}
                      value={campaign.payment_year || ""}
                      onChange={(event) =>
                        updateCampaign(campaign, {
                          payment_year: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                </div>

                <div style={branchEditor}>
                  <strong>Produtos/Ramos que contam</strong>

                  <div style={branchGrid}>
                    {availableBranches.map((branch) => (
                      <label key={`${campaign.id}-${branch}`} style={checkLabel}>
                        <input
                          type="checkbox"
                          checked={(campaign.product_branches || []).includes(branch)}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            const current = campaign.product_branches || [];
                            const next = checked
                              ? [...current, branch]
                              : current.filter((item) => item !== branch);

                            updateCampaign(campaign, {
                              product_branches: next,
                            });
                          }}
                        />
                        {branch}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={buttonRow}>
                  {campaign.payment_status === "pago" ? (
                    <button
                      style={secondaryButton}
                      onClick={() => markPending(campaign)}
                    >
                      Reabrir como pendente
                    </button>
                  ) : (
                    <button style={paidButton} onClick={() => markPaid(campaign)}>
                      Marcar como Pago
                    </button>
                  )}

                  {campaign.paid_at && (
                    <div style={paidInfo}>Pago em {formatDate(campaign.paid_at)}</div>
                  )}
                </div>
              </section>

              <section style={externalCard}>
                <h4 style={sectionTitle}>Contribuição externa — Délia</h4>

                <div style={externalGrid}>
                  <label style={fieldLabel}>
                    Nome cliente
                    <input
                      style={input}
                      value={form.client_name}
                      placeholder="Nome do cliente"
                      onChange={(event) =>
                        setExternalForms({
                          ...externalForms,
                          [campaign.id]: {
                            ...form,
                            client_name: event.target.value,
                          },
                        })
                      }
                    />
                  </label>

                  <label style={fieldLabel}>
                    Nº apólice
                    <input
                      style={input}
                      value={form.policy_number}
                      placeholder="Nº apólice"
                      onChange={(event) =>
                        setExternalForms({
                          ...externalForms,
                          [campaign.id]: {
                            ...form,
                            policy_number: event.target.value,
                          },
                        })
                      }
                    />
                  </label>

                  <label style={fieldLabel}>
                    Prémio anual
                    <input
                      style={input}
                      value={form.annual_premium}
                      placeholder="Ex: 1000,00"
                      onChange={(event) =>
                        setExternalForms({
                          ...externalForms,
                          [campaign.id]: {
                            ...form,
                            annual_premium: event.target.value,
                          },
                        })
                      }
                    />
                  </label>

                  <label style={fieldLabel}>
                    Observações
                    <input
                      style={input}
                      value={form.notes}
                      placeholder="Opcional"
                      onChange={(event) =>
                        setExternalForms({
                          ...externalForms,
                          [campaign.id]: {
                            ...form,
                            notes: event.target.value,
                          },
                        })
                      }
                    />
                  </label>

                  <button
                    type="button"
                    style={button}
                    onClick={() => addExternalPolicy(campaign.id)}
                    disabled={savingCampaignId === campaign.id}
                  >
                    {savingCampaignId === campaign.id
                      ? "A guardar..."
                      : "Adicionar apólice Délia"}
                  </button>
                </div>

                {result.campaignContributions.length > 0 && (
                  <div style={tableCompact}>
                    <div style={externalHeader}>
                      <span>Cliente</span>
                      <span>Apólice</span>
                      <span>Prémio anual</span>
                      <span>Ação</span>
                    </div>

                    {result.campaignContributions.map((item) => (
                      <div key={item.id} style={externalRow}>
                        <strong>{item.client_name}</strong>
                        <span>{item.policy_number || "-"}</span>
                        <strong style={moneyValue}>
                          {formatEuro(item.annual_premium)}
                        </strong>
                        <button
                          type="button"
                          style={deleteButton}
                          onClick={() => deleteExternalPolicy(item.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section style={policiesCard}>
                <h4 style={sectionTitle}>Apólices contabilizadas no CRM</h4>

                {result.matchingPolicies.length === 0 ? (
                  <p style={muted}>
                    Ainda não existem apólices no CRM que contem para esta campanha.
                  </p>
                ) : (
                  <div style={table}>
                    <div style={tableHeader}>
                      <span>Cliente</span>
                      <span>NIF</span>
                      <span>Apólice</span>
                      <span>Ramo</span>
                      <span>Data usada</span>
                      <span>Prémio anual</span>
                      <span>Ficha</span>
                    </div>

                    {result.matchingPolicies.map((policy) => (
                      <div key={policy.id} style={tableRow}>
                        <strong>{policy.clients?.name || "-"}</strong>
                        <span>{policy.clients?.nif || "-"}</span>
                        <span>{policy.policy_number || "-"}</span>
                        <span>{policy.branch || "-"}</span>
                        <span>
                          {formatDate(getPolicyCampaignDate(policy, campaign))}
                        </span>
                        <strong style={moneyValue}>
                          {formatEuro(policy.annual_premium)}
                        </strong>

                        {policy.client_id ? (
                          <Link
                            href={`/clientes/${policy.client_id}`}
                            style={clientButton}
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
            </section>
          );
        })
      )}
    </section>
  );
}

function Mini({ title, value }) {
  return (
    <div style={miniBox}>
      <span style={summaryLabel}>{title}</span>
      <strong style={miniValue}>{value}</strong>
    </div>
  );
}

const page = { display: "flex", minHeight: "100vh", background: "#f3f4f6", fontFamily: "Arial, sans-serif" };
const main = { flex: 1, padding: 40 };
const header = { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 26 };
const title = { fontSize: 42, margin: 0 };
const subtitle = { color: "#6b7280", marginTop: 8 };
const summaryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, marginBottom: 24 };
const summaryBox = { background: "white", padding: 18, borderRadius: 16, display: "grid", gap: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" };
const summaryLabel = { color: "#6b7280", fontSize: 13, fontWeight: "bold" };
const summaryValue = { color: "#2563eb", fontSize: 26 };
const listSection = { marginBottom: 28 };
const formCard = { background: "#eff6ff", border: "1px solid #bfdbfe", padding: 24, borderRadius: 18, marginBottom: 24 };
const newFormGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 };
const campaignCard = { background: "white", padding: 24, borderRadius: 18, marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" };
const campaignHeader = { display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start", marginBottom: 18 };
const campaignTitle = { margin: 0, fontSize: 28 };
const basisText = { color: "#334155", fontSize: 13, marginTop: 8 };
const tagRow = { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 };
const tag = { background: "#dbeafe", color: "#1d4ed8", padding: "6px 10px", borderRadius: 999, fontWeight: "bold", fontSize: 12 };
const bonusBox = { background: "#dcfce7", border: "1px solid #86efac", padding: 16, borderRadius: 16, minWidth: 190, display: "grid", gap: 8 };
const bonusValue = { color: "#166534", fontSize: 30 };
const campaignStatsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 };
const miniBox = { background: "#f9fafb", padding: 14, borderRadius: 14, border: "1px solid #e5e7eb", display: "grid", gap: 6 };
const miniValue = { fontSize: 21, color: "#111827" };
const progressInfo = { background: "#fef3c7", border: "1px solid #f59e0b", color: "#92400e", padding: 14, borderRadius: 12, marginBottom: 16 };
const successInfo = { background: "#dcfce7", border: "1px solid #86efac", color: "#166534", padding: 14, borderRadius: 12, marginBottom: 16, fontWeight: "bold" };
const settingsCard = { background: "#f8fafc", border: "1px solid #e2e8f0", padding: 18, borderRadius: 16, marginBottom: 20 };
const externalCard = { background: "#eff6ff", border: "1px solid #bfdbfe", padding: 18, borderRadius: 16, marginBottom: 20 };
const policiesCard = { background: "#f9fafb", border: "1px solid #e5e7eb", padding: 18, borderRadius: 16 };
const sectionTitle = { marginTop: 0 };
const externalGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, alignItems: "end" };
const fieldLabel = { display: "flex", flexDirection: "column", gap: 6, color: "#374151", fontWeight: "bold", fontSize: 13 };
const branchGrid = { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 };
const branchEditor = { marginTop: 18 };
const checkLabel = { display: "flex", alignItems: "center", gap: 6, background: "white", border: "1px solid #d1d5db", borderRadius: 10, padding: "9px 11px", fontWeight: "bold" };
const input = { padding: 12, borderRadius: 10, border: "1px solid #d1d5db", fontSize: 14, background: "white" };
const textarea = { padding: 12, borderRadius: 10, border: "1px solid #d1d5db", fontSize: 14, background: "white", minHeight: 86, fontFamily: "Arial, sans-serif" };
const button = { background: "#111827", color: "white", border: "none", padding: "12px 16px", borderRadius: 10, cursor: "pointer", fontWeight: "bold" };
const paidButton = { background: "#16a34a", color: "white", border: "none", padding: "12px 16px", borderRadius: 10, cursor: "pointer", fontWeight: "bold" };
const secondaryButton = { background: "#6b7280", color: "white", border: "none", padding: "12px 16px", borderRadius: 10, cursor: "pointer", fontWeight: "bold" };
const deleteButton = { background: "#dc2626", color: "white", border: "none", padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontWeight: "bold" };
const paidBadge = { background: "#bbf7d0", color: "#166534", padding: "6px 10px", borderRadius: 999, fontWeight: "bold", fontSize: 12 };
const pendingBadge = { background: "#fee2e2", color: "#991b1b", padding: "6px 10px", borderRadius: 999, fontWeight: "bold", fontSize: 12 };
const paidInfo = { color: "#166534", fontWeight: "bold" };
const buttonRow = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 16 };
const table = { display: "grid", gap: 8, overflowX: "auto" };
const tableHeader = { display: "grid", gridTemplateColumns: "2fr 1fr 1.1fr 1fr 1fr 1.1fr 1fr", gap: 10, background: "#e5e7eb", padding: "12px 14px", borderRadius: 12, fontWeight: "bold", minWidth: 1050 };
const tableRow = { display: "grid", gridTemplateColumns: "2fr 1fr 1.1fr 1fr 1fr 1.1fr 1fr", gap: 10, padding: "12px 14px", borderBottom: "1px solid #e5e7eb", alignItems: "center", minWidth: 1050 };
const tableCompact = { display: "grid", gap: 8, marginTop: 16 };
const externalHeader = { display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 0.8fr", gap: 10, background: "#dbeafe", padding: "10px 12px", borderRadius: 10, fontWeight: "bold" };
const externalRow = { display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 0.8fr", gap: 10, padding: "10px 12px", borderBottom: "1px solid #bfdbfe", alignItems: "center" };
const clientButton = { background: "#2563eb", color: "white", padding: "8px 10px", borderRadius: 8, textDecoration: "none", fontWeight: "bold", textAlign: "center" };
const moneyValue = { color: "#16a34a" };
const muted = { color: "#6b7280" };
const smallMuted = { color: "#6b7280", fontSize: 12 };
