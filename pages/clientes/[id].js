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

const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

const insurersList = [
  "Generali",
  "Real Vida",
  "Zurich",
  "Ageas",
  "Allianz",
];

const branchList = [
  "Automóvel",
  "Casa",
  "Saude",
  "Atcp",
  "Atco",
  "Mremp",
  "Vida",
  "Aps",
  "Financeiros",
  "Viagem",
  "Rc",
  "Outros",
];

export async function getServerSideProps({
  params,
}) {
  const { id } = params;

  const { data: client } =
    await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

  const { data: policies } =
    await supabase
      .from("policies")
      .select("*, insurers(name)")
      .eq("client_id", id)
      .order("created_at", {
        ascending: false,
      });

  return {
    props: {
      client,
      policies: policies || [],
    },
  };
}

function formatDate(date) {
  if (!date) return "-";

  return new Intl.DateTimeFormat(
    "pt-PT"
  ).format(new Date(date));
}

function calculateAge(date) {
  if (!date) return "-";

  const start = new Date(date);
  const today = new Date();

  let years =
    today.getFullYear() -
    start.getFullYear();

  const monthDiff =
    today.getMonth() -
    start.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 &&
      today.getDate() <
        start.getDate())
  ) {
    years--;
  }

  return `${years} anos`;
}

function calculateAnnualCommission(
  policy
) {
  const commission = Number(
    policy.commission_per_payment || 0
  );

  const frequency = String(
    policy.payment_frequency || "anual"
  ).toLowerCase();

  if (frequency === "mensal")
    return commission * 12;

  if (frequency === "trimestral")
    return commission * 4;

  if (frequency === "semestral")
    return commission * 2;

  return commission;
}

function clientRating(
  policies,
  totalCommission
) {
  const count = policies.length;

  if (
    count >= 5 ||
    totalCommission >= 150
  )
    return "TOP";

  if (
    count >= 4 ||
    totalCommission >= 120
  )
    return "MUITO BOM";

  if (
    count >= 3 ||
    totalCommission >= 100
  )
    return "BOM";

  if (
    count >= 2 ||
    totalCommission >= 50
  )
    return "MÉDIO";

  if (
    count >= 1 ||
    totalCommission >= 20
  )
    return "FRACO";

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

export default function ClientePage({
  client,
  policies,
}) {
  const [
    showPolicyForm,
    setShowPolicyForm,
  ] = useState(false);

  const [
    policyData,
    setPolicyData,
  ] = useState({
    policy_number: "",
    branch: "Automóvel",
    insurer_name: "Generali",
    annual_premium: "",
  });

  if (!client) {
    return (
      <div>
        Cliente não encontrado.
      </div>
    );
  }

  async function editClient() {
    const notes = prompt(
      "Observações",
      client.notes || ""
    );

    if (notes === null) return;

    const { error } =
      await supabase
        .from("clients")
        .update({
          notes,
        })
        .eq("id", client.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function addClientInteraction() {
    const note = prompt(
      "Nova interação"
    );

    if (!note) return;

    const now =
      new Date().toLocaleString(
        "pt-PT"
      );

    const previous =
      client.interaction_notes || "";

    const updatedNotes =
      previous
        ? `${previous}\n\n${now} - ${note}`
        : `${now} - ${note}`;

    const { error } =
      await supabase
        .from("clients")
        .update({
          interaction_notes:
            updatedNotes,
        })
        .eq("id", client.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function createPolicy() {
    const response = await fetch(
      "/api/create-policy",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          client_id: client.id,
          ...policyData,
        }),
      }
    );

    if (!response.ok) {
      alert(
        "Erro ao criar apólice"
      );
      return;
    }

    window.location.reload();
  }

  async function editPolicy(
    policy
  ) {
    const premium = prompt(
      "Prémio anual",
      policy.annual_premium || ""
    );

    if (premium === null) return;

    const { error } =
      await supabase
        .from("policies")
        .update({
          annual_premium:
            premium,
        })
        .eq("id", policy.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function updatePolicyStatus(
    id,
    status
  ) {
    const { error } =
      await supabase
        .from("policies")
        .update({
          status,
        })
        .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  const totalCommission =
    policies.reduce(
      (sum, policy) =>
        sum +
        calculateAnnualCommission(
          policy
        ),
      0
    );

  const rating = clientRating(
    policies,
    totalCommission
  );

  const currentRatingStyle =
    ratingStyle(rating);

  return (
    <div style={page}>
      <Sidebar active="clientes" />

      <main style={main}>
        <div style={header}>
          <div>
            <h1 style={title}>
              {client.name}
            </h1>

            <p style={subtitle}>
              {client.nif}
            </p>
          </div>

          <div
            style={headerButtons}
          >
            <button
              style={
                editClientButton
              }
              onClick={editClient}
            >
              Editar cliente
            </button>

            <button
              style={button}
              onClick={() =>
                setShowPolicyForm(
                  !showPolicyForm
                )
              }
            >
              Nova Apólice
            </button>
          </div>
        </div>

        <section
          style={clientInfoCard}
        >
          <div
            style={clientStats}
          >
            <div
              style={{
                ...statBox,
                ...currentRatingStyle,
              }}
            >
              <span>
                Classificação
              </span>

              <strong>
                {rating}
              </strong>
            </div>

            <div
              style={interactionBox}
            >
              <span>
                Interações
              </span>

              <pre
                style={
                  interactionText
                }
              >
                {client.interaction_notes ||
                  "Sem interações"}
              </pre>

              <button
                style={
                  interactionButton
                }
                onClick={
                  addClientInteraction
                }
              >
                + Registar
              </button>
            </div>
          </div>

          <div
            style={clientInfoGrid}
          >
            <div style={infoItem}>
              <strong>
                Telefone
              </strong>
              <span>
                {client.phone}
              </span>
            </div>

            <div style={infoItem}>
              <strong>Email</strong>
              <span>
                {client.email}
              </span>
            </div>

            <div style={infoItem}>
              <strong>IBAN</strong>
              <span>
                {client.iban}
              </span>
            </div>

            <div style={infoItem}>
              <strong>
                Observações
              </strong>
              <span>
                {client.notes ||
                  "-"}
              </span>
            </div>

            <div style={infoItem}>
              <strong>
                Data nascimento
              </strong>
              <span>
                {formatDate(
                  client.birth_date
                )}{" "}
                (
                {calculateAge(
                  client.birth_date
                )}
                )
              </span>
            </div>

            <div style={infoItem}>
              <strong>
                Carta condução
              </strong>
              <span>
                {formatDate(
                  client.driving_license_start_date
                )}{" "}
                (
                {calculateAge(
                  client.driving_license_start_date
                )}
                )
              </span>
            </div>
          </div>
        </section>

        {showPolicyForm && (
          <section
            style={formCard}
          >
            <h2>
              Nova Apólice
            </h2>

            <div style={formGrid}>
              <input
                style={input}
                placeholder="Número"
                value={
                  policyData.policy_number
                }
                onChange={(e) =>
                  setPolicyData({
                    ...policyData,
                    policy_number:
                      e.target
                        .value,
                  })
                }
              />

              <select
                style={input}
                value={
                  policyData.branch
                }
                onChange={(e) =>
                  setPolicyData({
                    ...policyData,
                    branch:
                      e.target
                        .value,
                  })
                }
              >
                {branchList.map(
                  (branch) => (
                    <option
                      key={
                        branch
                      }
                    >
                      {branch}
                    </option>
                  )
                )}
              </select>

              <select
                style={input}
                value={
                  policyData.insurer_name
                }
                onChange={(e) =>
                  setPolicyData({
                    ...policyData,
                    insurer_name:
                      e.target
                        .value,
                  })
                }
              >
                {insurersList.map(
                  (
                    insurer
                  ) => (
                    <option
                      key={
                        insurer
                      }
                    >
                      {
                        insurer
                      }
                    </option>
                  )
                )}
              </select>

              <input
                style={input}
                placeholder="Prémio anual"
                value={
                  policyData.annual_premium
                }
                onChange={(e) =>
                  setPolicyData({
                    ...policyData,
                    annual_premium:
                      e.target
                        .value,
                  })
                }
              />
            </div>

            <button
              style={button}
              onClick={
                createPolicy
              }
            >
              Guardar
            </button>
          </section>
        )}

        <section style={card}>
          <h2>Apólices</h2>

          <div
            style={policiesGrid}
          >
            {policies.map(
              (policy) => (
                <div
                  key={policy.id}
                  style={
                    policyCard
                  }
                >
                  <h3>
                    {
                      policy.branch
                    }
                  </h3>

                  <p>
                    Nº{" "}
                    {
                      policy.policy_number
                    }
                  </p>

                  <p>
                    {
                      policy
                        .insurers
                        ?.name
                    }
                  </p>

                  <p>
                    {
                      policy.annual_premium
                    }{" "}
                    €
                  </p>

                  <div
                    style={
                      buttonGroup
                    }
                  >
                    <button
                      style={
                        editButton
                      }
                      onClick={() =>
                        editPolicy(
                          policy
                        )
                      }
                    >
                      Editar
                    </button>

                    <button
                      style={
                        greenButton
                      }
                      onClick={() =>
                        updatePolicyStatus(
                          policy.id,
                          "ativa"
                        )
                      }
                    >
                      Em vigor
                    </button>

                    <button
                      style={
                        redButton
                      }
                      onClick={() =>
                        updatePolicyStatus(
                          policy.id,
                          "anulada"
                        )
                      }
                    >
                      Anular
                    </button>
                  </div>
                </div>
              )
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
};

const main = {
  flex: 1,
  padding: 40,
};

const header = {
  display: "flex",
  justifyContent:
    "space-between",
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

const button = {
  background: "#111827",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
};

const editClientButton = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
};

const clientInfoCard = {
  background:
    "linear-gradient(135deg,#dbeafe,#eff6ff)",
  padding: 24,
  borderRadius: 20,
  marginBottom: 24,
};

const clientStats = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 16,
  marginBottom: 20,
};

const statBox = {
  padding: 18,
  borderRadius: 14,
};

const interactionBox = {
  background: "white",
  padding: 18,
  borderRadius: 14,
};

const interactionText = {
  whiteSpace: "pre-wrap",
};

const interactionButton = {
  background: "#111827",
  color: "white",
  border: "none",
  padding: "10px 12px",
  borderRadius: 10,
};

const clientInfoGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 16,
};

const infoItem = {
  background: "white",
  padding: 14,
  borderRadius: 14,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const formCard = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
};

const formGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 16,
  marginBottom: 20,
};

const input = {
  padding: 12,
  borderRadius: 10,
  border:
    "1px solid #d1d5db",
};

const card = {
  background: "white",
  padding: 24,
  borderRadius: 18,
};

const policiesGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(320px,1fr))",
  gap: 16,
};

const policyCard = {
  background: "#f9fafb",
  padding: 18,
  borderRadius: 14,
};

const buttonGroup = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 14,
};

const editButton = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "10px 12px",
  borderRadius: 10,
};

const greenButton = {
  background: "#16a34a",
  color: "white",
  border: "none",
  padding: "10px 12px",
  borderRadius: 10,
};

const redButton = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "10px 12px",
  borderRadius: 10,
};
