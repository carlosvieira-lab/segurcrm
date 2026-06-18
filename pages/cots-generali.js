import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "../components/Sidebar";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-PT").format(new Date(date));
}

function daysSince(date) {
  if (!date) return "-";

  const today = new Date();
  const target = new Date(date);

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.max(
    0,
    Math.floor((today - target) / (1000 * 60 * 60 * 24))
  );
}

export async function getServerSideProps() {
  const { data: policies, error } = await supabase
    .from("policies")
    .select(`
      id,
      client_id,
      policy_number,
      branch,
      status,
      generali_cot_reference,
      generali_cot_created_at,
      generali_cot_processed_at,
      clients(id, name, nif),
      insurers(name)
    `)
    .not("generali_cot_reference", "is", null)
    .order("generali_cot_created_at", { ascending: false });

  return {
    props: {
      policies: policies || [],
      loadError: error?.message || null,
    },
  };
}

export default function CotsGenerali({ policies, loadError }) {
  const abertas = (policies || []).filter(
    (policy) =>
      policy.generali_cot_reference &&
      !policy.generali_cot_processed_at
  );

  const processadas = (policies || []).filter(
    (policy) =>
      policy.generali_cot_reference &&
      policy.generali_cot_processed_at
  );

  return (
    <div style={page}>
      <Sidebar active="cots-generali" />

      <main style={main}>
        <div style={header}>
          <div>
            <h1 style={title}>COTs Generali</h1>
            <p style={subtitle}>
              Gestão de referências COT abertas e processadas nas apólices Generali.
            </p>
          </div>

          <Link href="/" style={backButton}>
            Voltar
          </Link>
        </div>

        {loadError && (
          <div style={errorBox}>
            Erro ao carregar COTs: {loadError}
          </div>
        )}

        <section style={summaryGrid}>
          <SummaryCard title="COTs abertas" value={abertas.length} color="#f59e0b" />
          <SummaryCard title="COTs processadas" value={processadas.length} color="#16a34a" />
          <SummaryCard title="Total COTs" value={(policies || []).length} color="#2563eb" />
        </section>

        <CotTable title="🟠 COTs abertas" items={abertas} showDays />
        <CotTable title="🟢 COTs processadas" items={processadas} />
      </main>
    </div>
  );
}

function CotTable({ title, items, showDays = false }) {
  return (
    <section style={panel}>
      <h2 style={sectionTitle}>{title}</h2>

      {items.length === 0 ? (
        <p style={muted}>Sem registos.</p>
      ) : (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Cliente</th>
                <th style={th}>NIF</th>
                <th style={th}>Apólice</th>
                <th style={th}>Ramo</th>
                <th style={th}>COT</th>
                <th style={th}>Data criação</th>
                <th style={th}>
                  {showDays ? "Dias aberta" : "Data processamento"}
                </th>
                <th style={th}>Ações</th>
              </tr>
            </thead>

            <tbody>
              {items.map((policy) => (
                <tr key={policy.id}>
                  <td style={td}>{policy.clients?.name || "-"}</td>
                  <td style={td}>{policy.clients?.nif || "-"}</td>
                  <td style={td}>{policy.policy_number || "-"}</td>
                  <td style={td}>{policy.branch || "-"}</td>
                  <td style={tdStrong}>{policy.generali_cot_reference}</td>
                  <td style={td}>{formatDate(policy.generali_cot_created_at)}</td>
                  <td style={tdStrong}>
                    {showDays
                      ? daysSince(policy.generali_cot_created_at)
                      : formatDate(policy.generali_cot_processed_at)}
                  </td>
                  <td style={td}>
                    {policy.client_id ? (
                      <Link href={`/clientes/${policy.client_id}`} style={clientButton}>
                        Abrir cliente
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SummaryCard({ title, value, color }) {
  return (
    <div style={summaryCard}>
      <span style={summaryLabel}>{title}</span>
      <strong style={{ ...summaryValue, color }}>{value}</strong>
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
  alignItems: "flex-start",
  gap: 20,
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

const backButton = {
  background: "#111827",
  color: "white",
  padding: "12px 16px",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: "bold",
};

const errorBox = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: 14,
  padding: 14,
  marginBottom: 20,
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
  marginBottom: 24,
};

const summaryCard = {
  background: "white",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  display: "grid",
  gap: 8,
};

const summaryLabel = {
  color: "#6b7280",
};

const summaryValue = {
  fontSize: 30,
};

const panel = {
  background: "white",
  borderRadius: 18,
  padding: 24,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const sectionTitle = {
  marginTop: 0,
};

const muted = {
  color: "#6b7280",
};

const tableWrap = {
  overflowX: "auto",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 950,
};

const th = {
  textAlign: "left",
  padding: 10,
  borderBottom: "2px solid #e5e7eb",
  background: "#f9fafb",
  color: "#374151",
};

const td = {
  padding: 10,
  borderBottom: "1px solid #e5e7eb",
  color: "#111827",
};

const tdStrong = {
  padding: 10,
  borderBottom: "1px solid #e5e7eb",
  color: "#111827",
  fontWeight: "bold",
};

const clientButton = {
  background: "#2563eb",
  color: "white",
  padding: "8px 10px",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: "bold",
  display: "inline-block",
};
