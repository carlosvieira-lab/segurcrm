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

  return {
    props: {
      clients: clients || [],
    },
  };
}

function cleanText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default function Clientes({ clients }) {
  const [search, setSearch] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);

  const [name, setName] = useState("");
  const [nif, setNif] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [iban, setIban] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [licenseDate, setLicenseDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const activeClients = clients.filter((client) => client.status !== "anulado");
  const cancelledClients = clients.filter((client) => client.status === "anulado");

  const visibleClients = showCancelled ? clients : activeClients;

  const filteredClients = useMemo(() => {
    const term = cleanText(search);

    if (!term) return visibleClients;

    return visibleClients.filter((client) => {
      const searchable = cleanText([
        client.name,
        client.nif,
        client.phone,
        client.email,
        client.city,
        client.status,
      ]
        .filter(Boolean)
        .join(" "));

      return searchable.includes(term);
    });
  }, [visibleClients, search]);

  async function createClientRecord(e) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("clients").insert({
      type: "particular",
      status: "ativo",
      name,
      nif,
      phone,
      email,
      address,
      city,
      iban,
      birth_date: birthDate || null,
      driving_license_start_date: licenseDate || null,
    });

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    window.location.reload();
  }

  async function cancelClient(client) {
    const confirmed = window.confirm(
      `Tens a certeza que queres anular o cliente "${client.name || "Sem nome"}" por erro?\n\nO cliente não será apagado da base de dados, apenas ficará com estado "anulado".`
    );

    if (!confirmed) return;

    setUpdatingId(client.id);

    const { error } = await supabase
      .from("clients")
      .update({
        status: "anulado",
      })
      .eq("id", client.id);

    if (error) {
      alert(error.message);
      setUpdatingId(null);
      return;
    }

    window.location.reload();
  }

  async function reactivateClient(client) {
    const confirmed = window.confirm(
      `Queres reativar o cliente "${client.name || "Sem nome"}"?`
    );

    if (!confirmed) return;

    setUpdatingId(client.id);

    const { error } = await supabase
      .from("clients")
      .update({
        status: "ativo",
      })
      .eq("id", client.id);

    if (error) {
      alert(error.message);
      setUpdatingId(null);
      return;
    }

    window.location.reload();
  }

  return (
    <div style={page}>
      <Sidebar active="clientes" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Clientes</h1>
            <p style={subtitle}>
              Pesquisa por nome, NIF, telefone ou email e abre a ficha 360º.
            </p>
          </div>
        </header>

        <section style={stats}>
          <StatCard title="Total de clientes" value={clients.length} />

          <StatCard
            title="Ativos"
            value={activeClients.filter((c) => c.status === "ativo").length}
          />

          <StatCard
            title="Potenciais"
            value={activeClients.filter((c) => c.status === "potencial").length}
          />

          <StatCard
            title="Anulados"
            value={cancelledClients.length}
          />
        </section>

        <section style={searchPanel}>
          <div style={searchHeader}>
            <div>
              <label style={label}>Pesquisar cliente</label>

              <input
                placeholder="Escreve nome, apelido, NIF, telefone ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={searchInput}
              />

              <p style={smallText}>
                Resultados encontrados: {filteredClients.length}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCancelled(!showCancelled)}
              style={showCancelled ? secondaryButtonActive : secondaryButton}
            >
              {showCancelled ? "Ocultar anulados" : "Mostrar anulados"}
            </button>
          </div>
        </section>

        <section style={grid}>
          <div style={panel}>
            <h2>Novo Cliente</h2>

            <form onSubmit={createClientRecord} style={form}>
              <input
                placeholder="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={input}
              />

              <input
                placeholder="NIF"
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                style={input}
              />

              <input
                placeholder="Telefone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={input}
              />

              <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={input}
              />

              <input
                placeholder="Morada"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={input}
              />

              <input
                placeholder="Cidade"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={input}
              />

              <input
                placeholder="IBAN"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                style={input}
              />

              <label style={label}>Data de nascimento</label>

              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                style={input}
              />

              <label style={label}>Início da carta de condução</label>

              <input
                type="date"
                value={licenseDate}
                onChange={(e) => setLicenseDate(e.target.value)}
                style={input}
              />

              <button style={button} disabled={saving}>
                {saving ? "A guardar..." : "Guardar cliente"}
              </button>
            </form>
          </div>

          <div style={panel}>
            <h2>Lista de clientes</h2>

            {!showCancelled && cancelledClients.length > 0 && (
              <p style={warningText}>
                Existem {cancelledClients.length} cliente(s) anulado(s). Usa “Mostrar anulados” para os consultar.
              </p>
            )}

            {filteredClients.length === 0 ? (
              <p style={muted}>Nenhum cliente encontrado.</p>
            ) : (
              <div style={list}>
                {filteredClients.map((client) => {
                  const isCancelled = client.status === "anulado";

                  return (
                    <div
                      key={client.id}
                      style={{
                        ...clientCard,
                        ...(isCancelled ? cancelledClientCard : {}),
                      }}
                    >
                      <div>
                        <Link href={`/clientes/${client.id}`} style={clientName}>
                          {client.name || "Sem nome"}
                        </Link>

                        <p style={smallText}>
                          NIF: {client.nif || "-"} · Tel:{" "}
                          {client.phone || "-"} · Email: {client.email || "-"}
                        </p>

                        <p style={smallText}>
                          {client.city || "Sem cidade"}
                        </p>
                      </div>

                      <div style={rightSide}>
                        <span style={isCancelled ? cancelledStatusBadge : statusBadge}>
                          {client.status || "ativo"}
                        </span>

                        <Link href={`/clientes/${client.id}`} style={openButton}>
                          Abrir ficha
                        </Link>

                        {isCancelled ? (
                          <button
                            type="button"
                            style={reactivateButton}
                            onClick={() => reactivateClient(client)}
                            disabled={updatingId === client.id}
                          >
                            {updatingId === client.id ? "A reativar..." : "Reativar"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            style={cancelButton}
                            onClick={() => cancelClient(client)}
                            disabled={updatingId === client.id}
                          >
                            {updatingId === client.id ? "A anular..." : "Anular por erro"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div style={statCard}>
      <p style={cardLabel}>{title}</p>
      <h2 style={cardValue}>{value}</h2>
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
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 16,
  marginBottom: 24,
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

const searchPanel = {
  background: "white",
  borderRadius: 16,
  padding: 24,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const searchHeader = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 16,
  alignItems: "end",
};

const searchInput = {
  width: "100%",
  padding: 16,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 16,
  marginTop: 8,
  boxSizing: "border-box",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "420px 1fr",
  gap: 24,
};

const panel = {
  background: "white",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const form = {
  display: "grid",
  gap: 12,
};

const label = {
  fontSize: 13,
  color: "#6b7280",
};

const input = {
  padding: 13,
  borderRadius: 10,
  border: "1px solid #d1d5db",
};

const button = {
  padding: 14,
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const secondaryButton = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "none",
  background: "#111827",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const secondaryButtonActive = {
  ...secondaryButton,
  background: "#6b7280",
};

const muted = {
  color: "#6b7280",
};

const warningText = {
  color: "#92400e",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  padding: 12,
  borderRadius: 10,
};

const list = {
  display: "grid",
  gap: 14,
};

const clientCard = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
};

const cancelledClientCard = {
  opacity: 0.72,
  background: "#f9fafb",
};

const clientName = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: 18,
};

const smallText = {
  color: "#6b7280",
  margin: "6px 0",
};

const statusBadge = {
  background: "#dcfce7",
  color: "#166534",
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
  textAlign: "center",
};

const cancelledStatusBadge = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
  textAlign: "center",
};

const rightSide = {
  display: "grid",
  gap: 8,
  justifyItems: "end",
};

const openButton = {
  background: "#111827",
  color: "white",
  padding: "8px 12px",
  borderRadius: 8,
  textDecoration: "none",
  fontSize: 13,
  fontWeight: "bold",
};

const cancelButton = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: "bold",
  cursor: "pointer",
};

const reactivateButton = {
  background: "#16a34a",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: "bold",
  cursor: "pointer",
};

