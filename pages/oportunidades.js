import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "../components/Sidebar";

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

export async function getServerSideProps() {
  const { data: opportunities } =
    await supabase
      .from("opportunities")
      .select(`
        *,
        clients (
          id,
          name,
          nif
        )
      `)
      .order("created_at", {
        ascending: false,
      });

  return {
    props: {
      opportunities:
        opportunities || [],
    },
  };
}

function formatDate(date) {
  if (!date) return "-";

  return new Intl.DateTimeFormat(
    "pt-PT"
  ).format(new Date(date));
}

export default function Oportunidades({
  opportunities,
}) {
  async function createOpportunity() {
    const title = prompt(
      "Título da oportunidade"
    );

    if (!title) return;

    const description = prompt(
      "Descrição"
    );

    const branch = prompt(
      "Ramo"
    );

    const estimated_value = prompt(
      "Valor estimado (€)"
    );

    const status = prompt(
      "Estado (ABERTA, EM NEGOCIAÇÃO, GANHA, PERDIDA)",
      "ABERTA"
    );

    const { error } =
      await supabase
        .from("opportunities")
        .insert({
          title,
          description,
          branch,
          estimated_value,
          status,
        });

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function updateStatus(
    id,
    currentStatus
  ) {
    const status = prompt(
      "Novo estado",
      currentStatus
    );

    if (!status) return;

    const { error } =
      await supabase
        .from("opportunities")
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

  return (
    <div style={page}>
      <Sidebar active="oportunidades" />

      <main style={main}>
        <div style={header}>
          <div>
            <h1 style={title}>
              Oportunidades
            </h1>

            <p style={subtitle}>
              Gestão comercial simples
              e objetiva.
            </p>
          </div>

          <button
            style={button}
            onClick={
              createOpportunity
            }
          >
            + Nova oportunidade
          </button>
        </div>

        {opportunities.length ===
        0 ? (
          <div style={emptyCard}>
            Sem oportunidades.
          </div>
        ) : (
          <div style={grid}>
            {opportunities.map(
              (opportunity) => (
                <div
                  key={
                    opportunity.id
                  }
                  style={card}
                >
                  <div
                    style={top}
                  >
                    <h2>
                      {
                        opportunity.title
                      }
                    </h2>

                    <span
                      style={
                        badge
                      }
                    >
                      {opportunity.status ||
                        "ABERTA"}
                    </span>
                  </div>

                  <p>
                    <strong>
                      Cliente:
                    </strong>{" "}
                    {opportunity
                      .clients
                      ?.name ? (
                      <Link
                        href={`/clientes/${opportunity.clients.id}`}
                        style={
                          link
                        }
                      >
                        {
                          opportunity
                            .clients
                            .name
                        }
                      </Link>
                    ) : (
                      "-"
                    )}
                  </p>

                  <p>
                    <strong>
                      Ramo:
                    </strong>{" "}
                    {opportunity.branch ||
                      "-"}
                  </p>

                  <p>
                    <strong>
                      Valor:
                    </strong>{" "}
                    {opportunity.estimated_value ||
                      0}{" "}
                    €
                  </p>

                  <p>
                    <strong>
                      Criada:
                    </strong>{" "}
                    {formatDate(
                      opportunity.created_at
                    )}
                  </p>

                  <p>
                    <strong>
                      Descrição:
                    </strong>{" "}
                    {opportunity.description ||
                      "-"}
                  </p>

                  <div
                    style={
                      buttonRow
                    }
                  >
                    <button
                      style={
                        smallButton
                      }
                      onClick={() =>
                        updateStatus(
                          opportunity.id,
                          opportunity.status
                        )
                      }
                    >
                      Alterar estado
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
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

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 18,
};

const card = {
  background: "white",
  padding: 22,
  borderRadius: 18,
  boxShadow:
    "0 1px 4px rgba(0,0,0,0.08)",
};

const top = {
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

const buttonRow = {
  marginTop: 18,
  display: "flex",
  gap: 10,
};

const smallButton = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const emptyCard = {
  background: "white",
  padding: 30,
  borderRadius: 18,
  textAlign: "center",
};

const link = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: "bold",
};
