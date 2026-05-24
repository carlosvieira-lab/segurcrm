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

function annualCommission(policy) {
  const commission = Number(policy.commission_per_payment || 0);
  const frequency = String(policy.payment_frequency || "anual").toLowerCase();

  if (frequency === "mensal") return commission * 12;
  if (frequency === "trimestral") return commission * 4;
  if (frequency === "semestral") return commission * 2;

  return commission;
}

export default function Financeiro({ policies }) {
  const activePolicies = policies.filter((p) => p.status !== "anulada");
  const cancelledPolicies = policies.filter((p) => p.status === "anulada");

  const activePremium = activePolicies.reduce(
    (sum, p) => sum + Number(p.annual_premium || 0),
    0
  );

  const vidaBranches = [
    "vida",
    "aps",
    "viagem",
  ];

  const vidaPolicies =
    activePolicies.filter((p) =>
      vidaBranches.includes(
        String(p.branch || "")
          .toLowerCase()
          .trim()
      )
    );

  const naoVidaPolicies =
    activePolicies.filter(
      (p) =>
        !vidaBranches.includes(
          String(p.branch || "")
            .toLowerCase()
            .trim()
        )
    );

  const vidaPremium =
    vidaPolicies.reduce(
      (sum, p) =>
        sum +
        Number(
          p.annual_premium || 0
        ),
      0
    );

  const naoVidaPremium =
    naoVidaPolicies.reduce(
      (sum, p) =>
        sum +
        Number(
          p.annual_premium || 0
        ),
      0
    );

  const vidaPercentage =
    activePremium > 0
      ? (
          (vidaPremium /
            activePremium) *
          100
        ).toFixed(1)
      : "0.0";

  const naoVidaPercentage =
    activePremium > 0
      ? (
          (naoVidaPremium /
            activePremium) *
          100
        ).toFixed(1)
      : "0.0";

  const vidaPolicyPercentage =
    activePolicies.length > 0
      ? (
          (vidaPolicies.length /
            activePolicies.length) *
          100
        ).toFixed(1)
      : "0.0";

  const naoVidaPolicyPercentage =
    activePolicies.length > 0
      ? (
          (naoVidaPolicies.length /
            activePolicies.length) *
          100
        ).toFixed(1)
      : "0.0";

  const cancelledPremium = cancelledPolicies.reduce(
    (sum, p) => sum + Number(p.annual_premium || 0),
    0
  );

  const activeCommission = activePolicies.reduce(
    (sum, p) => sum + annualCommission(p),
    0
  );

  const lostCommission = cancelledPolicies.reduce(
    (sum, p) => sum + annualCommission(p),
    0
  );

  const monthlyCommissionEstimate = activeCommission / 12;

  const insurerStats = {};
  const branchStats = {};
  const frequencyStats = {};

  activePolicies.forEach((policy) => {
    const insurer = policy.insurers?.name || "Sem seguradora";
    const branch = policy.branch || "Sem ramo";
    const frequency = policy.payment_frequency || "anual";
    const commission = annualCommission(policy);
    const premium = Number(policy.annual_premium || 0);

    if (!insurerStats[insurer]) {
      insurerStats[insurer] = {
        policies: 0,
        premium: 0,
        commission: 0,
      };
    }

    insurerStats[insurer].policies += 1;
    insurerStats[insurer].premium += premium;
    insurerStats[insurer].commission += commission;

    if (!branchStats[branch]) {
      branchStats[branch] = {
        policies: 0,
        premium: 0,
        commission: 0,
      };
    }

    branchStats[branch].policies += 1;
    branchStats[branch].premium += premium;
    branchStats[branch].commission += commission;

    if (!frequencyStats[frequency]) {
      frequencyStats[frequency] = {
        policies: 0,
        commission: 0,
      };
    }

    frequencyStats[frequency].policies += 1;
    frequencyStats[frequency].commission += commission;
  });

  return (
    <div style={page}>
      <Sidebar active="financeiro" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Financeiro</h1>
            <p style={subtitle}>
              Painel financeiro de prémios comerciais e comissões.
            </p>
          </div>
        </header>

        <section style={statsGrid}>
          <StatCard
            title="Prémio comercial em vigor"
            value={formatEuro(activePremium)}
            color="#16a34a"
          />

          <StatCard
            title="Prémio comercial em vigor N VIDA"
            value={`${formatEuro(naoVidaPremium)} · ${naoVidaPercentage}%`}
            color="#0891b2"
          />

          <StatCard
            title="Prémio comercial em vigor VIDA"
            value={`${formatEuro(vidaPremium)} · ${vidaPercentage}%`}
            color="#7c3aed"
          />

          <StatCard
            title="Apólices em vigor N VIDA"
            value={`${naoVidaPolicies.length} · ${naoVidaPolicyPercentage}%`}
            color="#0f766e"
          />

          <StatCard
            title="Apólices em vigor VIDA"
            value={`${vidaPolicies.length} · ${vidaPolicyPercentage}%`}
            color="#9333ea"
          />

          <StatCard
            title="Comissão anual em vigor"
            value={formatEuro(activeCommission)}
            color="#2563eb"
          />

          <StatCard
            title="Comissão mensal estimada"
            value={formatEuro(monthlyCommissionEstimate)}
            color="#7c3aed"
          />

          <StatCard
            title="Prémio anulado"
            value={formatEuro(cancelledPremium)}
            color="#dc2626"
          />

          <StatCard
            title="Comissão perdida"
            value={formatEuro(lostCommission)}
            color="#991b1b"
          />
        </section>

        <section style={grid2}>
          <Panel title="Comissão por seguradora">
            <FinanceTable
              rows={Object.entries(insurerStats)
                .sort((a, b) => b[1].commission - a[1].commission)
                .map(([name, item]) => ({
                  name,
                  policies: item.policies,
                  premium: item.premium,
                  commission: item.commission,
                }))}
            />
          </Panel>

          <Panel title="Comissão por ramo">
            <FinanceTable
              rows={Object.entries(branchStats)
                .sort((a, b) => b[1].commission - a[1].commission)
                .map(([name, item]) => ({
                  name,
                  policies: item.policies,
                  premium: item.premium,
                  commission: item.commission,
                }))}
            />
          </Panel>
        </section>

        <section style={panel}>
          <h2 style={panelTitle}>Comissão por fracionamento</h2>

          {Object.keys(frequencyStats).length === 0 ? (
            <p style={muted}>Sem dados disponíveis.</p>
          ) : (
            <div style={frequencyGrid}>
              {Object.entries(frequencyStats)
                .sort((a, b) => b[1].commission - a[1].commission)
                .map(([frequency, item]) => (
                  <div key={frequency} style={frequencyCard}>
                    <p style={cardLabel}>{frequency}</p>
                    <h3 style={frequencyValue}>
                      {formatEuro(item.commission)}
                    </h3>
                    <p style={muted}>{item.policies} apólices</p>
                  </div>
                ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div style={statCard}>
      <p style={cardLabel}>{title}</p>
      <h2 style={{ ...cardValue, color }}>{value}</h2>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section style={panel}>
      <h2 style={panelTitle}>{title}</h2>
      {children}
    </section>
  );
}

function FinanceTable({ rows }) {
  if (rows.length === 0) {
    return <p style={muted}>Sem dados disponíveis.</p>;
  }

  return (
    <div style={table}>
      <div style={tableHeader}>
        <span>Nome</span>
        <span>Apólices</span>
        <span>Prémio</span>
        <span>Comissão</span>
      </div>

      {rows.map((row) => (
        <div key={row.name} style={tableRow}>
          <strong>{row.name}</strong>
          <span>{row.policies}</span>
          <span>{formatEuro(row.premium)}</span>
          <strong style={{ color: "#2563eb" }}>
            {formatEuro(row.commission)}
          </strong>
        </div>
      ))}
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
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 18,
  marginBottom: 30,
};

const statCard = {
  background: "white",
  padding: 18,
  borderRadius: 18,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  minHeight: 115,
};

const cardLabel = {
  color: "#6b7280",
  margin: 0,
};

const cardValue = {
  fontSize: 24,
  marginTop: 12,
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 24,
};

const panel = {
  background: "white",
  borderRadius: 18,
  padding: 24,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const panelTitle = {
  marginTop: 0,
  marginBottom: 20,
};

const table = {
  display: "grid",
  gap: 8,
};

const tableHeader = {
  display: "grid",
  gridTemplateColumns: "1.5fr 0.8fr 1fr 1fr",
  gap: 12,
  background: "#f3f4f6",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 14,
};

const tableRow = {
  display: "grid",
  gridTemplateColumns: "1.5fr 0.8fr 1fr 1fr",
  gap: 12,
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
  alignItems: "center",
};

const frequencyGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const frequencyCard = {
  background: "#f9fafb",
  borderRadius: 14,
  padding: 20,
};

const frequencyValue = {
  margin: "10px 0",
  fontSize: 26,
  color: "#2563eb",
};

const muted = {
  color: "#6b7280",
};
