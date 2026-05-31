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
  const [deletingId, setDeletingId] = useState(null);

  const existingClientByNif = useMemo(() => {
    const cleanNif = String(nif || "").trim();

    if (!cleanNif) return null;

    return clients.find(
      (client) =>
        String(client.nif || "").trim() === cleanNif
    );
  }, [nif, clients]);


  const visibleClients = clients.filter((client) => client.status !== "anulado");

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

    if (nif && existingClientByNif) {
      alert(
        `Já existe um cliente com este NIF:\n\n${existingClientByNif.name}`
      );

      setSaving(false);
      return;
    }

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

  async function deleteClient(client) {
    const firstConfirm = window.confirm(
      `Queres eliminar definitivamente o cliente "${client.name || "Sem nome"}"?\n\nEsta ação remove o cliente da base de dados.`
    );

    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      "Confirma novamente: esta ação é definitiva e não pode ser anulada."
    );

    if (!secondConfirm) return;

    setDeletingId(client.id);

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", client.id);

    if (error) {
      alert(
        "Não foi possível eliminar este cliente.\n\n" +
          "Pode ter apólices, tarefas, oportunidades ou outros registos associados.\n\n" +
          "Erro: " +
          error.message
      );

      setDeletingId(null);
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
          <StatCard title="Total de clientes" value={visibleClients.length} />

          <StatCard
            title="Ativos"
            value={visibleClients.filter((c) => c.status === "ativo").length}
          />

          <StatCard
            title="Potenciais"
            value={visibleClients.filter((c) => c.status === "potencial").length}
          />
        </section>

        <section style={searchPanel}>
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

              {existingClientByNif && (
                <div
                  style={duplicateWarning}
                >
                  <strong>Cliente já existente</strong>

                  <div style={{ marginTop: 6 }}>
                    {existingClientByNif.name}
                  </div>

                  <Link
                    href={`/clientes/${existingClientByNif.id}`}
                    style={duplicateLink}
                  >
                    Abrir ficha
                  </Link>
                </div>
              )}

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

            {filteredClients.length === 0 ? (
              <p style={muted}>Nenhum cliente encontrado.</p>
            ) : (
              <div style={list}>
                {filteredClients.map((client) => (
                  <div key={client.id} style={clientCard}>
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
                      <span style={statusBadge}>
                        {client.status || "ativo"}
                      </span>

                      <Link href={`/clientes/${client.id}`} style={openButton}>
                        Abrir ficha
                      </Link>

                      <button
                        type="button"
                        style={deleteButton}
                        onClick={() => deleteClient(client)}
                        disabled={deletingId === client.id}
                      >
                        {deletingId === client.id
                          ? "A eliminar..."
                          : "Eliminar por erro"}
                      </button>
                    </div>
                  </div>
                ))}
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
  gridTemplateColumns: "repeat(3, 1fr)",
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

const muted = {
  color: "#6b7280",
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


const duplicateWarning = {
  background: "#fee2e2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  padding: 12,
  borderRadius: 10,
};

const duplicateLink = {
  display: "inline-block",
  marginTop: 8,
  color: "#2563eb",
  fontWeight: "bold",
  textDecoration: "none",
};

const deleteButton = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: "bold",
  cursor: "pointer",
};

