import Link from "next/link";
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
      .select(`
        *,
        insurers(name)
      `)
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

function calculateAnnualCommission(
  policy
) {
  const commission = Number(
    policy.commission_per_payment ||
      0
  );

  const frequency = String(
    policy.payment_frequency ||
      "anual"
  ).toLowerCase();

  if (frequency === "mensal") {
    return commission * 12;
  }

  if (
    frequency === "trimestral"
  ) {
    return commission * 4;
  }

  if (
    frequency === "semestral"
  ) {
    return commission * 2;
  }

  return commission;
}

export default function ClientePage({
  client,
  policies,
}) {
  async function createPolicy() {
    const numero = prompt(
      "Número da Apólice"
    );

    if (!numero) return;

    const ramo = prompt(
      "Ramo"
    );

    const seguradora =
      prompt("Seguradora") || "";

    const premio = prompt(
      "Prémio comercial anual"
    );

    const commissionPerPayment =
      prompt(
        "Comissão por pagamento (€)"
      );

    const fracionamento =
      prompt(
        "Fracionamento (Mensal, Trimestral, Semestral, Anual)"
      );

    const dataInicio = prompt(
      "Data início apólice (AAAA-MM-DD)"
    );

    const renovacao = prompt(
      "Data Renovação (AAAA-MM-DD)"
    );

    const response =
      await fetch(
        "/api/create-policy",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            client_id: client.id,
            policy_number: numero,
            branch: ramo,
            insurer_name:
              seguradora,
            annual_premium:
              premio,
            commission_per_payment:
              commissionPerPayment,
            payment_frequency:
              fracionamento,
            start_date:
              dataInicio,
            renewal_date:
              renovacao,
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
          "Erro ao criar apólice"
      );
    }
  }

  async function editPolicy(
    policy
  ) {
    const numero = prompt(
      "Número da Apólice",
      policy.policy_number || ""
    );

    if (numero === null) return;

    const ramo = prompt(
      "Ramo",
      policy.branch || ""
    );

    if (ramo === null) return;

    const seguradora = prompt(
      "Seguradora",
      policy.insurers?.name ||
        ""
    );

    if (seguradora === null)
      return;

    const premio = prompt(
      "Prémio comercial anual",
      policy.annual_premium ||
        ""
    );

    if (premio === null) return;

    const commissionPerPayment =
      prompt(
        "Comissão por pagamento (€)",
        policy.commission_per_payment ||
          ""
      );

    if (
      commissionPerPayment ===
      null
    )
      return;

    const fracionamento =
      prompt(
        "Fracionamento",
        policy.payment_frequency ||
          "Anual"
      );

    if (
      fracionamento === null
    )
      return;

    let insurer_id =
      policy.insurer_id || null;

    if (seguradora) {
      let {
        data: existingInsurer,
      } = await supabase
        .from("insurers")
        .select("id")
        .eq(
          "name",
          seguradora.trim()
        )
        .maybeSingle();

      if (!existingInsurer) {
        const {
          data: newInsurer,
        } = await supabase
          .from("insurers")
          .insert({
            name:
              seguradora.trim(),
          })
          .select("id")
          .single();

        existingInsurer =
          newInsurer;
      }

      insurer_id =
        existingInsurer.id;
    }

    const { error } =
      await supabase
        .from("policies")
        .update({
          policy_number: numero,

          branch: ramo,

          insurer_id,

          annual_premium:
            premio
              ? String(
                  premio
                ).replace(
                  ",",
                  "."
                )
              : null,

          commission_per_payment:
            commissionPerPayment
              ? String(
                  commissionPerPayment
                ).replace(
                  ",",
                  "."
                )
              : null,

          payment_frequency:
            fracionamento,
        })
        .eq("id", policy.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function updatePolicyStatus(
    policyId,
    status
  ) {
    const response =
      await fetch(
        "/api/update-policy-status",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            policy_id: policyId,
            status,
          }),
        }
      );

    if (!response.ok) {
      alert(
        "Erro ao atualizar estado"
      );
      return;
    }

    window.location.reload();
  }

  async function markPolicyPaid(
    policyId
  ) {
    const response =
      await fetch(
        "/api/mark-policy-paid",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            policy_id: policyId,
          }),
        }
      );

    if (!response.ok) {
      alert(
        "Erro ao marcar pagamento"
      );
      return;
    }

    window.location.reload();
  }

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

          <button
            style={button}
            onClick={createPolicy}
          >
            + Nova Apólice
          </button>
        </div>

        <section style={card}>
          <h2>Apólices</h2>

          {policies.length ===
          0 ? (
            <p>
              Sem apólices.
            </p>
          ) : (
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
                        Seguradora:
                      </strong>{" "}
                      {policy
                        .insurers
                        ?.name ||
                        "-"}
                    </p>

                    <p>
                      <strong>
                        Prémio comercial anual:
                      </strong>{" "}
                      {policy.annual_premium ||
                        0} €
                    </p>

                    <p>
                      <strong>
                        Comissão pagamento:
                      </strong>{" "}
                      {policy.commission_per_payment ||
                        0} €
                    </p>

                    <p>
                      <strong>
                        Comissão anual:
                      </strong>{" "}
                      {calculateAnnualCommission(
                        policy
                      )} €
                    </p>

                    <p>
                      <strong>
                        Fracionamento:
                      </strong>{" "}
                      {policy.payment_frequency ||
                        "-"}
                    </p>

                    <p>
                      <strong>
                        Renovação:
                      </strong>{" "}
                      {formatDate(
                        policy.renewal_date
                      )}
                    </p>

                    <div
                      style={{
                        display:
                          "flex",
                        gap: 8,
                        flexWrap:
                          "wrap",
                        marginTop: 16,
                      }}
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
                        style={{
                          ...smallButton,
                          background:
                            "#16a34a",
                        }}
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
                        style={{
                          ...smallButton,
                          background:
                            "#dc2626",
                        }}
                        onClick={() =>
                          updatePolicyStatus(
                            policy.id,
                            "anulada"
                          )
                        }
                      >
                        Anulada
                      </button>

                      <button
                        style={{
                          ...smallButton,
                          background:
                            "#2563eb",
                        }}
                        onClick={() =>
                          markPolicyPaid(
                            policy.id
                          )
                        }
                      >
                        Marcar pago
                      </button>
                    </div>
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

const card = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  boxShadow:
    "0 1px 4px rgba(0,0,0,0.08)",
};

const policiesGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(300px, 1fr))",
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
