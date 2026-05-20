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
  "TRANQUILIDADE",
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

export default function ClientePage({ client, policies, claims }) {
  const [showPolicyForm, setShowPolicyForm] = useState(false);

  const [policyForm, setPolicyForm] = useState({
    const [showEditPolicyForm, setShowEditPolicyForm] =
  useState(false);

const [editingPolicyId, setEditingPolicyId] =
  useState(null);

const [editPolicyForm, setEditPolicyForm] =
  useState({
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

  if (!client) {
    return <p>Cliente não encontrado.</p>;
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
        birth_date,
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

  async function editPolicy(policy) {
  setEditingPolicyId(policy.id);

  setShowEditPolicyForm(true);

  setShowPolicyForm(false);

  setEditPolicyForm({
    policy_number:
      policy.policy_number || "",

    branch:
      policy.branch || "",

    license_plate:
      policy.license_plate || "",

    insurer_name:
      policy.insurers?.name || "",

    annual_premium:
      policy.annual_premium || "",

    commission_per_payment:
      policy.commission_per_payment || "",

    payment_frequency:
      policy.payment_frequency || "Mensal",

    start_date:
      policy.start_date || "",

    renewal_date:
      policy.renewal_date || "",

    last_payment_date:
      policy.last_payment_date || "",
  });
}
async function updatePolicy(e) {
  e.preventDefault();

  const response = await fetch(
    "/api/update-policy",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        policy_id:
          editingPolicyId,

        ...editPolicyForm,
      }),
    }
  );

  if (response.ok) {
    window.location.reload();
  } else {
    const error =
      await response.json();

    alert(
      error.error ||
        "Erro ao atualizar apólice"
    );
  }
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

  async function markPolicyPaid(policyId) {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { error } = await supabase
        .from("policies")
        .update({
          last_payment_date: today,
        })
        .eq("id", policyId)
        .select();

      if (error) {
        console.log(error);
        alert(error.message);
        return;
      }

      alert("Pagamento registado.");
      window.location.reload();
    } catch (err) {
      console.log(err);
      alert("Erro ao atualizar.");
    }
  }

  async function createPolicy(e) {
    e.preventDefault();

    const response = await fetch("/api/create-policy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: client.id,
        policy_number: policyForm.policy_number,
        branch: policyForm.branch,
        license_plate: policyForm.license_plate,
        insurer_name: policyForm.insurer_name,
        annual_premium: policyForm.annual_premium,
        commission_per_payment: policyForm.commission_per_payment,
        payment_frequency: policyForm.payment_frequency,
        start_date: policyForm.start_date,
        renewal_date: policyForm.renewal_date,
        last_payment_date: policyForm.last_payment_date,
      }),
    });

    if (response.ok) {
      window.location.reload();
    } else {
      const error = await response.json();
      alert(error.error || "Erro ao criar apólice");
    }
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

            <button style={button} onClick={() => setShowPolicyForm(true)}>
              + Nova Apólice
            </button>
          </div>
        </div>

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
                placeholder="Prémio comercial anual"
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

              <label style={fieldLabel}>
                Data renovação
                <input
                  style={input}
                  type="date"
                  value={policyForm.renewal_date}
                  onChange={(e) =>
                    setPolicyForm({
                      ...policyForm,
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
                  value={policyForm.last_payment_date}
                  onChange={(e) =>
                    setPolicyForm({
                      ...policyForm,
                      last_payment_date: e.target.value,
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
            <InfoItem label="Data nascimento" value={formatDate(client.birth_date)} />
            <InfoItem label="IBAN" value={client.iban} />
            <InfoItem label="Observações" value={client.notes} />
          </div>

          <div style={clientStats}>
            <div style={statBox}>
              <span style={statLabel}>Apólices</span>
              <strong style={statValue}>{policies.length}</strong>
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

        <section style={card}>
          <h2>Apólices</h2>

          {policies.length === 0 ? (
            <p>Sem apólices.</p>
          ) : (
            <div style={policiesGrid}>
              {policies.map((policy) => (
                <div key={policy.id} style={policyCard}>
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
                    <strong>Renovação:</strong> {formatDate(policy.renewal_date)}
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
                      onClick={() => markPolicyPaid(policy.id)}
                    >
                      Dar como pago
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
