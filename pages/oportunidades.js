import { useState } from "react";
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
      .select("*")
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

function formatEuro(value) {
  return new Intl.NumberFormat(
    "pt-PT",
    {
      style: "currency",
      currency: "EUR",
    }
  ).format(Number(value || 0));
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
  const [loading, setLoading] =
    useState(false);

  async function createOpportunity() {
    const name = prompt(
      "Nome da oportunidade"
    );

    if (!name) return;

    const contact_name = prompt(
      "Nome do contacto"
    );

    const phone =
      prompt("Telefone");

    const email =
      prompt("Email");

    const branch =
      prompt("Ramo");

    const insurer =
      prompt("Seguradora");

    const premium = prompt(
      "Prémio potencial (€)"
    );

    const commission = prompt(
      "Comissão potencial (€)"
    );

    const priority = prompt(
      "Prioridade (LOW, NORMAL, HIGH, URGENT)",
      "NORMAL"
    );

    const notes =
      prompt("Notas");

    const next_followup =
      prompt(
        "Próximo follow-up (AAAA-MM-DD)"
      );

    setLoading(true);

    const { error } =
      await supabase
        .from("opportunities")
        .insert({
          name,
          contact_name,
          phone,
          email,
          branch,
          insurer,
          premium: premium
            ? String(
                premium
              ).replace(",", ".")
            : null,
          commission: commission
            ? String(
                commission
              ).replace(",", ".")
            : null,
          priority,
          notes,
          next_followup,
        });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function updateStatus(
    id,
    status
  ) {
    const updateData = {
      status,
    };

    if (
      status === "ganho" ||
      status === "perdido"
    ) {
      updateData.closed_at =
        new Date().toISOString();
    }

    const { error } =
      await supabase
        .from("opportunities")
        .update(updateData)
        .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  const leads =
    opportunities.filter(
      (o) => o.status === "lead"
    );

  const proposals =
    opportunities.filter(
      (o) =>
        o.status === "proposta"
    );

  const won =
    opportunities.filter(
      (o) => o.status === "ganho"
    );

  const lost =
    opportunities.filter(
      (o) => o.status === "perdido"
    );

  const openPremium =
    opportunities
      .filter(
        (o) =>
          o.status !== "ganho" &&
          o.status !== "perdido"
      )
      .reduce(
        (sum, o) =>
          sum +
          Number(o.premium || 0),
        0
      );

  const openCommission =
    opportunities
      .filter(
        (o) =>
          o.status !== "ganho" &&
          o.status !== "perdido"
      )
      .reduce(
        (sum, o) =>
          sum +
          Number(
            o.commission || 0
          ),
        0
      );

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
              Gestão comercial,
              callbacks e pipeline
              de vendas.
            </p>
          </div>

          <button
            style={button}
            onClick={
              createOpportunity
            }
            disabled={loading}
          >
            {loading
              ? "A criar..."
              : "+ Nova oportunidade"}
          </button>
        </div>

        <section style={statsGrid}>
          <StatCard
            title="Leads"
            value={leads.length}
            color="#2563eb"
          />

          <StatCard
            title="Propostas"
            value={
              proposals.length
            }
            color="#7c3aed"
          />

          <StatCard
            title="Ganhos"
            value={won.length}
            color="#16a34a"
          />

          <StatCard
            title="Perdidos"
            value={lost.length}
            color="#dc2626"
          />

          <StatCard
            title="Prémio potencial"
            value={formatEuro(
              openPremium
            )}
            color="#f59e0b"
          />

          <StatCard
            title="Comissão potencial"
            value={formatEuro(
              openCommission
            )}
            color="#0f766e"
          />
        </section>

        <section style={board}>
          <PipelineColumn
            title="Leads"
            color="#2563eb"
            items={leads}
            updateStatus={
              updateStatus
            }
          />

          <PipelineColumn
            title="Propostas"
            color="#7c3aed"
            items={proposals}
            updateStatus={
              updateStatus
            }
          />

          <PipelineColumn
            title="Ganhos"
            color="#16a34a"
            items={won}
            updateStatus={
              updateStatus
            }
          />

          <PipelineColumn
            title="Perdidos"
            color="#dc2626"
            items={lost}
            updateStatus={
              updateStatus
            }
          />
        </section>
      </main>
    </div>
  );
}

function PipelineColumn({
  title,
  items,
  color,
  updateStatus,
}) {
  return (
    <div style={column}>
      <div
        style={{
          ...columnHeader,
          borderTop: `6px solid ${color}`,
        }}
      >
        <h2>{title}</h2>
        <span>{items.length}</span>
      </div>

      <div style={columnBody}>
        {items.length === 0 ? (
          <p style={muted}>
            Sem oportunidades.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              style={opportunityCard}
            >
              <div
                style={
                  opportunityTop
                }
              >
                <h3>
                  {item.name}
                </h3>

                <span
                  style={{
                    ...priorityBadge,
                    background:
                      getPriorityColor(
                        item.priority
                      ),
                  }}
                >
                  {item.priority ||
                    "NORMAL"}
                </span>
              </div>

              <p>
                <strong>
                  Contacto:
                </strong>{" "}
                {item.contact_name ||
                  "-"}
              </p>

              <p>
                <strong>
                  Telefone:
                </strong>{" "}
                {item.phone ||
                  "-"}
              </p>

              <p>
                <strong>
                  Email:
                </strong>{" "}
                {item.email ||
                  "-"}
              </p>

              <p>
                <strong>
                  Ramo:
                </strong>{" "}
                {item.branch ||
                  "-"}
              </p>

              <p>
                <strong>
                  Seguradora:
                </strong>{" "}
                {item.insurer ||
                  "-"}
              </p>

              <p>
                <strong>
                  Prémio:
                </strong>{" "}
                {formatEuro(
                  item.premium
                )}
              </p>

              <p>
                <strong>
                  Comissão:
                </strong>{" "}
                {formatEuro(
                  item.commission
                )}
              </p>

              <p>
                <strong>
                  Follow-up:
                </strong>{" "}
                {formatDate(
                  item.next_followup
                )}
              </p>

              <p>
                <strong>
                  Notas:
                </strong>{" "}
                {item.notes || "-"}
              </p>

              <div
                style={
                  actions
                }
              >
                {item.status !==
                  "lead" && (
                  <button
                    style={{
                      ...smallButton,
                      background:
                        "#2563eb",
                    }}
                    onClick={() =>
                      updateStatus(
                        item.id,
                        "lead"
                      )
                    }
                  >
                    Lead
                  </button>
                )}

                {item.status !==
                  "proposta" && (
                  <button
                    style={{
                      ...smallButton,
                      background:
                        "#7c3aed",
                    }}
                    onClick={() =>
                      updateStatus(
                        item.id,
                        "proposta"
                      )
                    }
                  >
                    Proposta
                  </button>
                )}

                {item.status !==
                  "ganho" && (
                  <button
                    style={{
                      ...smallButton,
                      background:
                        "#16a34a",
                    }}
                    onClick={() =>
                      updateStatus(
                        item.id,
                        "ganho"
                      )
                    }
                  >
                    Ganho
                  </button>
                )}

                {item.status !==
                  "perdido" && (
                  <button
                    style={{
                      ...smallButton,
                      background:
                        "#dc2626",
                    }}
                    onClick={() =>
                      updateStatus(
                        item.id,
                        "perdido"
                      )
                    }
                  >
                    Perdido
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  color,
}) {
  return (
    <div style={statCard}>
      <p style={cardLabel}>
        {title}
      </p>

      <h2
        style={{
          ...cardValue,
          color,
        }}
      >
        {value}
      </h2>
    </div>
  );
}

function getPriorityColor(
  priority
) {
  const p = String(
    priority || ""
  ).toUpperCase();

  if (p === "URGENT")
    return "#dc2626";

  if (p === "HIGH")
    return "#ea580c";

  if (p === "LOW")
    return "#6b7280";

  return "#2563eb";
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
  marginTop: 10,
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

const statsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 18,
  marginBottom: 30,
};

const statCard = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  boxShadow:
    "0 1px 4px rgba(0,0,0,0.08)",
};

const cardLabel = {
  color: "#6b7280",
  margin: 0,
};

const cardValue = {
  marginTop: 12,
  fontSize: 30,
};

const board = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 20,
};

const column = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const columnHeader = {
  background: "white",
  padding: 20,
  borderRadius: 16,
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
};

const columnBody = {
  display: "grid",
  gap: 16,
};

const opportunityCard = {
  background: "white",
  padding: 20,
  borderRadius: 16,
  boxShadow:
    "0 1px 4px rgba(0,0,0,0.08)",
};

const opportunityTop = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  marginBottom: 12,
};

const priorityBadge = {
  color: "white",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
};

const actions = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 16,
};

const smallButton = {
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const muted = {
  color: "#6b7280",
};
