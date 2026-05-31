import Link from "next/link";
import { useMemo, useState } from "react";
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
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: policies } = await supabase
    .from("policies")
    .select(`
      *,
      clients(id, name, nif, phone, email),
      insurers(name)
    `)
    .order("created_at", { ascending: false });

  const { data: claims } = await supabase
    .from("claims")
    .select(`
      *,
      clients(id, name, nif)
    `)
    .order("created_at", { ascending: false });

  const { data: tasks } = await supabase
    .from("tasks")
    .select(`
      *,
      clients(id, name, nif, phone),
      policies(id, policy_number, branch, license_plate)
    `)
    .order("created_at", { ascending: false });

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select(`
      *,
      clients(id, name, nif, phone)
    `)
    .order("created_at", { ascending: false });

  return {
    props: {
      clients: clients || [],
      policies: policies || [],
      claims: claims || [],
      tasks: tasks || [],
      opportunities: opportunities || [],
    },
  };
}

function clean(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function onlyNumbers(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-PT").format(new Date(date));
}

function textMatches(textValues, term, numbersTerm) {
  const text = textValues.map(clean).join(" ");

  const numbers = textValues
    .map((value) => onlyNumbers(value))
    .filter(Boolean)
    .join(" ");

  return (
    text.includes(term) ||
    (numbersTerm && numbers.includes(numbersTerm))
  );
}

export default function Pesquisa({
  clients,
  policies,
  claims,
  tasks,
  opportunities,
}) {
  const [search, setSearch] = useState("");

  const term = clean(search);
  const numbersTerm = onlyNumbers(search);

  const clientResults = useMemo(() => {
    if (!term) return [];

    return clients.filter((client) =>
      textMatches(
        [
          client.name,
          client.nif,
          client.phone,
          client.email,
          client.address,
          client.city,
          client.postal_code,
          client.notes,
          client.interactions,
        ],
        term,
        numbersTerm
      )
    );
  }, [clients, term, numbersTerm]);

  const policyResults = useMemo(() => {
    if (!term) return [];

    return policies.filter((policy) =>
      textMatches(
        [
          policy.policy_number,
          policy.license_plate,
          policy.branch,
          policy.status,
          policy.payment_frequency,
          policy.clients?.name,
          policy.clients?.nif,
          policy.clients?.phone,
          policy.clients?.email,
          policy.insurers?.name,
        ],
        term,
        numbersTerm
      )
    );
  }, [policies, term, numbersTerm]);

  const taskResults = useMemo(() => {
    if (!term) return [];

    return tasks.filter((task) =>
      textMatches(
        [
          task.title,
          task.description,
          task.category,
          task.priority,
          task.status,
          task.origin,
          task.clients?.name,
          task.clients?.nif,
          task.clients?.phone,
          task.policies?.policy_number,
          task.policies?.branch,
          task.policies?.license_plate,
        ],
        term,
        numbersTerm
      )
    );
  }, [tasks, term, numbersTerm]);

  const opportunityResults = useMemo(() => {
    if (!term) return [];

    return opportunities.filter((opportunity) =>
      textMatches(
        [
          opportunity.name,
          opportunity.client_nif,
          opportunity.client_phone,
          opportunity.insurance_type,
          opportunity.status,
          opportunity.procedure_notes,
          opportunity.renewal_date,
          opportunity.contact_date,
          opportunity.clients?.name,
          opportunity.clients?.nif,
          opportunity.clients?.phone,
        ],
        term,
        numbersTerm
      )
    );
  }, [opportunities, term, numbersTerm]);

  const claimResults = useMemo(() => {
    if (!term) return [];

    return claims.filter((claim) =>
      textMatches(
        [
          claim.claim_number,
          claim.claim_branch,
          claim.insurer_name,
          claim.status,
          claim.client_name,
          claim.client_nif,
          claim.description,
          claim.clients?.name,
          claim.clients?.nif,
        ],
        term,
        numbersTerm
      )
    );
  }, [claims, term, numbersTerm]);

  const bestResults = [
    ...clientResults.slice(0, 3).map((client) => ({
      type: "CLIENTE",
      title: client.name || "Sem nome",
      subtitle: `NIF: ${client.nif || "-"} · Tel: ${client.phone || "-"}`,
      href: `/clientes/${client.id}`,
      color: "#2563eb",
    })),
    ...policyResults.slice(0, 3).map((policy) => ({
      type: "APÓLICE",
      title: `${policy.policy_number || "Sem nº"} · ${policy.license_plate || "Sem matrícula"}`,
      subtitle: `${policy.clients?.name || "-"} · ${policy.branch || "-"} · ${policy.insurers?.name || "-"}`,
      href: policy.clients?.id ? `/clientes/${policy.clients.id}` : "/apolices",
      color: "#0f766e",
    })),
    ...taskResults.slice(0, 3).map((task) => ({
      type: "TAREFA",
      title: task.title || "Sem título",
      subtitle: `${task.clients?.name || "Tarefa geral"} · ${task.status || "aberta"} · ${formatDate(task.due_date)}`,
      href: task.client_id ? `/clientes/${task.client_id}` : "/tarefas",
      color: "#7c3aed",
    })),
    ...opportunityResults.slice(0, 3).map((opportunity) => ({
      type: "OPORTUNIDADE",
      title: opportunity.insurance_type || opportunity.name || "Sem descrição",
      subtitle: `${opportunity.name || opportunity.clients?.name || "-"} · ${opportunity.status || "por contactar"} · ${formatDate(opportunity.contact_date)}`,
      href: opportunity.client_id ? `/clientes/${opportunity.client_id}` : "/oportunidades",
      color: "#16a34a",
    })),
    ...claimResults.slice(0, 3).map((claim) => ({
      type: "SINISTRO",
      title: `${claim.claim_number || "Sem nº"} · ${claim.status || "ABERTO"}`,
      subtitle: `${claim.clients?.name || claim.client_name || "-"} · ${claim.claim_branch || "-"} · ${claim.insurer_name || "-"}`,
      href: `/sinistros/${claim.id}`,
      color: "#dc2626",
    })),
  ].slice(0, 10);

  const total =
    clientResults.length +
    policyResults.length +
    taskResults.length +
    opportunityResults.length +
    claimResults.length;

  return (
    <div style={page}>
      <Sidebar active="pesquisa" />

      <main style={main}>
        <header style={header}>
          <h1 style={title}>Pesquisa Global</h1>
          <p style={subtitle}>
            Pesquisa por cliente, NIF, telefone, email, matrícula, nº apólice, tarefa, oportunidade ou sinistro.
          </p>
        </header>

        <section style={searchBox}>
          <input
            style={input}
            placeholder="Pesquisar nome, NIF, matrícula, nº apólice, telefone, tarefa, oportunidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          <p style={muted}>Resultados encontrados: {term ? total : 0}</p>
        </section>

        {term && (
          <>
            <section style={highlightCard}>
              <h2>Melhores resultados</h2>

              {bestResults.length === 0 ? (
                <p style={muted}>Sem resultados encontrados.</p>
              ) : (
                <div style={list}>
                  {bestResults.map((item, index) => (
                    <Link
                      key={`${item.type}-${index}`}
                      href={item.href}
                      style={resultItem}
                    >
                      <span
                        style={{
                          ...typeBadge,
                          background: item.color,
                        }}
                      >
                        {item.type}
                      </span>

                      <strong>{item.title}</strong>
                      <span>{item.subtitle}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <ResultSection title="Clientes" emptyText="Sem clientes encontrados.">
              {clientResults.map((client) => (
                <Link
                  key={client.id}
                  href={`/clientes/${client.id}`}
                  style={resultItem}
                >
                  <span style={{ ...typeBadge, background: "#2563eb" }}>CLIENTE</span>
                  <strong>{client.name || "Sem nome"}</strong>
                  <span>
                    NIF: {client.nif || "-"} · Tel: {client.phone || "-"} · Email: {client.email || "-"}
                  </span>
                </Link>
              ))}
            </ResultSection>

            <ResultSection title="Apólices" emptyText="Sem apólices encontradas.">
              {policyResults.map((policy) => (
                <Link
                  key={policy.id}
                  href={policy.clients?.id ? `/clientes/${policy.clients.id}` : "/apolices"}
                  style={resultItem}
                >
                  <span style={{ ...typeBadge, background: "#0f766e" }}>APÓLICE</span>

                  <strong>
                    {policy.policy_number || "Sem nº"} ·{" "}
                    {policy.license_plate || "Sem matrícula"}
                  </strong>

                  <span>
                    {policy.clients?.name || "-"} · {policy.branch || "-"} ·{" "}
                    {policy.insurers?.name || "-"}
                  </span>
                </Link>
              ))}
            </ResultSection>

            <ResultSection title="Tarefas" emptyText="Sem tarefas encontradas.">
              {taskResults.map((task) => (
                <Link
                  key={task.id}
                  href={task.client_id ? `/clientes/${task.client_id}` : "/tarefas"}
                  style={resultItem}
                >
                  <span style={{ ...typeBadge, background: "#7c3aed" }}>TAREFA</span>

                  <strong>
                    {task.title || "Sem título"} · {task.status || "aberta"}
                  </strong>

                  <span>
                    {task.clients?.name || "Tarefa geral"} · {task.category || "-"} ·{" "}
                    {formatDate(task.due_date)}
                  </span>
                </Link>
              ))}
            </ResultSection>

            <ResultSection title="Oportunidades" emptyText="Sem oportunidades encontradas.">
              {opportunityResults.map((opportunity) => (
                <Link
                  key={opportunity.id}
                  href={opportunity.client_id ? `/clientes/${opportunity.client_id}` : "/oportunidades"}
                  style={resultItem}
                >
                  <span style={{ ...typeBadge, background: "#16a34a" }}>OPORTUNIDADE</span>

                  <strong>
                    {opportunity.insurance_type || "Sem descrição"}
                  </strong>

                  <span>
                    {opportunity.name || opportunity.clients?.name || "-"} ·{" "}
                    {opportunity.status || "por contactar"} · Contactar:{" "}
                    {formatDate(opportunity.contact_date)}
                  </span>
                </Link>
              ))}
            </ResultSection>

            <ResultSection title="Sinistros" emptyText="Sem sinistros encontrados.">
              {claimResults.map((claim) => (
                <Link
                  key={claim.id}
                  href={`/sinistros/${claim.id}`}
                  style={resultItem}
                >
                  <span style={{ ...typeBadge, background: "#dc2626" }}>SINISTRO</span>

                  <strong>
                    {claim.claim_number || "Sem nº"} · {claim.status || "ABERTO"}
                  </strong>

                  <span>
                    {claim.clients?.name || claim.client_name || "-"} ·{" "}
                    {claim.claim_branch || "-"} · {claim.insurer_name || "-"}
                  </span>
                </Link>
              ))}
            </ResultSection>
          </>
        )}
      </main>
    </div>
  );
}

function ResultSection({ title, emptyText, children }) {
  const childrenArray = Array.isArray(children) ? children : [children];
  const hasResults = childrenArray.filter(Boolean).length > 0;

  return (
    <section style={card}>
      <h2>{title}</h2>

      {!hasResults ? (
        <p style={muted}>{emptyText}</p>
      ) : (
        <div style={list}>{children}</div>
      )}
    </section>
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

const searchBox = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const input = {
  width: "100%",
  padding: 16,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 18,
  boxSizing: "border-box",
};

const highlightCard = {
  background: "linear-gradient(135deg, #eff6ff, #f8fafc)",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  border: "1px solid #bfdbfe",
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const card = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const list = {
  display: "grid",
  gap: 12,
};

const resultItem = {
  background: "#f9fafb",
  padding: 16,
  borderRadius: 12,
  textDecoration: "none",
  color: "#111827",
  display: "grid",
  gap: 6,
  border: "1px solid #e5e7eb",
};

const typeBadge = {
  color: "white",
  padding: "5px 9px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: "bold",
  width: "fit-content",
};

const muted = {
  color: "#6b7280",
};
