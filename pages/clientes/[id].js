```javascript
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "../../components/Sidebar";

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

export async function getServerSideProps({
  params,
}) {
  const { id } = params;

  const { data: client } =
    await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

  const { data: policies } =
    await supabase
      .from("policies")
      .select(`
        *,
        insurers(name)
      `)
      .eq("client_id", id)
      .order("created_at", {
        ascending: false,
      });

  const { data: claims } =
    await supabase
      .from("claims")
      .select("*")
      .eq("client_id", id)
      .order("created_at", {
        ascending: false,
      });

  return {
    props: {
      client,
      policies: policies || [],
      claims: claims || [],
    },
  };
}

function formatDate(date) {
  if (!date) return "-";

  return new Intl.DateTimeFormat(
    "pt-PT"
  ).format(new Date(date));
}

function calculateAnnualCommission(
  policy
) {
  const commission = Number(
    policy.commission_per_payment ||
      0
  );

  const frequency = String(
    policy.payment_frequency ||
      "anual"
  ).toLowerCase();

  if (frequency === "mensal") {
    return commission * 12;
  }

  if (
    frequency === "trimestral"
  ) {
    return commission * 4;
  }

  if (
    frequency === "semestral"
  ) {
    return commission * 2;
  }

  return commission;
}

function InfoItem({
  label,
  value,
}) {
  return (
    <div style={infoItem}>
      <span style={infoLabel}>
        {label}
      </span>

      <strong style={infoValue}>
        {value || "-"}
      </strong>
    </div>
  );
}

export default function ClientePage({
  client,
  policies,
  claims,
}) {
  return (
    <div style={page}>
      <Sidebar active="clientes" />

      <main style={main}>
        <div style={header}>
          <div>
            <h1 style={title}>
              {client.name}
            </h1>

            <p style={subtitle}>
              {client.nif ||
                "Sem NIF"}
            </p>
          </div>
        </div>

        <section style={clientInfoCard}>
          <div style={clientInfoGrid}>
            <InfoItem
              label="Nome"
              value={client.name}
            />

            <InfoItem
              label="NIF"
              value={client.nif}
            />

            <InfoItem
              label="Telefone"
              value={client.phone}
            />

            <InfoItem
              label="Email"
              value={client.email}
            />

            <InfoItem
              label="Morada"
              value={client.address}
            />

            <InfoItem
              label="Cidade"
              value={client.city}
            />

            <InfoItem
              label="Código Postal"
              value={client.postal_code}
            />

            <InfoItem
              label="Data nascimento"
              value={client.birth_date}
            />

            <InfoItem
              label="IBAN"
              value={client.iban}
            />

            <InfoItem
              label="Observações"
              value={client.notes}
            />
          </div>

          <div style={clientStats}>
            <div style={statBox}>
              <span style={statLabel}>
                Apólices
              </span>

              <strong style={statValue}>
                {policies.length}
              </strong>
            </div>

            <div style={statBox}>
              <span style={statLabel}>
                Sinistros
              </span>

              <strong style={statValue}>
                {claims.length}
              </strong>
            </div>

            <div style={statBox}>
              <span style={statLabel}>
                Prémio anual
              </span>

              <strong style={statValue}>
                {policies
                  .reduce(
                    (sum, p) =>
                      sum +
                      Number(
                        p.annual_premium ||
                          0
                      ),
                    0
                  )
                  .toFixed(2)} €
              </strong>
            </div>

            <div style={statBox}>
              <span style={statLabel}>
                Comissão anual
              </span>

              <strong style={statValue}>
                {policies
                  .reduce(
                    (sum, p) =>
                      sum +
                      calculateAnnualCommission(
                        p
                      ),
                    0
                  )
                  .toFixed(2)} €
              </strong>
            </div>
          </div>
        </section>

        <section style={card}>
          <h2>Apólices</h2>

          <div style={policiesGrid}>
            {policies.map((policy) => (
              <div
                key={policy.id}
                style={policyCard}
              >
                <div style={policyTop}>
                  <h3>
                    {policy.branch ||
                      "Sem ramo"}
                  </h3>

                  <span style={badge}>
                    {policy.status ||
                      "ativa"}
                  </span>
                </div>

                <p>
                  <strong>
                    Nº:
                  </strong>{" "}
                  {policy.policy_number ||
                    "-"}
                </p>

                <p>
                  <strong>
                    Matrícula:
                  </strong>{" "}
                  {policy.license_plate ||
                    "-"}
                </p>

                <p>
                  <strong>
                    Seguradora:
                  </strong>{" "}
                  {policy
                    .insurers?.name ||
                    "-"}
                </p>

                <p>
                  <strong>
                    Prémio comercial anual:
                  </strong>{" "}
                  {policy.annual_premium ||
                    0} €
                </p>

                <p>
                  <strong>
                    Comissão anual:
                  </strong>{" "}
                  {calculateAnnualCommission(
                    policy
                  )} €
                </p>

                <p>
                  <strong>
                    Renovação:
                  </strong>{" "}
                  {formatDate(
                    policy.renewal_date
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section style={card}>
          <h2>
            Sinistros associados
          </h2>

          {claims.length ===
          0 ? (
            <p>
              Sem sinistros.
            </p>
          ) : (
            <div
              style={claimsGrid}
            >
              {claims.map((claim) => (
                <Link
                  key={claim.id}
                  href={`/sinistros/${claim.id}`}
                  style={claimCard}
                >
                  <h3>
                    {claim.claim_branch ||
                      "Sem ramo"}
                  </h3>

                  <p>
                    <strong>
                      Nº:
                    </strong>{" "}
                    {claim.claim_number ||
                      "-"}
                  </p>

                  <p>
                    <strong>
                      Estado:
                    </strong>{" "}
                    {claim.status ||
                      "ABERTO"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
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

const clientInfoCard = {
  background:
    "linear-gradient(135deg, #dbeafe, #eff6ff)",
  padding: 24,
  borderRadius: 20,
  marginBottom: 24,
  boxShadow:
    "0 1px 4px rgba(0,0,0,0.08)",
};

const clientInfoGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
  marginBottom: 24,
};

const infoItem = {
  background: "white",
  padding: 14,
  borderRadius: 14,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const infoLabel = {
  color: "#6b7280",
  fontSize: 13,
};

const infoValue = {
  color: "#111827",
  fontSize: 15,
};

const clientStats = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 16,
};

const statBox = {
  background: "white",
  padding: 18,
  borderRadius: 14,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const statLabel = {
  color: "#6b7280",
  fontSize: 13,
};

const statValue = {
  fontSize: 24,
  color: "#2563eb",
};

const card = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  boxShadow:
    "0 1px 4px rgba(0,0,0,0.08)",
};

const policiesGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
};

const policyCard = {
  background: "#f9fafb",
  padding: 18,
  borderRadius: 14,
};

const policyTop = {
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

const claimsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
};

const claimCard = {
  background: "#f9fafb",
  padding: 18,
  borderRadius: 14,
  textDecoration: "none",
  color: "#111827",
};
```



