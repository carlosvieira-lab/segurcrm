import { createClient } from "@supabase/supabase-js";
import Sidebar from "../components/Sidebar";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function getServerSideProps() {
  const { data: policies } = await supabase
    .from("policies")
    .select(`
      *,
      clients(name),
      insurers(name)
    `);

  return {
    props: {
      policies: policies || [],
    },
  };
}

function formatEuro(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

export default function Financeiro({ policies }) {
  const activePolicies = policies.filter(
    (p) => p.status === "ativa"
  );

  const totalAnnualPremium = activePolicies.reduce(
    (sum, p) => sum + Number(p.annual_premium || 0),
    0
  );

  const monthlyEstimate =
    totalAnnualPremium / 12;

  const quarterlyPolicies = activePolicies.filter(
    (p) => p.payment_frequency === "trimestral"
  );

  const monthlyPolicies = activePolicies.filter(
    (p) => p.payment_frequency === "mensal"
  );

  const yearlyPolicies = activePolicies.filter(
    (p) =>
      p.payment_frequency === "anual" ||
      !p.payment_frequency
  );

  return (
    <div style={page}>
      <Sidebar active="financeiro" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Financeiro</h1>

            <p style={subtitle}>
              Indicadores financeiros e visão
              global da carteira.
            </p>
          </div>
        </header>

        <section style={statsGrid}>
          <StatCard
            title="Prémio anual em vigor"
            value={formatEuro(
              totalAnnualPremium
            )}
            color="#16a34a"
          />

          <StatCard
            title="Estimativa mensal"
            value={formatEuro(
              monthlyEstimate
            )}
            color="#2563eb"
          />

          <StatCard
            title="Apólices mensais"
            value={monthlyPolicies.length}
            color="#7c3aed"
          />

          <StatCard
            title="Apólices trimestrais"
            value={
              quarterlyPolicies.length
            }
            color="#f59e0b"
          />

          <StatCard
            title="Apólices anuais"
            value={yearlyPolicies.length}
            color="#dc2626"
          />
        </section>

        <section style={panel}>
          <h2 style={panelTitle}>
            Distribuição da carteira
          </h2>

          <div style={cardsGrid}>
            <FinanceCard
              title="Mensal"
              total={monthlyPolicies.length}
              color="#7c3aed"
            />

            <FinanceCard
              title="Trimestral"
              total={
                quarterlyPolicies.length
              }
              color="#f59e0b"
            />

            <FinanceCard
              title="Anual"
              total={yearlyPolicies.length}
              color="#dc2626"
            />
          </div>
        </section>

        <section style={panel}>
          <h2 style={panelTitle}>
            Carteira ativa
          </h2>

          {activePolicies.length === 0 ? (
            <p style={muted}>
              Não existem apólices ativas.
            </p>
          ) : (
            <div style={list}>
              {activePolicies.map((policy) => (
                <div
                  key={policy.id}
                  style={policyCard}
                >
                  <div>
                    <h3 style={policyTitle}>
                      {policy.branch ||
                        "Sem ramo"}
                    </h3>

                    <p style={smallText}>
                      Cliente:{" "}
                      {policy.clients?.name ||
                        "-"}
                    </p>

                    <p style={smallText}>
                      Seguradora:{" "}
                      {policy.insurers?.name ||
                        "-"}
                    </p>

                    <p style={smallText}>
                      Apólice:{" "}
                      {policy.policy_number ||
                        "-"}
                    </p>

                    <p style={smallText}>
                      Fracionamento:{" "}
                      {policy.payment_frequency ||
                        "anual"}
                    </p>
                  </div>

                  <div
                    style={premiumContainer}
                  >
                    <span style={premium}>
                      {formatEuro(
                        policy.annual_premium
                      )}
                    </span>
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

function StatCard({
  title,
  value,
  color,
}) {
  return (
    <div style={statCard}>
      <p style={cardLabel}>{title}</p>

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

function FinanceCard({
  title,
  total,
  color,
}) {
  return (
    <div
      style={{
        ...financeCard,
        borderTop: `5px solid ${color}`,
      }}
    >
      <h3 style={financeTitle}>
        {title}
      </h3>

      <p style={financeValue}>
        {total}
      </p>
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

const statsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 18,
  marginBottom: 30,
};

const statCard = {
  background: "white",
  borderRadius: 18,
  padding: 22,
  boxShadow:
    "0 1px 4px rgba(0,0,0,0.08)",
};

const cardLabel = {
  color: "#6b7280",
  margin: 0,
};

const cardValue = {
  marginTop: 12,
  fontSize: 28,
};

const panel = {
  background: "white",
  borderRadius: 18,
  padding: 24,
  marginBottom: 24,
  boxShadow:
    "0 1px 4px rgba(0,0,0,0.08)",
};

const panelTitle = {
  marginTop: 0,
  marginBottom: 20,
};

const cardsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3,1fr)",
  gap: 18,
};

const financeCard = {
  background: "#f9fafb",
  borderRadius: 16,
  padding: 24,
};

const financeTitle = {
  marginTop: 0,
  marginBottom: 10,
};

const financeValue = {
  fontSize: 36,
  fontWeight: "bold",
  margin: 0,
};

const muted = {
  color: "#6b7280",
};

const list = {
  display: "grid",
  gap: 16,
};

const policyCard = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 18,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const policyTitle = {
  margin: 0,
};

const smallText = {
  color: "#6b7280",
  margin: "6px 0",
};

const premiumContainer = {
  textAlign: "right",
};

const premium = {
  fontSize: 24,
  fontWeight: "bold",
  color: "#16a34a",
};

