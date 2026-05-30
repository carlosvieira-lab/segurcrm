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
  "AGEAS",
  "ALLIANZ",
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

  return {
    props: {
      client,
      policies: policies || [],
      claims: claims || [],
      tasks: tasks || [],
      opportunities: opportunities || [],
    },
  };
}

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-PT").format(new Date(date));
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
  const premiumPerPayment = Number(String(value || 0).replace(",", "."));
  return premiumPerPayment * getFrequencyMultiplier(frequency);
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

  policies.forEach((policy) => {
    items.push({
      date: policy.created_at || policy.start_date,
      type: "APÓLICE",
      title: `Apólice ${policy.branch || ""} criada`,
      description: `${policy.policy_number || "Sem nº"} · ${policy.insurers?.name || "Sem seguradora"}`,
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

  return {
    background: "#f3f4f6",
    color: "#374151",
  };
}

export default function ClientePage({ client, policies, claims, tasks, opportunities }) {
  const [showPolicyForm, setShowPolicyForm] = useState(false);

  const [policyForm, setPolicyForm] = useState({
    policy_number: "",
    branch: "",
    license_plate: "",
    insurer_name: "",
    annual_premium: "",
    commission_per_payment: "",
    payment_frequency: "Mensal",
    start_date: "",
    renewal_date: "",
    last_payment_date: "",
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
  notes: client?.notes || "",
  interactions: client?.interactions || "",
});

const [communicationMessage, setCommunicationMessage] =
  useState("");

const [emailSubject, setEmailSubject] =
  useState("");

  if (!client) {
    return <p>Cliente não encontrado.</p>;
  }

 function cleanPhoneNumber(phone) {
  return String(phone || "")
    .replace(/\D/g, "");
}

function openWhatsApp() {
  const phone = cleanPhoneNumber(client.phone);

  if (!phone) {
    alert("Este cliente não tem telefone registado.");
    return;
  }

  if (!communicationMessage.trim()) {
    alert("Escreve a mensagem antes de abrir o WhatsApp.");
    return;
  }

  const finalPhone = phone.startsWith("351")
    ? phone
    : `351${phone}`;

  const url =
    `https://wa.me/${finalPhone}?text=${encodeURIComponent(
      communicationMessage
    )}`;

  window.open(url, "_blank");
}

function openEmail() {
  if (!client.email) {
    alert("Este cliente não tem email registado.");
    return;
  }

  if (!communicationMessage.trim()) {
    alert("Escreve a mensagem antes de abrir o email.");
    return;
  }

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
      annual_premium: calculatePremiumPerPayment(policy) || "",
      commission_per_payment: policy.commission_per_payment || "",
      payment_frequency: policy.payment_frequency || "Mensal",
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

    let insurerId = null;

    if (editPolicyForm.insurer_name) {
      const { data: insurer, error: insurerError } = await supabase
        .from("insurers")
        .select("id")
        .eq("name", editPolicyForm.insurer_name)
        .maybeSingle();

      if (insurerError) {
        alert(insurerError.message);
        return;
      }

      insurerId = insurer?.id || null;
    }

    const cleanNumber = (value) => {
      if (value === "" || value === null || value === undefined) return null;
      return Number(String(value).replace(",", "."));
    };

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
      start_date: cleanDate(editPolicyForm.start_date),
      renewal_date: cleanDate(editPolicyForm.renewal_date),
      last_payment_date: cleanDate(editPolicyForm.last_payment_date),
    };

    if (insurerId) {
      updateData.insurer_id = insurerId;
    }

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

  async function createPolicy(e) {
    e.preventDefault();

    let insurerId = null;

    if (policyForm.insurer_name) {
      const { data: insurer, error: insurerError } = await supabase
        .from("insurers")
        .select("id")
        .eq("name", policyForm.insurer_name)
        .maybeSingle();

      if (insurerError) {
        alert(insurerError.message);
        return;
      }

      insurerId = insurer?.id || null;
    }

    const cleanNumber = (value) => {
      if (value === "" || value === null || value === undefined) return null;
      return Number(String(value).replace(",", "."));
    };

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
      annual_premium: calculateAnnualPremiumFromPayment(policyForm.annual_premium, policyForm.payment_frequency),
      commission_per_payment: cleanNumber(policyForm.commission_per_payment),
      payment_frequency: policyForm.payment_frequency,
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

const totalPremium = activePolicies.reduce(
  (sum, policy) => sum + Number(policy.annual_premium || 0),
  0
);

const totalCommission = activePolicies.reduce(
  (sum, policy) => sum + calculateAnnualCommission(policy),
  0
);

const rating = clientRating(activePolicies, totalCommission);
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
            <p style={subtitle}>{client.nif || "Sem NIF"}</p>
          </div>

          <div style={headerButtons}>
            <button style={editClientButton} onClick={editClient}>
              Editar cliente
            </button>

            <Link
              href={`/tarefas?cliente=${client.id}`}
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
          </div>
        </div>
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
        {showPolicyForm && (
          <section style={card}>
            <h2>Nova Apólice</h2>

            <form onSubmit={createPolicy} style={formGrid}>
              <input
                style={input}
                placeholder="Número da apólice"
                value={policyForm.policy_number}
                onChange={(e) =>
                  setPolicyForm({
                    ...policyForm,
                    policy_number: e.target.value,
                  })
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
                style={input}
                placeholder="Matrícula"
                value={policyForm.license_plate}
                onChange={(e) =>
                  setPolicyForm({
                    ...policyForm,
                    license_plate: e.target.value,
                  })
                }
              />

              <select
                style={input}
                value={policyForm.insurer_name}
                onChange={(e) =>
                  setPolicyForm({
                    ...policyForm,
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
                type="number"
                step="0.01"
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
                type="number"
                step="0.01"
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
                style={input}
                placeholder="Matrícula"
                value={editPolicyForm.license_plate}
                onChange={(e) =>
                  setEditPolicyForm({
                    ...editPolicyForm,
                    license_plate: e.target.value,
                  })
                }
              />

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
                type="number"
                step="0.01"
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
                type="number"
                step="0.01"
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

            <div style={statBox}>
              <span style={statLabel}>Sinistros</span>
              <strong style={statValue}>{claims.length}</strong>
            </div>

            <div style={statBox}>
              <span style={statLabel}>Prémio anual</span>
              <strong style={statValue}>{totalPremium.toFixed(2)} €</strong>
            </div>

            <div style={statBox}>
              <span style={statLabel}>Comissão anual</span>
              <strong style={statValue}>{totalCommission.toFixed(2)} €</strong>
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
        </section>

        <section style={communicationCard}>
          <h2 style={sectionTitle}>Comunicação com cliente</h2>

          <div style={communicationGrid}>
            <div>
              <label style={fieldLabel}>
                Assunto do email
              </label>

              <input
                style={input}
                value={emailSubject}
                onChange={(e) =>
                  setEmailSubject(e.target.value)
                }
                placeholder="Ex: Proposta seguro casa"
              />
            </div>

            <div>
              <label style={fieldLabel}>
                Contactos
              </label>

              <div style={contactSummary}>
                <span>
                  <strong>Telefone:</strong>{" "}
                  {client.phone || "-"}
                </span>

                <span>
                  <strong>Email:</strong>{" "}
                  {client.email || "-"}
                </span>
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={fieldLabel}>
                Mensagem
              </label>

              <textarea
                style={communicationTextarea}
                value={communicationMessage}
                onChange={(e) =>
                  setCommunicationMessage(e.target.value)
                }
                placeholder="Escreve aqui a mensagem para enviar por WhatsApp ou email..."
              />
            </div>

            <div style={communicationButtons}>
              <button
                type="button"
                style={whatsappButton}
                onClick={openWhatsApp}
              >
                Abrir WhatsApp
              </button>

              <button
                type="button"
                style={emailButton}
                onClick={openEmail}
              >
                Abrir Email
              </button>
            </div>
          </div>
        </section>

        <section style={timelineCard}>
          <h2 style={sectionTitle}>Timeline do Cliente</h2>

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
  style={{
    ...policyCard,
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
                    <strong>Prémio anual:</strong> {policy.annual_premium || 0} €
                  </p>

                  <p>
                    <strong>Comissão anual:</strong>{" "}
                    {calculateAnnualCommission(policy)} €
                  </p>

                  <p>
                    <strong>Renovação anual:</strong> {formatDate(policy.renewal_date)}
                  </p>

                  <p>
                    <strong>Próximo pagamento:</strong>{" "}
                    {formatDate(policy.next_payment_date)}
                  </p>

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
                      onClick={() => updatePolicyStatus(policy.id, "anulada")}
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
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 30,
};

const headerButtons = {
  display: "flex",
  gap: 12,
};

const title = {
  fontSize: 42,
  margin: 0,
};

const subtitle = {
  color: "#6b7280",
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

const timelineCard = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
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

const communicationCard = {
  background:
    "linear-gradient(135deg, #ecfdf5, #f0fdf4)",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  border: "1px solid #bbf7d0",
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
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
