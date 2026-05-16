import Link from "next/link";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function getServerSideProps() {
  const { data: tasks } = await supabase
    .from("tasks")
    .select(`
      *,
      clients(name)
    `)
    .order("created_at", { ascending: false });

  return {
    props: {
      tasks: tasks || [],
    },
  };
}

function formatDate(date) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

function formatNow() {
  const now = new Date();

  return (
    now.toLocaleDateString("pt-PT") +
    " " +
    now.toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

export default function Tarefas({ tasks }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("comercial");
  const [priority, setPriority] = useState("NORMAL");
  const [description, setDescription] = useState("");
  const [prospectName, setProspectName] = useState("");
  const [prospectPhone, setProspectPhone] = useState("");
  const [procedureNotes, setProcedureNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function createTask(e) {
    e.preventDefault();
    setSaving(true);

    const initialProcedure = procedureNotes
      ? `${formatNow()} - ${procedureNotes}`
      : "";

    const { error } = await supabase.from("tasks").insert({
      title,
      category,
      priority,
      status: "aberta",
      description,
      prospect_name: prospectName,
      prospect_phone: prospectPhone,
      procedure_notes: initialProcedure,
    });

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    window.location.reload();
  }

  async function updateStatus(id, status) {
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "concluida") {
      updateData.closed_at = new Date().toISOString();
    }

    await supabase.from("tasks").update(updateData).eq("id", id);

    window.location.reload();
  }

  async function addProcedure(task) {
    const note = prompt("Novo procedimento adotado");

    if (!note) return;

    const previous = task.procedure_notes || "";

    const updatedNotes = previous
      ? `${previous}\n\n${formatNow()} - ${note}`
      : `${formatNow()} - ${note}`;

    const { error } = await supabase
      .from("tasks")
      .update({
        procedure_notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  function priorityStyle(priority) {
    if (priority === "MUITO URGENTE") {
      return {
        background: "#fee2e2",
        color: "#991b1b",
      };
    }

    if (priority === "URGENTE") {
      return {
        background: "#fef3c7",
        color: "#92400e",
      };
    }

    return {
      background: "#e5e7eb",
      color: "#374151",
    };
  }

  function statusStyle(status) {
    if (status === "em tratamento") {
      return {
        background: "#dbeafe",
        color: "#1d4ed8",
      };
    }

    if (status === "concluida") {
      return {
        background: "#dcfce7",
        color: "#166534",
      };
    }

    return {
      background: "#f3f4f6",
      color: "#374151",
    };
  }

  const abertas = tasks.filter((t) => t.status !== "concluida");
  const concluidas = tasks.filter((t) => t.status === "concluida");

  return (
    <div style={page}>
      <aside style={sidebar}>
        <h2 style={logo}>SegurCRM</h2>

        <nav style={nav}>
          <Link href="/" style={link}>Dashboard</Link>
          <Link href="/clientes" style={link}>Clientes</Link>
          <Link href="/apolices" style={link}>Apólices</Link>
          <Link href="/renovacoes" style={link}>Renovações</Link>
          <Link href="/financeiro" style={link}>Financeiro</Link>
          <Link href="/tarefas" style={activeLink}>Tarefas</Link>
        </nav>
      </aside>

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={titlePage}>Tarefas Operacionais</h1>
            <p style={subtitle}>
              Gestão comercial e administrativa com histórico de procedimentos.
            </p>
          </div>
        </header>

        <section style={stats}>
          <StatCard title="Abertas" value={abertas.length} />
          <StatCard title="Concluídas" value={concluidas.length} />
          <StatCard
            title="Muito urgentes"
            value={abertas.filter((t) => t.priority === "MUITO URGENTE").length}
          />
        </section>

        <section style={grid}>
          <div style={panel}>
            <h2>Nova tarefa</h2>

            <form onSubmit={createTask} style={form}>
              <input
                style={input}
                placeholder="Título"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <select
                style={input}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="comercial">Comercial</option>
                <option value="administrativa">Administrativa</option>
              </select>

              <select
                style={input}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option>NORMAL</option>
                <option>URGENTE</option>
                <option>MUITO URGENTE</option>
              </select>

              <input
                style={input}
                placeholder="Nome do prospect / cliente"
                value={prospectName}
                onChange={(e) => setProspectName(e.target.value)}
              />

              <input
                style={input}
                placeholder="Telefone"
                value={prospectPhone}
                onChange={(e) => setProspectPhone(e.target.value)}
              />

              <textarea
                style={textarea}
                placeholder="Descrição da tarefa"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <textarea
                style={textarea}
                placeholder="Procedimento inicial"
                value={procedureNotes}
                onChange={(e) => setProcedureNotes(e.target.value)}
              />

              <button style={button} disabled={saving}>
                {saving ? "A guardar..." : "Criar tarefa"}
              </button>
            </form>
          </div>

          <div style={panel}>
            <h2>Tarefas abertas</h2>

            {abertas.length === 0 ? (
              <p style={muted}>Sem tarefas abertas.</p>
            ) : (
              <div style={list}>
                {abertas.map((task) => (
                  <div key={task.id} style={taskCard}>
                    <div style={taskTop}>
                      <div>
                        <h3 style={{ margin: 0 }}>{task.title}</h3>
                        <p style={smallText}>{task.category}</p>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <span
                          style={{
                            ...priorityBadge,
                            ...priorityStyle(task.priority),
                          }}
                        >
                          {task.priority}
                        </span>

                        <span
                          style={{
                            ...priorityBadge,
                            ...statusStyle(task.status),
                          }}
                        >
                          {task.status || "aberta"}
                        </span>
                      </div>
                    </div>

                    <p>
                      <strong>Cliente/Prospect:</strong>{" "}
                      {task.clients?.name || task.prospect_name || "-"}
                    </p>

                    <p>
                      <strong>Telefone:</strong> {task.prospect_phone || "-"}
                    </p>

                    <p>
                      <strong>Descrição:</strong> {task.description || "-"}
                    </p>

                    <div style={procedureBox}>
                      <strong>Procedimento adotado</strong>

                      <pre style={procedureText}>
                        {task.procedure_notes || "-"}
                      </pre>
                    </div>

                    <p>
                      <strong>Entrada:</strong> {formatDate(task.created_at)}
                    </p>

                    <p>
                      <strong>Última atualização:</strong>{" "}
                      {formatDate(task.updated_at)}
                    </p>

                    <div style={buttons}>
                      <button
                        style={{ ...smallButton, background: "#2563eb" }}
                        onClick={() => updateStatus(task.id, "em tratamento")}
                      >
                        Em tratamento
                      </button>

                      <button
                        style={{ ...smallButton, background: "#7c3aed" }}
                        onClick={() => addProcedure(task)}
                      >
                        Adicionar procedimento
                      </button>

                      <button
                        style={{ ...smallButton, background: "#16a34a" }}
                        onClick={() => updateStatus(task.id, "concluida")}
                      >
                        Encerrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section style={panel}>
          <h2>Histórico encerrado</h2>

          {concluidas.length === 0 ? (
            <p style={muted}>Ainda não existem tarefas concluídas.</p>
          ) : (
            <div style={list}>
              {concluidas.map((task) => (
                <div key={task.id} style={closedTask}>
                  <div style={taskTop}>
                    <div>
                      <strong>{task.title}</strong>
                      <p style={smallText}>
                        {task.prospect_name || task.clients?.name || "-"}
                      </p>
                    </div>

                    <span style={closedBadge}>concluída</span>
                  </div>

                  <p style={smallText}>
                    Entrada: {formatDate(task.created_at)}
                  </p>

                  <p style={smallText}>
                    Encerrada em: {formatDate(task.closed_at)}
                  </p>

                  <div style={procedureBox}>
                    <strong>Procedimento adotado</strong>
                    <pre style={procedureText}>
                      {task.procedure_notes || "-"}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
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
  fontFamily: "Arial",
};

const sidebar = {
  width: 240,
  background: "#111827",
  color: "white",
  padding: 24,
};

const logo = {
  marginBottom: 40,
};

const nav = {
  display: "grid",
  gap: 12,
};

const link = {
  color: "#cbd5e1",
  textDecoration: "none",
  padding: "12px 14px",
  borderRadius: 10,
};

const activeLink = {
  ...link,
  background: "#2563eb",
  color: "white",
};

const main = {
  flex: 1,
  padding: 40,
};

const header = {
  marginBottom: 30,
};

const titlePage = {
  fontSize: 40,
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
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const cardLabel = {
  color: "#6b7280",
  margin: 0,
};

const cardValue = {
  fontSize: 28,
  marginTop: 10,
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
  marginBottom: 24,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const form = {
  display: "grid",
  gap: 12,
};

const input = {
  padding: 13,
  borderRadius: 10,
  border: "1px solid #d1d5db",
};

const textarea = {
  minHeight: 100,
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
  gap: 16,
};

const taskCard = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 18,
};

const taskTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
};

const priorityBadge = {
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
};

const smallText = {
  color: "#6b7280",
};

const procedureBox = {
  background: "#f9fafb",
  borderRadius: 12,
  padding: 14,
  marginTop: 16,
  marginBottom: 16,
};

const procedureText = {
  whiteSpace: "pre-wrap",
  fontFamily: "Arial",
  margin: "10px 0 0",
};

const buttons = {
  display: "flex",
  gap: 10,
  marginTop: 16,
  flexWrap: "wrap",
};

const smallButton = {
  border: "none",
  color: "white",
  padding: "10px 12px",
  borderRadius: 8,
  cursor: "pointer",
};

const closedTask = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
};

const closedBadge = {
  background: "#dcfce7",
  color: "#166534",
  padding: "5px 10px",
  borderRadius: 999,
  fontSize: 12,
};
  
