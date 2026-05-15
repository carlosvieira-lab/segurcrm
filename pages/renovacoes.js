import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

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
    .eq("status", "ativa");

  return {
    props: {
      policies: policies || [],
    },
  };
}

function calcularDias(data) {
  if (!data) return null;

  const hoje = new Date();
  const renovacao = new Date(data);

  const diff = renovacao - hoje;

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function calcularProximaCobranca(policy) {
  if (!policy.renewal_date) return "-";

  const data = new Date(policy.renewal_date);

  const freq = policy.payment_frequency || "anual";

  if (freq === "mensal") {
    data.setMonth(data.getMonth() + 1);
  }

  if (freq === "trimestral") {
    data.setMonth(data.getMonth() + 3);
  }

  if (freq === "semestral") {
    data.setMonth(data.getMonth() + 6);
  }

  if (freq === "anual") {
    data.setFullYear(data.getFullYear() + 1);
  }

  return data.toISOString().split("T")[0];
}

export default function RenovacoesPage({ policies }) {
  return (
    <div style={layout}>
      <aside style={sidebar}>
        <h1 style={logo}>SegurCRM</h1>

        <nav style={nav}>
          <Link href="/" style={navItem}>
            Dashboard
          </Link>

          <Link href="/clientes" style={navItem}>
            Clientes
          </Link>

          <Link href="/apolices" style={navItem}>
            Apólices
          </Link>

          <Link href="/renovacoes" style={activeNav}>
            Renovações
          </Link>

          <Link href="/financeiro" style={navItem}>
            Financeiro
          </Link>
        </nav>
      </aside>

      <main style={main}>
        <h1 style={title}>Renovações Inteligentes</h1>

        <div style={grid}>
          {policies.map((policy) => {
            const dias = calcularDias(policy.renewal_date);

            let cor = "#22c55e";

            if (dias <= 30) cor = "#f59e0b";
            if (dias <= 15) cor = "#ef4444";
            if (dias < 0) cor = "#991b1b";

            return (
              <div key={policy.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <h2>{policy.branch}</h2>

                  <span
                    style={{
                      background: cor,
                      color: "white",
                      padding: "6px 10px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {dias < 0
                      ? "Vencida"
                      : `${dias} dias`}
                  </span>
                </div>

                <p>
                  <strong>Cliente:</strong>{" "}
                  {policy.clients?.name || "-"}
                </p>

                <p>
                  <strong>Seguradora:</strong>{" "}
                  {policy.insurers?.name || "-"}
                </p>

                <p>
                  <strong>Apólice:</strong>{" "}
                  {policy.policy_number}
                </p>

                <p>
                  <strong>Prémio:</strong>{" "}
                  {policy.annual_premium || 0} €
                </p>

                <p>
                  <strong>Fracionamento:</strong>{" "}
                  {policy.payment_frequency}
                </p>

                <p>
                  <strong>Renovação:</strong>{" "}
                  {policy.renewal_date}
                </p>

                <p>
                  <strong>Próxima cobrança:</strong>{" "}
                  {calcularProximaCobranca(policy)}
                </p>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

const layout = {
  display: "flex",
  minHeight: "100vh",
  background: "#f3f4f6",
};

const sidebar = {
  width: 260,
  background: "#0f172a",
  color: "white",
  padding: 32,
};

const logo = {
  fontSize: 36,
  fontWeight: 700,
  marginBottom: 40,
};

const nav = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const navItem = {
  color: "white",
  textDecoration: "none",
  padding: 14,
  borderRadius: 10,
};

const activeNav = {
  ...navItem,
  background: "#2563eb",
};

const main = {
  flex: 1,
  padding: 40,
};

const title = {
  fontSize: 42,
  marginBottom: 30,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: 20,
};

const card = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};
