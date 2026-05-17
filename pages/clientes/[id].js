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

  return {
    props: {
      client,
      policies: policies || [],
      claims: claims || [],
      tasks: tasks || [],
    },
  };
}

function addMonths(dateString, months) {
  if (!dateString) return null;

  const date = new Date(dateString);
  date.setMonth(date.getMonth() + months);

  return date.toISOString().split("T")[0];
}

function calculateNextPayment(lastPaymentDate, frequency) {
  if (!lastPaymentDate) return null;

  if (frequency === "mensal") return addMonths(lastPaymentDate, 1);
  if (frequency === "trimestral") return addMonths(lastPaymentDate, 3);
  if (frequency === "semestral") return addMonths(lastPaymentDate, 6);

  return addMonths(lastPaymentDate, 12);
}

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-PT").format(new Date(date));
}

function calculateAge(date) {
  if (!date) return "-";

  const birth = new Date(date);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return `${age} anos`;
}

export default function ClientePage({ client, policies, claims, tasks }) {
  if (!client) {
    return <div>Cliente não encontrado.</div>;
  }

  const activePolicies = policies.filter((p) => p.status === "ativa").length;
  const cancelledPolicies = policies.filter((p) => p.status === "anulada").length;
  const openClaims = claims.filter((c) => c.status !== "ENCERRADO").length;
  const openTasks = tasks.filter((t) => t.status !== "concluida").length;

  function clientRating() {
    if (activePolicies >= 5) return "TOP";
    if (activePolicies === 4) return "MUITO BOM";
    if (activePolicies === 3) return "BOM";
    if (activePolicies === 2) return "MÉDIO";
    return "FRACO";
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

    const iban = prompt("IBAN", client.iban || "");
    if (iban === null) return;

    const birthDate = prompt("Data nascimento (AAAA-MM-DD)", client.birth_date || "");
    if (birthDate === null) return;

    const licenseDate = prompt(
      "Início carta condução (AAAA-MM-DD)",
      client.driving_license_start_date || ""
    );
    if (licenseDate === null) return;

    const { error } = await supabase
      .from("clients")
      .update({
        name,
        nif,
        phone,
        email,
        address,
        city,
        iban,
        birth_date: birthDate || null,
        driving_license_start_date: licenseDate || null,
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

    const ramo = prompt("Ramo (Auto, Casa, Saúde...)");
    const seguradora = prompt("Seguradora");
    const premio = prompt("Prémio anual");
    const fracionamento = prompt("Fracionamento (mensal, trimestral, semestral, anual)");
    const dataInicio = prompt("Data início apólice (AAAA-MM-DD)");
    const renovacao = prompt("Data Renovação (AAAA-MM-DD)");
    const ultimoPagamento = prompt("Último pagamento (AAAA-MM-DD)");

    const proximaCobranca = calculateNextPayment(ultimoPagamento, fracionamento);

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
        start_date: dataInicio || renovacao,
        renewal_date: renovacao,
        last_payment_date: ultimoPagamento,
        next_payment_date: proximaCobranca,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.error || "Erro ao criar apólice");
      return;
    }

    window.location.reload();
  }

  async function editPolicy(policy) {
    const numero = prompt("Número da Apólice", policy.policy_number || "");
    if (numero === null) return;

    const ramo = prompt("Ramo", policy.branch || "");
    if (ramo === null) return;

    const seguradora = prompt("Seguradora", policy.insurers?.name || "");
    if (seguradora === null) return;

    const premio = prompt("Prémio anual", policy.annual_premium || "");
    if (premio === null) return;

    const fracionamento = prompt(
      "Fracionamento (mensal, trimestral, semestral, anual)",
      policy.payment_frequency || "anual"
    );
    if (fracionamento === null) return;

    const dataInicio = prompt("Data início apólice (AAAA-MM-DD)", policy.start_date || "");
    if (dataInicio === null) return;

    const renovacao = prompt("Data Renovação (AAAA-MM-DD)", policy.renewal_date || "");
    if (renovacao === null) return;

    const ultimoPagamento = prompt(
      "Último pagamento (AAAA-MM-DD)",
      policy.last_payment_date || ""
    );
    if (ultimoPagamento === null) return;

    const proximaCobranca = prompt(
      "Próxima cobrança (AAAA-MM-DD)",
      policy.next_payment_date || calculateNextPayment(ultimoPagamento, fracionamento) || ""
    );
    if (proximaCobranca === null) return;

    let insurer_id = policy.insurer_id || null;

    if (seguradora) {
      const { data: existingInsurer } = await supabase
        .from("insurers")
        .select("*")
        .ilike("name", seguradora)
        .maybeSingle();

      if (existingInsurer) {
        insurer_id = existingInsurer.id;
      } else {
        const { data: newInsurer, error: insurerError } = await supabase
          .from("insurers")
          .insert({ name: seguradora })
          .select()
          .single();

        if (insurerError) {
          alert(insurerError.message);
          return;
        }

        insurer_id = newInsurer.id;
      }
    }

    const { error } = await supabase
      .from("policies")
      .update({
        policy_number: numero,
        branch: ramo,
        insurer_id,
        annual_premium: premio || null,
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

  function markPolicyPaid(policyId) {
    fetch("/api/mark-policy-paid", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        policy_id: policyId,
      }),
    }).then(() => {
      window.location.reload();
    });
  }

  return (
    <div style={page}>
      <Sidebar active="clientes" />

      <main style={main}>
        <div style={header}>
          <div>
            <h1 style={title}>{client.name}</h1>

            <p style={subtitle}>
              {client.nif || "Sem NIF"} · {client.phone || "Sem telefone"}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={button} onClick={editClient}>
              Editar cliente
            </button>

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
          <h2>Resumo 360º</h2>

          <div style={statsRow}>
            <div style={greenBox}>Apólices em vigor: {activePolicies}</div>
            <div style={redBox}>Apólices anuladas: {cancelledPolicies}</div>
            <div style={blueBox}>Sinistros abertos: {openClaims}</div>
            <div style={orangeBox}>Tarefas abertas: {openTasks}</div>
            <div style={purpleBox}>Classificação: {clientRating()}</div>
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
            <Info label="Data nascimento" value={formatDate(client.birth_date)} />
            <Info label="Idade" value={calculateAge(client.birth_date)} />
            <Info label="Início carta condução" value={formatDate(client.driving_license_start_date)} />
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

                  <p><strong>Apólice:</strong> {policy.policy_number || "-"}</p>
                  <p><strong>Seguradora:</strong> {policy.insurers?.name || "-"}</p>
                  <p><strong>Prémio:</strong> {policy.annual_premium || 0} €</p>
                  <p><strong>Fracionamento:</strong> {policy.payment_frequency || "anual"}</p>
                  <p><strong>Data início:</strong> {formatDate(policy.start_date)}</p>
                  <p><strong>Renovação:</strong> {formatDate(policy.renewal_date)}</p>
                  <p><strong>Último pagamento:</strong> {formatDate(policy.last_payment_date)}</p>
                  <p><strong>Próxima cobrança:</strong> {formatDate(policy.next_payment_date)}</p>
                  <p><strong>Anulada em:</strong> {formatDate(policy.cancelled_at)}</p>

                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <button
                      style={{ ...smallButton, background: "#111827" }}
                      onClick={() => editPolicy(policy)}
                    >
                      Editar apólice
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
            <p>Este cliente ainda não tem sinistros associados.</p>
          ) : (
            <div style={policiesGrid}>
              {claims.map((claim) => (
                <div key={claim.id} style={policyCard}>
                  <div style={policyTop}>
                    <h3>{claim.claim_branch || "Sem ramo"}</h3>

                    <span
                      style={{
                        ...badge,
                        background:
                          claim.status === "ENCERRADO"
                            ? "#dcfce7"
                            : claim.status === "PENDENTE"
                            ? "#fef3c7"
                            : "#dbeafe",
                        color:
                          claim.status === "ENCERRADO"
                            ? "#166534"
                            : claim.status === "PENDENTE"
                            ? "#92400e"
                            : "#1d4ed8",
                      }}
                    >
                      {claim.status || "ABERTO"}
                    </span>
                  </div>

                  <p><strong>Nº sinistro:</strong> {claim.claim_number || "-"}</p>
                  <p><strong>Seguradora:</strong> {claim.insurer_name || "-"}</p>
                  <p><strong>Data sinistro:</strong> {formatDate(claim.claim_date)}</p>
                  <p><strong>Envio seguradora:</strong> {formatDate(claim.submitted_date)}</p>

                  <Link href={`/sinistros/${claim.id}`} style={detailButton}>
                    Abrir ficha
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={card}>
          <h2>Tarefas associadas</h2>

          {tasks.length === 0 ? (
            <p>Este cliente não tem tarefas associadas.</p>
          ) : (
            <div style={policiesGrid}>
              {tasks.map((task) => (
                <div key={task.id} style={policyCard}>
                  <div style={policyTop}>
                    <h3>{task.title}</h3>

                    <span
                      style={{
                        ...badge,
                        background:
                          task.priority === "MUITO URGENTE"
                            ? "#fee2e2"
                            : task.priority === "URGENTE"
                            ? "#fef3c7"
                            : "#e5e7eb",
                        color:
                          task.priority === "MUITO URGENTE"
                            ? "#991b1b"
                            : task.priority === "URGENTE"
                            ? "#92400e"
                            : "#374151",
                      }}
                    >
                      {task.priority}
                    </span>
                  </div>

                  <p><strong>Estado:</strong> {task.status || "-"}</p>
                  <p><strong>Categoria:</strong> {task.category || "-"}</p>
                  <p><strong>Descrição:</strong> {task.description || "-"}</p>

                  <div style={procedureBox}>
                    <strong>Procedimentos</strong>
                    <pre style={procedureText}>{task.procedure_notes || "-"}</pre>
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
  flexWrap: "wrap",
  gap: 16,
  marginTop: 20,
  marginBottom: 10,
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
  fontWeight: "bold",
};

const detailButton = {
  background: "#111827",
  color: "white",
  padding: "10px 14px",
  borderRadius: 8,
  textDecoration: "none",
  display: "inline-block",
  marginTop: 10,
};

const procedureBox = {
  background: "#f9fafb",
  borderRadius: 12,
  padding: 14,
  marginTop: 16,
};

const procedureText = {
  whiteSpace: "pre-wrap",
  fontFamily: "Arial",
  margin: "10px 0 0",
};
