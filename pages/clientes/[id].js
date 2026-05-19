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

  return new Intl.DateTimeFormat("pt-PT").format(
    new Date(date)
  );
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

function InfoItem({
  label,
  value,
}) {
  return (
    <div style={infoItem}>
      <span style={infoLabel}>
        {label}
      </span>

      <strong style={infoValue}>
        {value || "-"}
      </strong>
    </div>
  );
}

export default function ClientePage({
  client,
  policies,
  claims,
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
    license_plate: "",
    insurer_name: "Generali",
    annual_premium: "",
    commission_per_payment: "",
    payment_frequency: "Mensal",
    start_date: "",
    renewal_date: "",
    last_payment_date: "",
  });

  if (!client) {
    return (
      <div>
        Cliente não encontrado.
      </div>
    );
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
      const error =
        await response.json();

      alert(
        error.error ||
          "Erro ao criar apólice"
      );

      return;
    }

    window.location.reload();
  }

  const totalPremium =
    policies.reduce(
      (sum, policy) =>
        sum +
        Number(
          policy.annual_premium || 0
        ),
      0
    );

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
              {client.nif ||
                "Sem NIF"}
            </p>
          </div>

          <div
            style={headerButtons}
          >
            <button
              style={
                editClientButton
              }
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
              {showPolicyForm
                ? "Fechar formulário"
                : "+ Nova Apólice"}
            </button>
          </div>
        </div>

        {showPolicyForm && (
          <section
            style={formCard}
          >
            <h2>
              Nova Apólice
            </h2>

            <div style={formGrid}>
              <div>
                <label
                  style={label}
                >
                  Nº Apólice
                </label>

                <input
                  style={input}
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
              </div>

              <div>
                <label
                  style={label}
                >
                  Ramo
                </label>

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
              </div>

              <div>
                <label
                  style={label}
                >
                  Matrícula
                </label>

                <input
                  style={input}
                  value={
                    policyData.license_plate
                  }
                  onChange={(e) =>
                    setPolicyData({
                      ...policyData,
                      license_plate:
                        e.target
                          .value,
                    })
                  }
                />
              </div>

              <div>
                <label
                  style={label}
                >
                  Seguradora
                </label>

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
              </div>

              <div>
                <label
                  style={label}
                >
                  Prémio anual
                </label>

                <input
                  style={input}
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

              <div>
                <label
                  style={label}
                >
                  Comissão pagamento
                </label>

                <input
                  style={input}
                  value={
                    policyData.commission_per_payment
                  }
                  onChange={(e) =>
                    setPolicyData({
                      ...policyData,
                      commission_per_payment:
                        e.target
                          .value,
                    })
                  }
                />
              </div>
              <div>
                <label style={label}>
                  Fracionamento
                </label>

                <select
                  style={input}
                  value={
                    policyData.payment_frequency
                  }
                  onChange={(e) =>
                    setPolicyData({
                      ...policyData,
                      payment_frequency:
                        e.target.value,
                    })
                  }
                >
                  <option>Mensal</option>
                  <option>Trimestral</option>
                  <option>Semestral</option>
                  <option>Anual</option>
                </select>
              </div>

              <div>
                <label style={label}>
                  Data início
                </label>

                <input
                  type="date"
                  style={input}
                  value={
                    policyData.start_date
                  }
                  onChange={(e) =>
                    setPolicyData({
                      ...policyData,
                      start_date:
                        e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label style={label}>
                  Renovação
                </label>

                <input
                  type="date"
                  style={input}
                  value={
                    policyData.renewal_date
                  }
                  onChange={(e) =>
                    setPolicyData({
                      ...policyData,
                      renewal_date:
                        e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label style={label}>
                  Último pagamento
                </label>

                <input
                  type="date"
                  style={input}
                  value={
                    policyData.last_payment_date
                  }
                  onChange={(e) =>
                    setPolicyData({
                      ...policyData,
                      last_payment_date:
                        e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div style={buttonRow}>
              <button
                style={button}
                onClick={createPolicy}
              >
                Guardar Apólice
              </button>

              <button
                style={
                  cancelButton
                }
                onClick={() =>
                  setShowPolicyForm(
                    false
                  )
                }
              >
                Cancelar
              </button>
            </div>
          </section>
        )}

        <section
          style={clientInfoCard}
        >
          <h2
            style={sectionTitle}
          >
            Dados do cliente
          </h2>

          <div
            style={clientInfoGrid}
          >
            <InfoItem
              label="Nome"
              value={client.name}
            />

            <InfoItem
              label="NIF"
              value={client.nif}
            />

            <InfoItem
              label="Telefone"
              value={client.phone}
            />

            <InfoItem
              label="Email"
              value={client.email}
            />

            <InfoItem
              label="Morada"
              value={
                client.address
              }
            />

            <InfoItem
              label="Cidade"
              value={client.city}
            />

            <InfoItem
              label="Código Postal"
              value={
                client.postal_code
              }
            />

            <InfoItem
              label="Nascimento"
              value={`${formatDate(
                client.birth_date
              )} (${calculateAge(
                client.birth_date
              )})`}
            />

            <InfoItem
              label="Carta condução"
              value={`${formatDate(
                client.driving_license_start_date
              )} (${calculateAge(
                client.driving_license_start_date
              )})`}
            />

            <InfoItem
              label="IBAN"
              value={client.iban}
            />
          </div>

          <div
            style={clientStats}
          >
            <div style={statBox}>
              <span
                style={
                  statLabel
                }
              >
                Apólices
              </span>

              <strong
                style={
                  statValue
                }
              >
                {
                  policies.length
                }
              </strong>
            </div>

            <div style={statBox}>
              <span
                style={
                  statLabel
                }
              >
                Sinistros
              </span>

              <strong
                style={
                  statValue
                }
              >
                {
                  claims.length
                }
              </strong>
            </div>

            <div style={statBox}>
              <span
                style={
                  statLabel
                }
              >
                Prémio anual
              </span>

              <strong
                style={
                  statValue
                }
              >
                {totalPremium.toFixed(
                  2
                )}{" "}
                €
              </strong>
            </div>

            <div style={statBox}>
              <span
                style={
                  statLabel
                }
              >
                Comissão anual
              </span>

              <strong
                style={
                  statValue
                }
              >
                {totalCommission.toFixed(
                  2
                )}{" "}
                €
              </strong>
            </div>

            <div
              style={{
                ...statBox,
                ...currentRatingStyle,
              }}
            >
              <span
                style={{
                  ...statLabel,
                  color:
                    currentRatingStyle.color,
                }}
              >
                Classificação
              </span>

              <strong
                style={{
                  ...statValue,
                  color:
                    currentRatingStyle.color,
                }}
              >
                {rating}
              </strong>
            </div>
          </div>
        </section>

        <section style={card}>
          <h2>Apólices</h2>

          {policies.length ===
          0 ? (
            <p>
              Sem apólices.
            </p>
          ) : (
            <div
              style={
                policiesGrid
              }
            >
              {policies.map(
                (policy) => (
                  <div
                    key={
                      policy.id
                    }
                    style={
                      policyCard
                    }
                  >
                    <div
                      style={
                        policyTop
                      }
                    >
                      <h3>
                        {policy.branch ||
                          "Sem ramo"}
                      </h3>

                      <span
                        style={
                          badge
                        }
                      >
                        {policy.status ||
                          "ativa"}
                      </span>
                    </div>

                    <p>
                      <strong>
                        Nº:
                      </strong>{" "}
                      {policy.policy_number ||
                        "-"}
                    </p>

                    <p>
                      <strong>
                        Matrícula:
                      </strong>{" "}
                      {policy.license_plate ||
                        "-"}
                    </p>

                    <p>
                      <strong>
                        Seguradora:
                      </strong>{" "}
                      {policy
                        .insurers
                        ?.name ||
                        "-"}
                    </p>

                    <p>
                      <strong>
                        Prémio:
                      </strong>{" "}
                      {policy.annual_premium ||
                        0}{" "}
                      €
                    </p>

                    <p>
                      <strong>
                        Comissão anual:
                      </strong>{" "}
                      {calculateAnnualCommission(
                        policy
                      )}{" "}
                      €
                    </p>

                    <p>
                      <strong>
                        Renovação:
                      </strong>{" "}
                      {formatDate(
                        policy.renewal_date
                      )}
                    </p>
                  </div>
                )
              )}
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
  fontFamily:
    "Arial, sans-serif",
};

const main = {
  flex: 1,
  padding: 40,
};

const header = {
  display: "flex",
  justifyContent:
    "space-between",
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

const button = {
  background: "#111827",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const cancelButton = {
  background: "#dc2626",
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
};

const formCard = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  boxShadow:
    "0 1px 4px rgba(0,0,0,0.08)",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 16,
};

const label = {
  display: "block",
  marginBottom: 6,
  fontSize: 13,
  color: "#6b7280",
};

const input = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border:
    "1px solid #d1d5db",
};

const buttonRow = {
  display: "flex",
  gap: 12,
  marginTop: 20,
};

const clientInfoCard = {
  background:
    "linear-gradient(135deg,#dbeafe,#eff6ff)",
  padding: 24,
  borderRadius: 20,
  marginBottom: 24,
};

const sectionTitle = {
  marginTop: 0,
};

const clientInfoGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 16,
  marginBottom: 24,
};

const infoItem = {
  background: "white",
  padding: 14,
  borderRadius: 14,
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
  gridTemplateColumns:
    "repeat(auto-fit,minmax(180px,1fr))",
  gap: 16,
};

const statBox = {
  background: "white",
  padding: 18,
  borderRadius: 14,
};

const statLabel = {
  color: "#6b7280",
  fontSize: 13,
};

const statValue = {
  fontSize: 24,
  color: "#2563eb",
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

const policyTop = {
  display: "flex",
  justifyContent:
    "space-between",
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
