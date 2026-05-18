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

  return {
    props: {
      clients: clients || [],
      policies: policies || [],
      claims: claims || [],
    },
  };
}

function clean(value) {
  return String(value || "").toLowerCase().trim();
}

export default function Pesquisa({ clients, policies, claims }) {
  const [search, setSearch] = useState("");

  const term = clean(search);

  const clientResults = useMemo(() => {
    if (!term) return [];

    return clients.filter((client) => {
      const text = [
        client.name,
        client.nif,
        client.phone,
        client.email,
        client.address,
        client.city,
      ]
        .map(clean)
        .join(" ");

      return text.includes(term);
    });
  }, [clients, term]);

  const policyResults = useMemo(() => {
    if (!term) return [];

    return policies.filter((policy) => {
      const text = [
        policy.policy_number,
        policy.license_plate,
        policy.branch,
        policy.payment_frequency,
        policy.clients?.name,
        policy.clients?.nif,
        policy.clients?.phone,
        policy.clients?.email,
        policy.insurers?.name,
      ]
        .map(clean)
        .join(" ");

      return text.includes(term);
    });
  }, [policies, term]);

  const claimResults = useMemo(() => {
    if (!term) return [];

    return claims.filter((claim) => {
      const text = [
        claim.claim_number,
        claim.claim_branch,
        claim.insurer_name,
        claim.status,
        claim.client_name,
        claim.client_nif,
        claim.clients?.name,
        claim.clients?.nif,
      ]
        .map(clean)
        .join(" ");

      return text.includes(term);
    });
  }, [claims, term]);

  const total =
    clientResults.length + policyResults.length + claimResults.length;

  return (
    <div style={page}>
      <Sidebar active="pesquisa" />

      <main style={main}>
        <header style={header}>
          <h1 style={title}>Pesquisa Global</h1>
          <p style={subtitle}>
            Pesquisa por cliente, NIF, telefone, email, matrícula, nº apólice ou sinistro.
          </p>
        </header>

        <section style={searchBox}>
          <input
            style={input}
            placeholder="Pesquisar nome, NIF, matrícula, nº apólice, telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          <p style={muted}>Resultados encontrados: {term ? total : 0}</p>
        </section>

        {term && (
          <>
            <section style={card}>
              <h2>Clientes</h2>

              {clientResults.length === 0 ? (
                <p style={muted}>Sem clientes encontrados.</p>
              ) : (
                <div style={list}>
                  {clientResults.map((client) => (
                    <Link
                      key={client.id}
                      href={`/clientes/${client.id}`}
                      style={resultItem}
                    >
                      <strong>{client.name || "Sem nome"}</strong>
                      <span>
                        NIF: {client.nif || "-"} · Tel: {client.phone || "-"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section style={card}>
              <h2>Apólices</h2>

              {policyResults.length === 0 ? (
                <p style={muted}>Sem apólices encontradas.</p>
              ) : (
                <div style={list}>
                  {policyResults.map((policy) => (
                    <Link
                      key={policy.id}
                      href={`/clientes/${policy.clients?.id}`}
                      style={resultItem}
                    >
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
                </div>
              )}
            </section>

            <section style={card}>
              <h2>Sinistros</h2>

              {claimResults.length === 0 ? (
                <p style={muted}>Sem sinistros encontrados.</p>
              ) : (
                <div style={list}>
                  {claimResults.map((claim) => (
                    <Link
                      key={claim.id}
                      href={`/sinistros/${claim.id}`}
                      style={resultItem}
                    >
                      <strong>
                        {claim.claim_number || "Sem nº"} · {claim.status || "ABERTO"}
                      </strong>

                      <span>
                        {claim.clients?.name || claim.client_name || "-"} ·{" "}
                        {claim.claim_branch || "-"} · {claim.insurer_name || "-"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
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
};

const muted = {
  color: "#6b7280",
};
