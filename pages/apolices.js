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
    `)
    .order("created_at", { ascending: false });

  return {
    props: {
      policies: policies || [],
    },
  };
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("pt-PT");
}

function formatEuro(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

export default function Apolices({ policies }) {
  const activePolicies = policies.filter((p) => p.status === "ativa");
  const cancelledPolicies = policies.filter((p) => p.status === "anulada");

  return (
    <div style={page}>
      <Sidebar active="apolices" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Apólices</h1>
            <p style={subtitle}>Visão geral das apólices da carteira.</p>
          </div>
        </header>

        <section style={stats}>
          <StatCard title="Total" value={policies.length} />
          <StatCard title="Ativas" value={activePolicies.length} color="#16a34a" />
          <StatCard title="Anuladas" value={cancelledPolicies.length} color="#dc2626" />
        </section>

        <section style={panel}>
          <h2>Lista de apólices</h2>

          {policies.length === 0 ? (
            <p style={muted}>Ainda não existem apólices.</p>
          ) : (
            <div style={list}>
              {policies.map((policy) => (
                <div key={policy.id} style={policyCard}>
                  <div>
                    <h3 style={policyTitle}>
                      {policy.branch || "Sem ramo"}
                    </h3>

                    <p style={smallText}>
                      Cliente: {policy.clients?.name || "-"}
                    </p>

                    <p style={smallText}>
                      Seguradora: {policy.insurers?.name || "-"}
                    </p>

                    <p style={smallText}>
                      Apólice: {policy.policy_number || "-"}
                    </p>

                    <p style={smallText}>
                      Prémio: {formatEuro(policy.annual_premium)}
                    </p>

                    <p style={smallText}>
                      Fracionamento: {policy.payment_frequency || "anual"}
                    </p>

                    <p style={smallText}>
                      Renovação: {formatDate(policy.renewal_date)}
                    </p>

                    <p style={smallText}>
                      Próxima cobrança: {formatDate(policy.next_payment_date)}
                    </p>
                  </div>

                  <span
                    style={{
                      ...statusBadge,
                      background:
                        policy.status === "anulada" ? "#fee2e2" : "#dcfce7",
                      color:
                        policy.status === "anulada" ? "#991b1b" : "#166534",
                    }}
                  >
                    {policy.status || "ativa"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ title, value, color = "#111827" }) {
  return (
    <div style={statCard}>
      <p style={cardLabel}>{title}</p>
      <h2 style={{ ...cardValue, color }}>{value}</h2>
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

const stats = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 16,
  marginBottom: 30,
};

const statCard = {
  background: "white",
  padding: 22,
  borderRadius: 16,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const cardLabel = {
  color: "#6b7280",
  margin: 0,
};

const cardValue = {
  fontSize: 30,
  margin: "10px 0 0",
};

const panel = {
  background: "white",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const muted = {
  color: "#6b7280",
};

const list = {
  display: "grid",
  gap: 14,
};

const policyCard = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
};

const policyTitle = {
  margin: 0,
  fontSize: 20,
};

const smallText = {
  color: "#6b7280",
  margin: "6px 0",
};

const statusBadge = {
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
};
