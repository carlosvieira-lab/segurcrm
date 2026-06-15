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
    `)
    .range(0, 4999);

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

function normalizeBranchName(branch) {
  return String(branch || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getBranchIcon(branch) {
  const normalized = normalizeBranchName(branch);

  if (normalized.includes("AUTOMOVEL")) return "🚗";
  if (normalized.includes("CASA")) return "🏠";
  if (normalized.includes("SAUDE")) return "❤️";
  if (normalized.includes("VIDA")) return "👤";
  if (normalized.includes("VIAGEM")) return "✈️";
  if (normalized.includes("CAES") || normalized.includes("GATOS")) return "🐾";
  if (normalized.includes("FINANCEIROS")) return "💶";
  if (normalized.includes("ATCO") || normalized.includes("ATCP")) return "🛡️";
  if (normalized.includes("MREMP")) return "🏢";
  if (normalized.includes("APS")) return "🧾";

  return "📄";
}

function getMonthLabel(monthKey) {
  if (!monthKey) return "-";

  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return new Intl.DateTimeFormat("pt-PT", {
    month: "short",
    year: "2-digit",
  }).format(date);
}

function getLast12Months() {
  const result = [];
  const now = new Date();

  for (let index = 11; index >= 0; index--) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    result.push(key);
  }

  return result;
}

export default function FinanceiroCompacto({ policies }) {
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
  const monthlyStats = {};

  const last12Months = getLast12Months();

  last12Months.forEach((monthKey) => {
    monthlyStats[monthKey] = {
      premium: 0,
      commission: 0,
      policies: 0,
    };
  });

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

    const sourceDate = policy.start_date || policy.created_at;

    if (sourceDate) {
      const date = new Date(sourceDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (monthlyStats[key]) {
        monthlyStats[key].premium += premium;
        monthlyStats[key].commission += commission;
        monthlyStats[key].policies += 1;
      }
    }
  });

  const insurerRows = Object.entries(insurerStats)
    .sort((a, b) => b[1].commission - a[1].commission)
    .map(([name, item]) => ({
      name,
      policies: item.policies,
      premium: item.premium,
      commission: item.commission,
    }));

  const branchRows = Object.entries(branchStats)
    .sort((a, b) => b[1].commission - a[1].commission)
    .map(([name, item]) => ({
      name,
      policies: item.policies,
      premium: item.premium,
      commission: item.commission,
    }));

  const frequencyRows = Object.entries(frequencyStats)
    .sort((a, b) => b[1].commission - a[1].commission)
    .map(([frequency, item]) => ({
      frequency,
      policies: item.policies,
      commission: item.commission,
    }));

  const monthlyRows = last12Months.map((monthKey) => ({
    monthKey,
    label: getMonthLabel(monthKey),
    ...monthlyStats[monthKey],
  }));

  const maxMonthlyCommission = Math.max(
    ...monthlyRows.map((item) => Number(item.commission || 0)),
    1
  );

  const cancellationRate =
    policies.length > 0
      ? ((cancelledPolicies.length / policies.length) * 100).toFixed(1)
      : "0.0";

  const lostCommissionPercentage =
    activeCommission + lostCommission > 0
      ? ((lostCommission / (activeCommission + lostCommission)) * 100).toFixed(1)
      : "0.0";

  return (
    <div style={page}>
      <Sidebar active="financeiro-compacto" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>💰 Financeiro</h1>
            <p style={subtitle}>
              Painel financeiro de prémios comerciais e comissões.
            </p>
          </div>

          <div style={headerPill}>
            {activePolicies.length} apólices em vigor · {policies.length} carregadas
          </div>
        </header>

        <section style={heroGrid}>
          <div style={heroCard}>
            <span style={heroLabel}>Prémio comercial em vigor</span>
            <strong style={heroValue}>{formatEuro(activePremium)}</strong>
            <span style={heroMeta}>
              {activePolicies.length} apólices ativas
            </span>
          </div>

          <div style={heroCardBlue}>
            <span style={heroLabel}>Comissão anual em vigor</span>
            <strong style={heroValue}>{formatEuro(activeCommission)}</strong>
            <span style={heroMeta}>
              Estimativa mensal: {formatEuro(monthlyCommissionEstimate)}
            </span>
          </div>

          <div style={heroCardPurple}>
            <span style={heroLabel}>Vida / Não Vida</span>
            <strong style={heroValue}>
              {vidaPercentage}% / {naoVidaPercentage}%
            </strong>
            <span style={heroMeta}>
              Vida {formatEuro(vidaPremium)} · Não Vida {formatEuro(naoVidaPremium)}
            </span>
          </div>

          <div style={heroCardRed}>
            <span style={heroLabel}>Comissão perdida</span>
            <strong style={heroValue}>{formatEuro(lostCommission)}</strong>
            <span style={heroMeta}>
              {lostCommissionPercentage}% da comissão total analisada
            </span>
          </div>
        </section>

        <section style={statsGrid}>
          <StatCard
            title="Prémio comercial em vigor N VIDA"
            value={`${formatEuro(naoVidaPremium)} · ${naoVidaPercentage}%`}
            color="#0891b2"
            icon="🛡️"
          />

          <StatCard
            title="Prémio comercial em vigor VIDA"
            value={`${formatEuro(vidaPremium)} · ${vidaPercentage}%`}
            color="#7c3aed"
            icon="❤️"
          />

          <StatCard
            title="Apólices em vigor N VIDA"
            value={`${naoVidaPolicies.length} · ${naoVidaPolicyPercentage}%`}
            color="#0f766e"
            icon="📄"
          />

          <StatCard
            title="Apólices em vigor VIDA"
            value={`${vidaPolicies.length} · ${vidaPolicyPercentage}%`}
            color="#9333ea"
            icon="👤"
          />

          <StatCard
            title="Comissão mensal estimada"
            value={formatEuro(monthlyCommissionEstimate)}
            color="#2563eb"
            icon="📆"
          />

          <StatCard
            title="Prémio anulado"
            value={formatEuro(cancelledPremium)}
            color="#dc2626"
            icon="❌"
          />
        </section>

        <section style={contentGrid}>
          <Panel title="🏆 Comissão por seguradora">
            <div style={rankingGrid}>
              {insurerRows.length === 0 ? (
                <p style={muted}>Sem dados disponíveis.</p>
              ) : (
                insurerRows.map((row, index) => (
                  <RankingCard
                    key={row.name}
                    index={index}
                    name={row.name}
                    policies={row.policies}
                    premium={row.premium}
                    commission={row.commission}
                  />
                ))
              )}
            </div>
          </Panel>

          <Panel title="📊 Evolução últimos 12 meses">
            <div style={chart}>
              {monthlyRows.map((item) => {
                const height = Math.max(
                  8,
                  Math.round((item.commission / maxMonthlyCommission) * 140)
                );

                return (
                  <div key={item.monthKey} style={chartItem}>
                    <div style={barWrap}>
                      <div
                        title={`${item.label}: ${formatEuro(item.commission)}`}
                        style={{
                          ...bar,
                          height,
                        }}
                      />
                    </div>
                    <span style={chartLabel}>{item.label}</span>
                  </div>
                );
              })}
            </div>

            <p style={chartNote}>
              Evolução baseada na data de início/criação das apólices em vigor.
            </p>
          </Panel>
        </section>

        <section style={contentGrid}>
          <Panel title="🧭 Comissão por ramo">
            <div style={branchGrid}>
              {branchRows.length === 0 ? (
                <p style={muted}>Sem dados disponíveis.</p>
              ) : (
                branchRows.map((row) => (
                  <BranchCard key={row.name} row={row} />
                ))
              )}
            </div>
          </Panel>

          <Panel title="📆 Comissão por fracionamento">
            {frequencyRows.length === 0 ? (
              <p style={muted}>Sem dados disponíveis.</p>
            ) : (
              <div style={frequencyGrid}>
                {frequencyRows.map((row) => (
                  <div key={row.frequency} style={frequencyCard}>
                    <p style={cardLabel}>{row.frequency}</p>
                    <h3 style={frequencyValue}>
                      {formatEuro(row.commission)}
                    </h3>
                    <p style={muted}>{row.policies} apólices</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>

        <section style={alertsPanel}>
          <h2 style={alertsTitle}>⚠️ Alertas financeiros</h2>

          <p style={chartNote}>
            Controlo técnico: esta página carregou {policies.length} apólices do Supabase.
            Se aparecer 1000, o limite ainda está ativo. Se aparecer 1005, está correto.
          </p>

          <div style={alertsGrid}>
            <AlertCard
              title="Apólices anuladas"
              value={cancelledPolicies.length}
              text={`${cancellationRate}% do total de apólices`}
            />

            <AlertCard
              title="Prémio anulado"
              value={formatEuro(cancelledPremium)}
              text="Prémio comercial fora da carteira ativa"
            />

            <AlertCard
              title="Comissão perdida"
              value={formatEuro(lostCommission)}
              text={`${lostCommissionPercentage}% da comissão analisada`}
            />
          </div>
        </section>

        <section style={tableGrid}>
          <Panel title="Tabela — seguradoras">
            <FinanceTable rows={insurerRows} />
          </Panel>

          <Panel title="Tabela — ramos">
            <FinanceTable rows={branchRows} />
          </Panel>
        </section>
      </main>
    </div>
  );
}

function StatCard({ title, value, color, icon }) {
  return (
    <div style={statCard}>
      <div style={{ ...statIcon, color, background: `${color}18` }}>
        {icon}
      </div>

      <div>
        <p style={cardLabel}>{title}</p>
        <h2 style={{ ...cardValue, color }}>{value}</h2>
      </div>
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

function RankingCard({ index, name, policies, premium, commission }) {
  const medals = ["🥇", "🥈", "🥉"];
  const medal = medals[index] || `#${index + 1}`;

  return (
    <div style={rankingCard}>
      <div style={rankingTop}>
        <span style={rankingMedal}>{medal}</span>
        <strong style={rankingName}>{name}</strong>
      </div>

      <div style={rankingNumbers}>
        <span>{policies} apólices</span>
        <span>{formatEuro(premium)}</span>
      </div>

      <strong style={rankingCommission}>{formatEuro(commission)}</strong>
    </div>
  );
}

function BranchCard({ row }) {
  return (
    <div style={branchCard}>
      <div style={branchTop}>
        <span style={branchIcon}>{getBranchIcon(row.name)}</span>
        <strong>{row.name}</strong>
      </div>

      <div style={branchData}>
        <span>{row.policies} apólices</span>
        <span>{formatEuro(row.premium)}</span>
      </div>

      <strong style={branchCommission}>{formatEuro(row.commission)}</strong>
    </div>
  );
}

function AlertCard({ title, value, text }) {
  return (
    <div style={alertCard}>
      <p style={alertTitle}>{title}</p>
      <strong style={alertValue}>{value}</strong>
      <span style={alertText}>{text}</span>
    </div>
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
  background: "#f1f5f9",
  fontFamily: "Arial, sans-serif",
};

const main = {
  flex: 1,
  padding: 24,
};

const header = {
  marginBottom: 18,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
};

const title = {
  fontSize: 36,
  margin: 0,
  color: "#15803d",
  fontWeight: 900,
  lineHeight: 1.05,
};

const subtitle = {
  color: "#475569",
  marginTop: 8,
  fontSize: 15,
};

const headerPill = {
  background: "#dcfce7",
  color: "#166534",
  padding: "10px 14px",
  borderRadius: 999,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const heroGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: 14,
  marginBottom: 16,
};

const heroCard = {
  background: "linear-gradient(135deg, #dcfce7, #ffffff)",
  border: "1px solid #bbf7d0",
  borderRadius: 20,
  padding: 18,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  display: "grid",
  gap: 8,
};

const heroCardBlue = {
  ...heroCard,
  background: "linear-gradient(135deg, #dbeafe, #ffffff)",
  border: "1px solid #bfdbfe",
};

const heroCardPurple = {
  ...heroCard,
  background: "linear-gradient(135deg, #ede9fe, #ffffff)",
  border: "1px solid #ddd6fe",
};

const heroCardRed = {
  ...heroCard,
  background: "linear-gradient(135deg, #fee2e2, #ffffff)",
  border: "1px solid #fecaca",
};

const heroLabel = {
  color: "#475569",
  fontSize: 13,
  fontWeight: 800,
};

const heroValue = {
  color: "#0f172a",
  fontSize: 30,
  lineHeight: 1.05,
};

const heroMeta = {
  color: "#64748b",
  fontSize: 13,
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  marginBottom: 16,
};

const statCard = {
  background: "white",
  padding: 14,
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const statIcon = {
  width: 44,
  height: 44,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  fontSize: 22,
};

const cardLabel = {
  color: "#475569",
  margin: 0,
  fontWeight: 800,
  fontSize: 13,
};

const cardValue = {
  fontSize: 22,
  margin: "6px 0 0",
  lineHeight: 1.08,
};

const contentGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
  marginBottom: 16,
};

const tableGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
};

const panel = {
  background: "white",
  borderRadius: 18,
  padding: 16,
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const panelTitle = {
  margin: "0 0 14px",
  color: "#0f172a",
  fontSize: 20,
  fontWeight: 900,
};

const rankingGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 10,
};

const rankingCard = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
};

const rankingTop = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 9,
};

const rankingMedal = {
  fontSize: 24,
};

const rankingName = {
  color: "#0f172a",
};

const rankingNumbers = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  color: "#64748b",
  fontSize: 13,
  marginBottom: 8,
};

const rankingCommission = {
  color: "#2563eb",
  fontSize: 20,
};

const chart = {
  display: "grid",
  gridTemplateColumns: "repeat(12, 1fr)",
  gap: 8,
  alignItems: "end",
  minHeight: 190,
};

const chartItem = {
  display: "grid",
  gap: 6,
  alignItems: "end",
  justifyItems: "center",
};

const barWrap = {
  height: 145,
  width: "100%",
  display: "flex",
  alignItems: "end",
  justifyContent: "center",
};

const bar = {
  width: "70%",
  background: "linear-gradient(180deg, #22c55e, #15803d)",
  borderRadius: "8px 8px 0 0",
};

const chartLabel = {
  fontSize: 11,
  color: "#64748b",
  transform: "rotate(-35deg)",
  transformOrigin: "center",
  whiteSpace: "nowrap",
};

const chartNote = {
  margin: "12px 0 0",
  color: "#64748b",
  fontSize: 12,
};

const branchGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
};

const branchCard = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
};

const branchTop = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
  color: "#0f172a",
};

const branchIcon = {
  fontSize: 24,
};

const branchData = {
  display: "grid",
  gap: 4,
  color: "#64748b",
  fontSize: 13,
  marginBottom: 8,
};

const branchCommission = {
  color: "#2563eb",
  fontSize: 18,
};

const frequencyGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
};

const frequencyCard = {
  background: "#f8fafc",
  borderRadius: 14,
  padding: 14,
  border: "1px solid #e5e7eb",
};

const frequencyValue = {
  margin: "8px 0",
  fontSize: 24,
  color: "#2563eb",
};

const alertsPanel = {
  background: "linear-gradient(135deg, #fff7ed, #fee2e2)",
  border: "1px solid #fdba74",
  borderRadius: 18,
  padding: 16,
  marginBottom: 16,
};

const alertsTitle = {
  margin: "0 0 12px",
  color: "#9a3412",
  fontSize: 20,
  fontWeight: 900,
};

const alertsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const alertCard = {
  background: "rgba(255,255,255,0.75)",
  border: "1px solid #fed7aa",
  borderRadius: 14,
  padding: 14,
};

const alertTitle = {
  margin: 0,
  color: "#9a3412",
  fontWeight: 800,
};

const alertValue = {
  display: "block",
  marginTop: 8,
  color: "#991b1b",
  fontSize: 24,
};

const alertText = {
  display: "block",
  marginTop: 6,
  color: "#64748b",
  fontSize: 13,
};

const table = {
  display: "grid",
  gap: 8,
};

const tableHeader = {
  display: "grid",
  gridTemplateColumns: "1.5fr 0.8fr 1fr 1fr",
  gap: 10,
  background: "#f1f5f9",
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 13,
  color: "#334155",
};

const tableRow = {
  display: "grid",
  gridTemplateColumns: "1.5fr 0.8fr 1fr 1fr",
  gap: 10,
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
  alignItems: "center",
  fontSize: 13,
};

const muted = {
  color: "#64748b",
};
