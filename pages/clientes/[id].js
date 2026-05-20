import Link from "next/link";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "../../components/Sidebar";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

const insurersList = ["Generali", "Real Vida", "Zurich", "Ageas", "Allianz"];

const branchList = [
  "Automóvel",
  "Casa",
  "Saude",
  "Atcp",
  "Atco",
  "Mremp",
  "Vida",
  "RC",
  "Financeiros",
  "Viagem",
  "Outros",
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

  const { data: claims } = await supabase
    .from("claims")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  return {
    props: {
      client,
      policies: policies || [],
      claims: claims || [],
    },
  };
}

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-PT").format(new Date(date));
}

function calculateAge(date) {
  if (!date) return "-";

  const start = new Date(date);
  const today = new Date();

  let years = today.getFullYear() - start.getFullYear();
  const monthDiff = today.getMonth() - start.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < start.getDate())
  ) {
    years--;
  }

  if (years < 0 || Number.isNaN(years)) return "-";

  return `${years} anos`;
}

function addMonths(dateString, months) {
  if (!dateString) return null;

  const date = new Date(dateString);
  date.setMonth(date.getMonth() + months);

  return date.toISOString().split("T")[0];
}

function getFrequencyMonths(frequency) {
  const value = String(frequency || "").toLowerCase();

  if (value === "mensal") return 1;
  if (value === "trimestral") return 3;
  if (value === "semestral") return 6;

  return 12;
}

function calculateNextRenewal(startDate) {
  if (!startDate) return null;

  const today = new Date();
  const start = new Date(startDate);

  let renewal = new Date(
    today.getFullYear(),
    start.getMonth(),
    start.getDate()
  );

  if (renewal <= today) {
    renewal.setFullYear(renewal.getFullYear() + 1);
  }

  return renewal.toISOString().split("T")[0];
}

function calculateNextPayment(startDate, frequency) {
  if (!startDate) return null;

  const months = getFrequencyMonths(frequency);
  const today = new Date();
  const next = new Date(startDate);

  while (next <= today) {
    next.setMonth(next.getMonth() + months);
  }

  return next.toISOString().split("T")[0];
}

function calculateAnnualCommission(policy) {
  const commission = Number(policy.commission_per_payment || 0);
  const frequency = String(policy.payment_frequency || "anual").toLowerCase();

  if (frequency === "mensal") return commission * 12;
  if (frequency === "trimestral") return commission * 4;
  if (frequency === "semestral") return commission * 2;

  return commission;
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
  if (rating === "TOP") return { background: "#dcfce7", color: "#166534" };
  if (rating === "MUITO BOM") return { background: "#dbeafe", color: "#1d4ed8" };
  if (rating === "BOM") return { background: "#ede9fe", color: "#5b21b6" };
  if (rating === "MÉDIO") return { background: "#fef3c7", color: "#92400e" };
  if (rating === "FRACO") return { background: "#fee2e2", color: "#991b1b" };

  return { background: "#f3f4f6", color: "#374151" };
}

function InfoItem({ label, value }) {
  return (
    <div style={infoItem}>
      <span style={infoLabel}>{label}</span>
      <strong style={infoValue}>{value || "-"}</strong>
    </div>
  );
}

export default function ClientePage({ client, policies, claims }) {
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);

  const [policyData, setPolicyData] = useState({
    policy_number: "",
    branch: "Automóvel",
    insurer_name: "Generali",
    annual_premium: "",
    commission_per_payment: "",
    payment_frequency: "Mensal",
    start_date: "",
    license_plate: "",
  });

  if (!client) {
    return <div>Cliente não encontrado.</div>;
  }

  function resetPolicyForm() {
    setPolicyData({
      policy_number: "",
      branch: "Automóvel",
      insurer_name: "Generali",
      annual_premium: "",
      commission_per_payment: "",
      payment_frequency: "Mensal",
      start_date: "",
      license_plate: "",
    });
  }

  async function editClient() {
    const name = prompt("Nome", client.name || "");
    if (name === null) return;

    const nif = prompt("NIF", client.nif || "");
    if (nif === null) return;

    const phone = prompt("Telefone", client.phone || "");
    if (phone === null) return;

    const email = prompt("Email", client.email || "");
    if (email === null) return;

    const address = prompt("Morada", client.address || "");
    if (address === null) return;

    const city = prompt("Cidade", client.city || "");
    if (city === null) return;

    const postal_code = prompt("Código Postal", client.postal_code || "");
    if (postal_code === null) return;

    const birth_date = prompt("Data nascimento", client.birth_date || "");
    if (birth_date === null) return;

    const iban = prompt("IBAN", client.iban || "");
    if (iban === null) return;

    const notes = prompt("Observações", client.notes || "");
    if (notes === null) return;

    const { error } = await supabase
      .from("clients")
      .update({
        name,
        nif,
        phone,
        email,
        address,
        city,
        postal_code,
        birth_date: birth_date || null,
        iban,
        notes,
      })
      .eq("id", client.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function createPolicy(e) {
    e.preventDefault();

    if (!policyData.policy_number) {
      alert("Preenche o número da apólice.");
      return;
    }

    if (!policyData.start_date) {
      alert("Preenche a data de início da apólice.");
      return;
    }

    const renewalDate = calculateNextRenewal(policyData.start_date);
    const nextPaymentDate = calculateNextPayment(
      policyData.start_date,
      policyData.payment_frequency
    );

    setSavingPolicy(true);

    const response = await fetch("/api/create-policy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: client.id,
        policy_number: policyData.policy_number,
        branch: policyData.branch,
        license_plate: policyData.license_plate || null,
        insurer_name: policyData.insurer_name,
        annual_premium: policyData.annual_premium,
        commission_per_payment: policyData.commission_per_payment,
        payment_frequency: policyData.payment_frequency,
        start_date: policyData.start_date,
        renewal_date: renewalDate,
        last_payment_date: policyData.start_date,
        next_payment_date: nextPaymentDate,
      }),
    });

    setSavingPolicy(false);

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || "Erro ao criar apólice");
      return;
    }

    resetPolicyForm();
    setShowPolicyForm(false);
    window.location.reload();
  }
    async function editPolicy(policy) {
    const numero = prompt("Número da Apólice", policy.policy_number || "");
    if (numero === null) return;

    const ramo = prompt("Ramo", policy.branch || "");
    if (ramo === null) return;

    const matricula = prompt("Matrícula", policy.license_plate || "");
    if (matricula === null) return;

    const seguradora = prompt("Seguradora", policy.insurers?.name || "");
    if (seguradora === null) return;

    const premio = prompt("Prémio comercial anual", policy.annual_premium || "");
    if (premio === null) return;

    const commissionPerPayment = prompt(
      "Comissão por pagamento (€)",
      policy.commission_per_payment || ""
    );
    if (commissionPerPayment === null) return;

    const fracionamento = prompt(
      "Fracionamento",
      policy.payment_frequency || "Mensal"
    );
    if (fracionamento === null) return;

    const dataInicio = prompt("Data início apólice", policy.start_date || "");
    if (dataInicio === null) return;

    const nextRenewal = calculateNextRenewal(dataInicio);
    const nextPayment = calculateNextPayment(dataInicio, fracionamento);

    let insurer_id = policy.insurer_id || null;

    if (seguradora) {
      let { data: existingInsurer } = await supabase
        .from("insurers")
        .select("id")
        .eq("name", seguradora.trim())
        .maybeSingle();

      if (!existingInsurer) {
        const { data: newInsurer, error: insurerError } = await supabase
          .from("insurers")
          .insert({ name: seguradora.trim() })
          .select("id")
          .single();

        if (insurerError) {
          alert(insurerError.message);
          return;
        }

        existingInsurer = newInsurer;
      }

      insurer_id = existingInsurer.id;
    }

    const { error } = await supabase
      .from("policies")
      .update({
        policy_number: numero,
        branch: ramo,
        license_plate: matricula || null,
        insurer_id,
        annual_premium: premio ? String(premio).replace(",", ".") : null,
        commission_per_payment: commissionPerPayment
          ? String(commissionPerPayment).replace(",", ".")
          : null,
        payment_frequency: fracionamento,
        start_date: dataInicio || null,
        renewal_date: nextRenewal,
        next_payment_date: nextPayment,
      })
      .eq("id", policy.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function updatePolicyStatus(policyId, status) {
    const { error } = await supabase
      .from("policies")
      .update({
        status,
        cancelled_at: status === "anulada" ? new Date().toISOString() : null,
      })
      .eq("id", policyId);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function markPolicyPaid(policy) {
    const today = new Date().toISOString().split("T")[0];

    const nextPaymentDate = addMonths(
      today,
      getFrequencyMonths(policy.payment_frequency)
    );

    const { error } = await supabase
      .from("policies")
      .update({
        last_payment_date: today,
        next_payment_date: nextPaymentDate,
        status: "ativa",
      })
      .eq("id", policy.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Pagamento registado.");
    window.location.reload();
  }

  const totalPremium = policies.reduce(
    (sum, policy) => sum + Number(policy.annual_premium || 0),
    0
  );

  const totalCommission = policies.reduce(
    (sum, policy) => sum + calculateAnnualCommission(policy),
    0
  );

  const rating = clientRating(policies, totalCommission);
  const currentRatingStyle = ratingStyle(rating);

  return (
    <div style={page}>
      <Sidebar active="clientes" />

      <main style={main}>
        <div style={header}>
          <div>
            <h1 style={title}>{client.name}</h1>
            <p style={subtitle}>{client.nif || "Sem NIF"}</p>
          </div>

          <div style={headerButtons}>
            <button style={editClientButton} onClick={editClient}>
              Editar cliente
            </button>

            <button
              style={button}
              onClick={() => setShowPolicyForm(!showPolicyForm)}
            >
              {showPolicyForm ? "Fechar formulário" : "+ Nova Apólice"}
            </button>
          </div>
        </div>

        {showPolicyForm && (
          <section style={policyFormCard}>
            <h2 style={sectionTitle}>Nova Apólice</h2>

            <form style={policyForm} onSubmit={createPolicy}>
              <label style={label}>Número da apólice</label>
              <input
                style={input}
                value={policyData.policy_number}
                onChange={(e) =>
                  setPolicyData({
                    ...policyData,
                    policy_number: e.target.value,
                  })
                }
              />

              <label style={label}>Seguradora</label>
              <select
                style={input}
                value={policyData.insurer_name}
                onChange={(e) =>
                  setPolicyData({
                    ...policyData,
                    insurer_name: e.target.value,
                  })
                }
              >
                {insurersList.map((insurer) => (
                  <option key={insurer} value={insurer}>
                    {insurer}
                  </option>
                ))}
              </select>

              <label style={label}>Ramo</label>
              <select
                style={input}
                value={policyData.branch}
                onChange={(e) =>
                  setPolicyData({
                    ...policyData,
                    branch: e.target.value,
                  })
                }
              >
                {branchList.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>

              <label style={label}>Matrícula</label>
              <input
                style={input}
                value={policyData.license_plate}
                onChange={(e) =>
                  setPolicyData({
                    ...policyData,
                    license_plate: e.target.value.toUpperCase(),
                  })
                }
              />

              <label style={label}>Prémio comercial anual</label>
              <input
                style={input}
                value={policyData.annual_premium}
                onChange={(e) =>
                  setPolicyData({
                    ...policyData,
                    annual_premium: e.target.value,
                  })
                }
              />

              <label style={label}>Comissão por pagamento</label>
              <input
                style={input}
                value={policyData.commission_per_payment}
                onChange={(e) =>
                  setPolicyData({
                    ...policyData,
                    commission_per_payment: e.target.value,
                  })
                }
              />

              <label style={label}>Fracionamento</label>
              <select
                style={input}
                value={policyData.payment_frequency}
                onChange={(e) =>
                  setPolicyData({
                    ...policyData,
                    payment_frequency: e.target.value,
                  })
                }
              >
                <option value="Mensal">Mensal</option>
                <option value="Trimestral">Trimestral</option>
                <option value="Semestral">Semestral</option>
                <option value="Anual">Anual</option>
              </select>

              <label style={label}>Data início da apólice</label>
              <input
                type="date"
                style={input}
                value={policyData.start_date}
                onChange={(e) =>
                  setPolicyData({
                    ...policyData,
                    start_date: e.target.value,
                  })
                }
              />

              <div style={previewBox}>
                <strong>Renovação calculada:</strong>{" "}
                {calculateNextRenewal(policyData.start_date) || "-"}
                <br />
                <strong>Próxima cobrança calculada:</strong>{" "}
                {calculateNextPayment(
                  policyData.start_date,
                  policyData.payment_frequency
                ) || "-"}
              </div>

              <div style={formButtons}>
                <button style={button} disabled={savingPolicy}>
                  {savingPolicy ? "A guardar..." : "Guardar apólice"}
                </button>

                <button
                  type="button"
                  style={cancelButton}
                  onClick={() => {
                    resetPolicyForm();
                    setShowPolicyForm(false);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        )}
