import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

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
    .select(`
      *,
      insurers(name)
    `)
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  return {
    props: {
      client,
      policies: policies || [],
    },
  };
}

export default function ClientePage({ client, policies }) {
  if (!client) {
    return <div>Cliente não encontrado.</div>;
  }

  const activePolicies = policies.filter((p) => p.status === "ativa").length;
  const cancelledPolicies = policies.filter((p) => p.status === "anulada").length;

  function clientRating() {
    if (activePolicies >= 5) return "TOP";
    if (activePolicies === 4) return "MUITO BOM";
    if (activePolicies === 3) return "BOM";
    if (activePolicies === 2) return "MÉDIO";
    return "FRACO";
  }

  function calculateAge(date) {
    if (!date) return "-";
    const birth = new Date(date);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return `${age} anos`;
  }

  function createPolicy() {
    const numero = prompt("Número da Apólice");
    const ramo = prompt("Ramo (Auto, Casa, Saúde...)");
    const seguradora = prompt("Seguradora");
   const premio = prompt("Prémio anual");
const fracionamento = prompt("Fracionamento (mensal, trimestral, semestral, anual)");
const renovacao = prompt("Data Renovação (AAAA-MM-DD)");


    fetch("/api/create-policy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: client.id,
        policy_number: numero,
        branch: ramo,
        insurer_name: seguradora,
        annual_premium: premio,
        payment_frequency: fracionamento,

        renewal_date: renovacao,
      }),
    }).then(() => {
      window.location.reload();
    });
  }

  function deleteClient() {
    const confirmar = confirm(
      "Tens a certeza que queres eliminar este cliente? Esta ação apaga também as apólices associadas."
    );

    if (!confirmar) return;

    fetch("/api/delete-client", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: client.id,
      }),
    }).then(() => {
      window.location.href = "/clientes";
    });
  }

  function updatePolicyStatus(policyId, status) {
    fetch("/api/update-policy-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        policy_id: policyId,
        status,
      }),
    }).then(() => {
      window.location.reload();
    });
  }

  return (
    <div style={page}>
      <aside style={sidebar}>
        <h2 style={logo}>SegurCRM</h2>

        <nav style={nav}>
          <Link href="/" style={link}>Dashboard</Link>
          <Link href="/clientes" style={activeLink}>Clientes</Link>
          <Link href="/apolices" style={link}>Apólices</Link>
          <Link href="/renovacoes" style={link}>Renovações</Link>
        </nav>
      </aside>

      <main style={main}>
        <div style={header}>
          <div>
            <h1 style={title}>{client.name}</h1>

            <p style={subtitle}>
              {client.nif || "Sem NIF"} · {client.phone || "Sem telefone"}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button style={button} onClick={createPolicy}>
              + Nova Apólice
            </button>

            <button
              style={{ ...button, background: "#dc2626" }}
              onClick={deleteClient}
            >
              Eliminar cliente
            </button>
          </div>
        </div>

        <section style={card}>
          <h2>Dados do Cliente</h2>

          <div style={statsRow}>
            <div style={greenBox}>Em vigor: {activePolicies}</div>
            <div style={redBox}>Anuladas: {cancelledPolicies}</div>
            <div style={blueBox}>Total: {policies.length}</div>
          </div>

          <div style={ratingBox}>
            Classificação Cliente: {clientRating()}
          </div>

          <div style={infoGrid}>
            <Info label="Nome" value={client.name} />
            <Info label="NIF" value={client.nif} />
            <Info label="Telefone" value={client.phone} />
            <Info label="Email" value={client.email} />
            <Info label="Morada" value={client.address} />
            <Info label="Cidade" value={client.city} />
            <Info label="Data nascimento" value={client.birth_date} />
            <Info label="Idade" value={calculateAge(client.birth_date)} />
            <Info
              label="Início carta condução"
              value={client.driving_license_start_date}
            />
            <Info label="IBAN" value={client.iban} />
            <Info label="Estado" value={client.status} />
          </div>
        </section>

        <section style={card}>
          <h2>Apólices</h2>

          {policies.length === 0 ? (
            <p>Este cliente ainda não tem apólices.</p>
          ) : (
            <div style={policiesGrid}>
              {policies.map((policy) => (
                <div key={policy.id} style={policyCard}>
                  <div style={policyTop}>
                    <h3>{policy.branch || "Sem ramo"}</h3>

                    <span
                      style={{
                        ...badge,
                        background:
                          policy.status === "anulada" ? "#fee2e2" : "#dcfce7",
                        color:
                          policy.status === "anulada" ? "#991b1b" : "#166534",
                      }}
                    >
                      {policy.status || "ativa"}
                    </span>
                  </div>

                  <p>
                    <strong>Apólice:</strong> {policy.policy_number || "-"}
                  </p>

                  <p>
                    <strong>Seguradora:</strong>{" "}
                    {policy.insurers?.name || "-"}
                  </p>

                 <p>
  <strong>Prémio:</strong> {policy.annual_premium || 0} €
</p>

<p>
  <strong>Fracionamento:</strong>{" "}
  {policy.payment_frequency || "anual"}
</p>

                  <p>
                    <strong>Renovação:</strong> {policy.renewal_date || "-"}
                  </p>

                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      style={{
                        ...smallButton,
                        background: "#16a34a",
                      }}
                      onClick={() => updatePolicyStatus(policy.id, "ativa")}
                    >
                      Em vigor
                    </button>

                    <button
                      style={{
                        ...smallButton,
                        background: "#dc2626",
                      }}
                      onClick={() => updatePolicyStatus(policy.id, "anulada")}
                    >
                      Anulada
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div style={infoCard}>
      <p style={infoLabel}>{label}</p>
      <strong>{value || "-"}</strong>
    </div>
  );
}

const page = {
  display: "flex",
  minHeight: "100vh",
  background: "#f3f4f6",
  fontFamily: "Arial",
};

const sidebar = {
  width: 240,
  background: "#111827",
  color: "white",
  padding: 24,
};

const logo = {
  marginBottom: 40,
};

const nav = {
  display: "grid",
  gap: 12,
};

const link = {
  color: "#cbd5e1",
  textDecoration: "none",
  padding: "12px 14px",
  borderRadius: 10,
};

const activeLink = {
  ...link,
  background: "#2563eb",
  color: "white",
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

const title = {
  fontSize: 40,
  margin: 0,
};

const subtitle = {
  color: "#6b7280",
  marginTop: 10,
};

const button = {
  background: "#111827",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
};

const smallButton = {
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: 8,
  cursor: "pointer",
};

const card = {
  background: "white",
  borderRadius: 16,
  padding: 24,
  marginBottom: 24,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const statsRow = {
  display: "flex",
  gap: 16,
  marginTop: 20,
  marginBottom: 20,
};

const greenBox = {
  background: "#dcfce7",
  color: "#166534",
  padding: "12px 18px",
  borderRadius: 12,
  fontWeight: "bold",
};

const redBox = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "12px 18px",
  borderRadius: 12,
  fontWeight: "bold",
};

const blueBox = {
  background: "#dbeafe",
  color: "#1d4ed8",
  padding: "12px 18px",
  borderRadius: 12,
  fontWeight: "bold",
};

const ratingBox = {
  marginTop: 20,
  marginBottom: 20,
  padding: "16px 20px",
  borderRadius: 14,
  background: "#e0e7ff",
  color: "#1e3a8a",
  fontWeight: "bold",
  fontSize: 18,
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 16,
  marginTop: 20,
};

const infoCard = {
  background: "#f9fafb",
  padding: 16,
  borderRadius: 12,
};

const infoLabel = {
  color: "#6b7280",
  marginBottom: 8,
};

const policiesGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 20,
};

const policyCard = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 20,
};

const policyTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const badge = {
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
};
