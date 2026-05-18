import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
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
    .select(`
      *,
      insurers(name)
    `)
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

  return new Date(date).toLocaleDateString("pt-PT");
}

export default function ClientePage({
  client,
  policies,
  claims,
  tasks,
  opportunities,
}) {
  if (!client) {
    return <div>Cliente não encontrado.</div>;
  }

  const activePolicies = policies.filter(
    (p) => p.status !== "anulada"
  ).length;

  const cancelledPolicies = policies.filter(
    (p) => p.status === "anulada"
  ).length;

  const openClaims = claims.filter(
    (c) => c.status !== "ENCERRADO"
  ).length;

  const openTasks = tasks.filter(
    (t) => t.status !== "concluida"
  ).length;

  const openOpportunities = opportunities.filter(
    (o) => o.status !== "fechada"
  ).length;

  function clientRating() {
    if (activePolicies >= 5) return "TOP";
    if (activePolicies >= 3) return "BOM";
    if (activePolicies >= 2) return "MÉDIO";
    return "FRACO";
  }

  async function editClient() {
    const name = prompt("Nome", client.name || "");
    const nif = prompt("NIF", client.nif || "");
    const phone = prompt("Telefone", client.phone || "");
    const email = prompt("Email", client.email || "");
    const address = prompt("Morada", client.address || "");
    const city = prompt("Cidade", client.city || "");

    const response = await fetch("/api/update-client", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: client.id,
        name,
        nif,
        phone,
        email,
        address,
        city,
      }),
    });

    if (response.ok) {
      window.location.reload();
    } else {
      alert("Erro ao atualizar cliente");
    }
  }

  async function createPolicy() {
    const numero = prompt("Número da Apólice");

    if (!numero) return;

    const ramo = prompt("Ramo (Auto, Casa, Saúde...)");

    const seguradoraOpcao = prompt(
      "Seguradora:\n1 - Generali\n2 - Real Vida\n3 - Zurich\n4 - Allianz\n5 - Ageas\n6 - Outra"
    );

    let seguradora = "";

    if (seguradoraOpcao === "1") seguradora = "Generali";
    if (seguradoraOpcao === "2") seguradora = "Real Vida";
    if (seguradoraOpcao === "3") seguradora = "Zurich";
    if (seguradoraOpcao === "4") seguradora = "Allianz";
    if (seguradoraOpcao === "5") seguradora = "Ageas";

    if (seguradoraOpcao === "6") {
      seguradora = prompt("Nome da seguradora") || "";
    }

    const premio = prompt("Prémio anual");
    const fracionamento = prompt(
      "Fracionamento (mensal, trimestral, semestral, anual)"
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
        insurer_name: seguradora,
        annual_premium: premio,
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

  return (
    <div style={page}>
      <Sidebar active="clientes" />

      <main style={main}>
        <div style={header}>
          <div>
            <h1 style={title}>{client.name}</h1>

            <p style={subtitle}>
              {client.nif || "Sem NIF"} ·{" "}
              {client.phone || "Sem telefone"}
            </p>
          </div>

          <div style={buttonRow}>
            <button style={button} onClick={editClient}>
              Editar cliente
            </button>

            <button style={button} onClick={createPolicy}>
              + Nova Apólice
            </button>
          </div>
        </div>

        <section style={card}>
          <h2>Resumo 360º</h2>

          <div style={summaryGrid}>
            <div style={greenBox}>
              Apólices em vigor: {activePolicies}
            </div>

            <div style={redBox}>
              Apólices anuladas: {cancelledPolicies}
            </div>

            <div style={blueBox}>
              Sinistros abertos: {openClaims}
            </div>

            <div style={orangeBox}>
              Tarefas abertas: {openTasks}
            </div>

            <div style={pinkBox}>
              Oportunidades: {openOpportunities}
            </div>

            <div style={purpleBox}>
              Classificação: {clientRating()}
            </div>
          </div>
        </section>

        <section style={card}>
          <h2>Dados do Cliente</h2>

          <div style={infoGrid}>
            <Info label="Nome" value={client.name} />
            <Info label="NIF" value={client.nif} />
            <Info label="Telefone" value={client.phone} />
            <Info label="Email" value={client.email} />
            <Info label="Morada" value={client.address} />
            <Info label="Cidade" value={client.city} />
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

                    <span style={badge}>
                      {policy.status || "ativa"}
                    </span>
                  </div>

                  <p>
                    <strong>Nº:</strong>{" "}
                    {policy.policy_number || "-"}
                  </p>

                  <p>
                    <strong>Seguradora:</strong>{" "}
                    {policy.insurers?.name || "-"}
                  </p>

                  <p>
                    <strong>Prémio:</strong>{" "}
                    {policy.annual_premium || 0} €
                  </p>

                  <p>
                    <strong>Renovação:</strong>{" "}
                    {formatDate(policy.renewal_date)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={card}>
          <h2>Sinistros</h2>

          {claims.length === 0 ? (
            <p>Sem sinistros.</p>
          ) : (
            <div style={policiesGrid}>
              {claims.map((claim) => (
                <div key={claim.id} style={policyCard}>
                  <div style={policyTop}>
                    <h3>{claim.claim_branch || "Sem ramo"}</h3>

                    <span style={badge}>
                      {claim.status || "ABERTO"}
                    </span>
                  </div>

                  <p>
                    <strong>Nº:</strong>{" "}
                    {claim.claim_number || "-"}
                  </p>

                  <p>
                    <strong>Seguradora:</strong>{" "}
                    {claim.insurer_name || "-"}
                  </p>

                  <p>
                    <strong>Data:</strong>{" "}
                    {formatDate(claim.claim_date)}
                  </p>

                  <Link href={`/sinistros/${claim.id}`}>
                    Abrir ficha
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={card}>
          <h2>Tarefas</h2>

          {tasks.length === 0 ? (
            <p>Sem tarefas.</p>
          ) : (
            <div style={policiesGrid}>
              {tasks.map((task) => (
                <div key={task.id} style={policyCard}>
                  <div style={policyTop}>
                    <h3>{task.title}</h3>

                    <span style={badge}>
                      {task.priority || "-"}
                    </span>
                  </div>

                  <p>
                    <strong>Estado:</strong>{" "}
                    {task.status || "-"}
                  </p>

                  <p>
                    <strong>Descrição:</strong>{" "}
                    {task.description || "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={card}>
          <h2>Oportunidades comerciais</h2>

          {opportunities.length === 0 ? (
            <p>Este cliente não tem oportunidades.</p>
          ) : (
            <div style={policiesGrid}>
              {opportunities.map((opportunity) => (
                <div key={opportunity.id} style={policyCard}>
                  <div style={policyTop}>
                    <h3>{opportunity.branch || "Sem ramo"}</h3>

                    <span style={badge}>
                      {opportunity.status || "aberta"}
                    </span>
                  </div>

                  <p>
                    <strong>Seguradora atual:</strong>{" "}
                    {opportunity.current_insurer || "-"}
                  </p>

                  <p>
                    <strong>Prémio atual:</strong>{" "}
                    {opportunity.current_premium || 0} €
                  </p>

                  <p>
                    <strong>Potencial:</strong>{" "}
                    {opportunity.potential_premium || 0} €
                  </p>

                  <p>
                    <strong>Notas:</strong>{" "}
                    {opportunity.notes || "-"}
                  </p>
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

const title = {
  fontSize: 42,
  margin: 0,
};

const subtitle = {
  color: "#6b7280",
};

const buttonRow = {
  display: "flex",
  gap: 12,
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

const card = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const summaryGrid = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
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

const orangeBox = {
  background: "#fed7aa",
  color: "#9a3412",
  padding: "12px 18px",
  borderRadius: 12,
  fontWeight: "bold",
};

const pinkBox = {
  background: "#fce7f3",
  color: "#9d174d",
  padding: "12px 18px",
  borderRadius: 12,
  fontWeight: "bold",
};

const purpleBox = {
  background: "#ede9fe",
  color: "#5b21b6",
  padding: "12px 18px",
  borderRadius: 12,
  fontWeight: "bold",
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 16,
};

const infoCard = {
  background: "#f9fafb",
  padding: 18,
  borderRadius: 12,
};

const infoLabel = {
  color: "#6b7280",
  marginBottom: 8,
};

const policiesGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
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
