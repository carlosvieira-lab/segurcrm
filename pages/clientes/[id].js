import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "../../components/Sidebar";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

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
  if (!client) {
    return <div>Cliente não encontrado.</div>;
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

    const birth_date = prompt(
      "Data nascimento (AAAA-MM-DD)",
      client.birth_date || ""
    );
    if (birth_date === null) return;

    const driving_license_start_date = prompt(
      "Data início carta condução (AAAA-MM-DD)",
      client.driving_license_start_date || ""
    );
    if (driving_license_start_date === null) return;

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
        driving_license_start_date: driving_license_start_date || null,
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

  async function createPolicy() {
    const numero = prompt("Número da Apólice");
    if (!numero) return;

    const ramo = prompt("Ramo");
    const matricula = prompt("Matrícula");
    const seguradora = prompt("Seguradora") || "";
    const premio = prompt("Prémio comercial anual");
    const commissionPerPayment = prompt("Comissão por pagamento (€)");
    const fracionamento = prompt(
      "Fracionamento (Mensal, Trimestral, Semestral, Anual)"
    );
    const dataInicio = prompt("Data início apólice (AAAA-MM-DD)");
    const renovacao = prompt("Data Renovação (AAAA-MM-DD)");
    const ultimoPagamento = prompt("Último pagamento (AAAA-MM-DD)");

    const response = await fetch("/api/create-policy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: client.id,
        policy_number: numero,
        branch: ramo,
        license_plate: matricula,
        insurer_name: seguradora,
        annual_premium: premio,
        commission_per_payment: commissionPerPayment,
        payment_frequency: fracionamento,
        start_date: dataInicio,
        renewal_date: renovacao,
        last_payment_date: ultimoPagamento,
      }),
    });

    if (response.ok) {
      window.location.reload();
    } else {
      const error = await response.json();
      alert(error.error || "Erro ao criar apólice");
    }
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
      policy.payment_frequency || "Anual"
    );
    if (fracionamento === null) return;

    const dataInicio = prompt("Data início apólice", policy.start_date || "");
    if (dataInicio === null) return;

    const renovacao = prompt("Renovação", policy.renewal_date || "");
    if (renovacao === null) return;

    const ultimoPagamento = prompt(
      "Último pagamento",
      policy.last_payment_date || ""
    );
    if (ultimoPagamento === null) return;

    const proximaCobranca = prompt(
      "Próxima cobrança",
      policy.next_payment_date || ""
    );
    if (proximaCobranca === null) return;

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
        license_plate: matricula,
        insurer_id,
        annual_premium: premio ? String(premio).replace(",", ".") : null,
        commission_per_payment: commissionPerPayment
          ? String(commissionPerPayment).replace(",", ".")
          : null,
        payment_frequency: fracionamento,
        start_date: dataInicio || null,
        renewal_date: renovacao || null,
        last_payment_date: ultimoPagamento || null,
        next_payment_date: proximaCobranca || null,
      })
      .eq("id", policy.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function updatePolicyStatus(policyId, status) {
    const response = await fetch("/api/update-policy-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        policy_id: policyId,
        status,
      }),
    });

    if (!response.ok) {
      alert("Erro ao atualizar estado");
      return;
    }

    window.location.reload();
  }

  async function markPolicyPaid(policyId) {
    const response = await fetch("/api/mark-policy-paid", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        policy_id: policyId,
      }),
    });

    if (!response.ok) {
      alert("Erro ao marcar pagamento");
      return;
    }

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

            <button style={button} onClick={createPolicy}>
              + Nova Apólice
            </button>
          </div>
        </div>

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
              value={`${formatDate(client.birth_date)} (${calculateAge(
                client.birth_date
              )})`}
            />
            <InfoItem
              label="Início carta condução"
              value={`${formatDate(
                client.driving_license_start_date
              )} (${calculateAge(client.driving_license_start_date)})`}
            />
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

            <div style={{ ...statBox, ...currentRatingStyle }}>
              <span style={{ ...statLabel, color: currentRatingStyle.color }}>
                Classificação
              </span>
              <strong style={{ ...statValue, color: currentRatingStyle.color }}>
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

                  <p><strong>Nº:</strong> {policy.policy_number || "-"}</p>
                  <p><strong>Matrícula:</strong> {policy.license_plate || "-"}</p>
                  <p><strong>Seguradora:</strong> {policy.insurers?.name || "-"}</p>
                  <p><strong>Prémio comercial anual:</strong> {policy.annual_premium || 0} €</p>
                  <p><strong>Comissão pagamento:</strong> {policy.commission_per_payment || 0} €</p>
                  <p><strong>Comissão anual:</strong> {calculateAnnualCommission(policy)} €</p>
                  <p><strong>Fracionamento:</strong> {policy.payment_frequency || "-"}</p>
                  <p><strong>Data início:</strong> {formatDate(policy.start_date)}</p>
                  <p><strong>Renovação:</strong> {formatDate(policy.renewal_date)}</p>
                  <p><strong>Último pagamento:</strong> {formatDate(policy.last_payment_date)}</p>
                  <p><strong>Próxima cobrança:</strong> {formatDate(policy.next_payment_date)}</p>
                  <p><strong>Anulada em:</strong> {formatDate(policy.cancelled_at)}</p>

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
                      Anulada
                    </button>

                    <button
                      style={{ ...smallButton, background: "#2563eb" }}
                      onClick={() => markPolicyPaid(policy.id)}
                    >
                      Marcar pago
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
                <Link
                  key={claim.id}
                  href={`/sinistros/${claim.id}`}
                  style={claimCard}
                >
                  <h3>{claim.claim_branch || "Sem ramo"}</h3>

                  <p><strong>Nº:</strong> {claim.claim_number || "-"}</p>
                  <p><strong>Seguradora:</strong> {claim.insurer_name || "-"}</p>
                  <p><strong>Estado:</strong> {claim.status || "ABERTO"}</p>
                  <p><strong>Data:</strong> {formatDate(claim.claim_date)}</p>
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
