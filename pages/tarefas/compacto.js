import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "../../components/Sidebar";

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
    .select("*, clients(id, name, nif, phone), policies(id, policy_number, branch, license_plate)")
    .order("created_at", { ascending: false });

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, nif, phone")
    .order("name", { ascending: true });

  return {
    props: {
      tasks: tasks || [],
      clients: clients || [],
    },
  };
}

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-PT").format(new Date(date));
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

function normalizePriority(priority) {
  const p = String(priority || "NORMAL").toUpperCase().trim();

  if (p === "URGENTE") return "URGENTE";
  if (p === "MUITO URGENTE") return "MUITO URGENTE";

  return "NORMAL";
}

function normalizeCategory(category) {
  const c = String(category || "").toLowerCase().trim();

  if (c.includes("comercial")) return "COMERCIAL";

  if (
    c.includes("administrativa") ||
    c.includes("administrativo") ||
    c.includes("admin")
  ) {
    return "ADMINISTRATIVA";
  }

  return "SEM CATEGORIA";
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

function taskMatchesSearch(task, search) {
  const text = clean(`
    ${task.title || ""}
    ${task.description || ""}
    ${task.category || ""}
    ${task.priority || ""}
    ${task.status || ""}
    ${task.origin || ""}
    ${task.clients?.name || ""}
    ${task.clients?.nif || ""}
    ${task.clients?.phone || ""}
    ${task.policies?.policy_number || ""}
    ${task.policies?.branch || ""}
    ${task.policies?.license_plate || ""}
  `);

  const numbers = `
    ${onlyNumbers(task.clients?.nif)}
    ${onlyNumbers(task.clients?.phone)}
  `;

  const searchText = clean(search);
  const searchNumbers = onlyNumbers(search);

  return (
    !searchText ||
    text.includes(searchText) ||
    (searchNumbers && numbers.includes(searchNumbers))
  );
}

export default function TarefasCompacto({ tasks, clients }) {
  const router = useRouter();
  const today = todayIso();

  const [search, setSearch] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [taskForm, setTaskForm] = useState({
    title: "",
    client_id: "",
    description: "",
    category: "ADMINISTRATIVA",
    priority: "NORMAL",
    due_date: "",
  });

  const [showEditTaskForm, setShowEditTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskForm, setEditTaskForm] = useState({
    title: "",
    description: "",
    category: "ADMINISTRATIVA",
    priority: "NORMAL",
    due_date: "",
  });

  useEffect(() => {
    const clientId =
      typeof router.query.cliente === "string"
        ? router.query.cliente
        : Array.isArray(router.query.cliente)
        ? router.query.cliente[0]
        : "";

    if (!clientId) return;

    const localClient = clients.find((client) => client.id === clientId);

    setShowTaskForm(true);
    setTaskForm((current) => ({
      ...current,
      client_id: clientId,
      title: current.title || "",
      description: current.description || "",
    }));

    if (localClient?.name && !taskForm.title) {
      setTaskForm((current) => ({
        ...current,
        client_id: clientId,
      }));
    }
  }, [router.query.cliente, clients]);

  const openTasks = tasks.filter((task) => task.status !== "concluida");

  const filteredTasks = openTasks
    .filter((task) => taskMatchesSearch(task, search))
    .sort((a, b) => {
      const dateA = a.due_date || "9999-12-31";
      const dateB = b.due_date || "9999-12-31";

      if (dateA !== dateB) return dateA.localeCompare(dateB);

      return String(a.title || "").localeCompare(String(b.title || ""), "pt-PT");
    });

  const overdueTasks = filteredTasks.filter(
    (task) => task.due_date && task.due_date < today
  );

  const todayTasks = filteredTasks.filter((task) => task.due_date === today);

  const futureTasks = filteredTasks.filter(
    (task) => task.due_date && task.due_date > today
  );

  const noDateTasks = filteredTasks.filter((task) => !task.due_date);

  function resetTaskForm() {
    setTaskForm({
      title: "",
      client_id: "",
      description: "",
      category: "ADMINISTRATIVA",
      priority: "NORMAL",
      due_date: "",
    });
  }

  async function createTask(event) {
    event.preventDefault();

    if (!taskForm.title.trim()) {
      alert("Indica o título da tarefa.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("tasks").insert({
      title: taskForm.title,
      client_id: taskForm.client_id || null,
      description: taskForm.description,
      category: normalizeCategory(taskForm.category),
      priority: normalizePriority(taskForm.priority),
      status: "aberta",
      due_date: taskForm.due_date || null,
      origin: "manual - tarefas compacto",
    });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  function editTask(task) {
    setEditingTaskId(task.id);
    setShowEditTaskForm(true);
    setShowTaskForm(false);

    setEditTaskForm({
      title: task.title || "",
      description: task.description || "",
      category: normalizeCategory(task.category),
      priority: normalizePriority(task.priority),
      due_date: task.due_date || "",
    });

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  }

  async function saveTask(event) {
    event.preventDefault();

    if (!editingTaskId) {
      alert("Não foi possível identificar a tarefa.");
      return;
    }

    if (!editTaskForm.title.trim()) {
      alert("Indica o título da tarefa.");
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .update({
        title: editTaskForm.title,
        description: editTaskForm.description,
        category: normalizeCategory(editTaskForm.category),
        priority: normalizePriority(editTaskForm.priority),
        due_date: editTaskForm.due_date || null,
      })
      .eq("id", editingTaskId);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function completeTask(taskId) {
    const { error } = await supabase
      .from("tasks")
      .update({ status: "concluida" })
      .eq("id", taskId);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  const selectedClient = clients.find((client) => client.id === taskForm.client_id);

  return (
    <div style={page}>
      <Sidebar active="tarefas-compacto" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Tarefas Compacto ✅</h1>
            <p style={subtitle}>
              Página exclusiva de tarefas. Não comunica com Oportunidades.
            </p>
          </div>

          <button
            type="button"
            style={button}
            onClick={() => {
              setShowEditTaskForm(false);
              setShowTaskForm(true);
            }}
          >
            + Nova tarefa
          </button>
        </header>

        <section style={searchCard}>
          <input
            style={searchInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar tarefa, cliente, NIF, telefone, apólice ou matrícula..."
          />
        </section>

        {showTaskForm && (
          <section style={formCard}>
            <div style={formHeader}>
              <h2>Nova tarefa</h2>

              <button
                type="button"
                style={cancelButton}
                onClick={() => {
                  setShowTaskForm(false);
                  resetTaskForm();
                }}
              >
                Fechar
              </button>
            </div>

            <form style={formGrid} onSubmit={createTask}>
              <input
                style={input}
                placeholder="Título da tarefa"
                value={taskForm.title}
                onChange={(event) =>
                  setTaskForm({ ...taskForm, title: event.target.value })
                }
                required
              />

              <select
                style={input}
                value={taskForm.client_id}
                onChange={(event) =>
                  setTaskForm({ ...taskForm, client_id: event.target.value })
                }
              >
                <option value="">Tarefa geral / sem cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} · {client.nif || "-"}
                  </option>
                ))}
              </select>

              <select
                style={input}
                value={taskForm.category}
                onChange={(event) =>
                  setTaskForm({ ...taskForm, category: event.target.value })
                }
              >
                <option value="ADMINISTRATIVA">Administrativa</option>
                <option value="COMERCIAL">Comercial</option>
              </select>

              <select
                style={input}
                value={taskForm.priority}
                onChange={(event) =>
                  setTaskForm({ ...taskForm, priority: event.target.value })
                }
              >
                <option value="NORMAL">Normal</option>
                <option value="URGENTE">Urgente</option>
                <option value="MUITO URGENTE">Muito urgente</option>
              </select>

              <label style={fieldLabel}>
                Data limite
                <input
                  style={input}
                  type="date"
                  value={taskForm.due_date}
                  onChange={(event) =>
                    setTaskForm({ ...taskForm, due_date: event.target.value })
                  }
                />
              </label>

              {selectedClient && (
                <div style={linkedClientBox}>
                  Cliente associado: <strong>{selectedClient.name}</strong>
                </div>
              )}

              <textarea
                style={{ ...textarea, gridColumn: "1 / -1" }}
                placeholder="Descrição"
                value={taskForm.description}
                onChange={(event) =>
                  setTaskForm({ ...taskForm, description: event.target.value })
                }
              />

              <div style={formButtons}>
                <button type="submit" style={button} disabled={saving}>
                  {saving ? "A guardar..." : "Guardar tarefa"}
                </button>

                <button
                  type="button"
                  style={cancelButton}
                  onClick={() => {
                    setShowTaskForm(false);
                    resetTaskForm();
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        )}

        {showEditTaskForm && (
          <section style={editFormCard}>
            <div style={formHeader}>
              <h2>Editar tarefa</h2>

              <button
                type="button"
                style={cancelButton}
                onClick={() => {
                  setShowEditTaskForm(false);
                  setEditingTaskId(null);
                }}
              >
                Fechar
              </button>
            </div>

            <form style={formGrid} onSubmit={saveTask}>
              <input
                style={input}
                placeholder="Título da tarefa"
                value={editTaskForm.title}
                onChange={(event) =>
                  setEditTaskForm({ ...editTaskForm, title: event.target.value })
                }
                required
              />

              <select
                style={input}
                value={editTaskForm.category}
                onChange={(event) =>
                  setEditTaskForm({ ...editTaskForm, category: event.target.value })
                }
              >
                <option value="ADMINISTRATIVA">Administrativa</option>
                <option value="COMERCIAL">Comercial</option>
              </select>

              <select
                style={input}
                value={editTaskForm.priority}
                onChange={(event) =>
                  setEditTaskForm({ ...editTaskForm, priority: event.target.value })
                }
              >
                <option value="NORMAL">Normal</option>
                <option value="URGENTE">Urgente</option>
                <option value="MUITO URGENTE">Muito urgente</option>
              </select>

              <label style={fieldLabel}>
                Data limite
                <input
                  style={input}
                  type="date"
                  value={editTaskForm.due_date}
                  onChange={(event) =>
                    setEditTaskForm({ ...editTaskForm, due_date: event.target.value })
                  }
                />
              </label>

              <textarea
                style={{ ...textarea, gridColumn: "1 / -1" }}
                placeholder="Descrição"
                value={editTaskForm.description}
                onChange={(event) =>
                  setEditTaskForm({ ...editTaskForm, description: event.target.value })
                }
              />

              <div style={formButtons}>
                <button type="submit" style={button}>
                  Guardar alterações
                </button>

                <button
                  type="button"
                  style={cancelButton}
                  onClick={() => {
                    setShowEditTaskForm(false);
                    setEditingTaskId(null);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        )}

        <section style={statsGrid}>
          <StatCard title="Vencidas" value={overdueTasks.length} color="#dc2626" />
          <StatCard title="Hoje" value={todayTasks.length} color="#7c3aed" />
          <StatCard title="Futuras" value={futureTasks.length} color="#2563eb" />
          <StatCard title="Sem data" value={noDateTasks.length} color="#6b7280" />
          <StatCard title="Total abertas" value={filteredTasks.length} color="#111827" />
        </section>

        <TaskSection title="Vencidas" items={overdueTasks} editTask={editTask} completeTask={completeTask} />
        <TaskSection title="Hoje" items={todayTasks} editTask={editTask} completeTask={completeTask} />
        <TaskSection title="Futuras" items={futureTasks} editTask={editTask} completeTask={completeTask} />
        <TaskSection title="Sem data" items={noDateTasks} editTask={editTask} completeTask={completeTask} />
      </main>
    </div>
  );
}

function TaskSection({ title, items, editTask, completeTask }) {
  return (
    <section style={section}>
      <h2 style={sectionTitle}>{title}: {items.length}</h2>

      {items.length === 0 ? (
        <p style={muted}>Sem tarefas.</p>
      ) : (
        <div style={taskGrid}>
          {items.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              editTask={editTask}
              completeTask={completeTask}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TaskCard({ task, editTask, completeTask }) {
  const priority = normalizePriority(task.priority);
  const category = normalizeCategory(task.category);

  return (
    <article style={taskCard}>
      <div style={taskTop}>
        <h3 style={taskTitle}>{task.title || "Sem título"}</h3>

        <div style={badgeRow}>
          <span style={{ ...badge, ...priorityStyle(priority) }}>
            {priority}
          </span>

          <span style={{ ...badge, ...categoryStyle(category) }}>
            {category}
          </span>
        </div>
      </div>

      <p><strong>Data limite:</strong> {formatDate(task.due_date)}</p>

      <p>
        <strong>Cliente:</strong>{" "}
        {task.clients?.name ? (
          <Link href={`/clientes/${task.clients.id}`} style={link}>
            {task.clients.name}
          </Link>
        ) : (
          "Tarefa geral"
        )}
      </p>

      {task.policies && (
        <p>
          <strong>Apólice:</strong>{" "}
          {task.policies.policy_number || "-"} · {task.policies.license_plate || "-"}
        </p>
      )}

      <p><strong>Descrição:</strong> {task.description || "-"}</p>

      <div style={buttonGroup}>
        {task.client_id && (
          <Link href={`/clientes/${task.client_id}`} style={smallLinkButton}>
            Abrir cliente
          </Link>
        )}

        <button
          type="button"
          style={{ ...smallButton, background: "#2563eb" }}
          onClick={() => editTask(task)}
        >
          Editar
        </button>

        <button
          type="button"
          style={{ ...smallButton, background: "#16a34a" }}
          onClick={() => completeTask(task.id)}
        >
          Concluir
        </button>
      </div>
    </article>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div style={statCard}>
      <p style={cardLabel}>{title}</p>
      <h2 style={{ ...cardValue, color }}>{value}</h2>
    </div>
  );
}

function priorityStyle(priority) {
  if (priority === "MUITO URGENTE") return { background: "#fee2e2", color: "#991b1b" };
  if (priority === "URGENTE") return { background: "#fef3c7", color: "#92400e" };
  return { background: "#dbeafe", color: "#1d4ed8" };
}

function categoryStyle(category) {
  if (category === "COMERCIAL") return { background: "#ede9fe", color: "#5b21b6" };
  if (category === "ADMINISTRATIVA") return { background: "#ccfbf1", color: "#0f766e" };
  return { background: "#e5e7eb", color: "#374151" };
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
  marginBottom: 14,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 18,
};

const title = {
  fontSize: 34,
  margin: 0,
  color: "#7c3aed",
  fontWeight: 900,
};

const subtitle = {
  color: "#475569",
  marginTop: 6,
  fontSize: 15,
};

const searchCard = {
  background: "white",
  padding: 12,
  borderRadius: 16,
  marginBottom: 14,
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const searchInput = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  fontSize: 15,
  boxSizing: "border-box",
};

const formCard = {
  background: "linear-gradient(135deg, #ffffff, #f5f3ff)",
  padding: 16,
  borderRadius: 18,
  marginBottom: 14,
  border: "1px solid #ddd6fe",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const editFormCard = {
  background: "linear-gradient(135deg, #fffbeb, #ffffff)",
  padding: 16,
  borderRadius: 18,
  marginBottom: 14,
  border: "1px solid #f59e0b",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const formHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 10,
};

const input = {
  padding: 11,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  boxSizing: "border-box",
  width: "100%",
};

const textarea = {
  padding: 11,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  minHeight: 78,
  fontSize: 14,
  fontFamily: "Arial, sans-serif",
  boxSizing: "border-box",
  width: "100%",
};

const fieldLabel = {
  display: "grid",
  gap: 6,
  color: "#374151",
  fontSize: 13,
};

const linkedClientBox = {
  background: "#dcfce7",
  color: "#166534",
  padding: 10,
  borderRadius: 10,
  fontWeight: "bold",
  gridColumn: "1 / -1",
};

const formButtons = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  gridColumn: "1 / -1",
};

const button = {
  background: "#7c3aed",
  color: "white",
  border: "none",
  padding: "12px 16px",
  borderRadius: 10,
  fontWeight: 800,
  cursor: "pointer",
};

const cancelButton = {
  background: "#6b7280",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 800,
  cursor: "pointer",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
  marginBottom: 14,
};

const statCard = {
  background: "white",
  padding: 14,
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const cardLabel = {
  color: "#334155",
  margin: 0,
  fontWeight: 800,
  fontSize: 13,
};

const cardValue = {
  fontSize: 30,
  margin: "4px 0 0",
  lineHeight: 1,
};

const section = {
  background: "white",
  padding: 16,
  borderRadius: 18,
  marginBottom: 14,
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const sectionTitle = {
  margin: "0 0 12px",
  color: "#0f172a",
  fontSize: 21,
  fontWeight: 900,
};

const taskGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 12,
};

const taskCard = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  padding: 14,
  borderRadius: 14,
};

const taskTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
};

const taskTitle = {
  margin: 0,
};

const badgeRow = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const badge = {
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
  whiteSpace: "nowrap",
};

const buttonGroup = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 14,
};

const smallButton = {
  color: "white",
  border: "none",
  padding: "9px 12px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const smallLinkButton = {
  background: "#111827",
  color: "white",
  padding: "9px 12px",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: "bold",
};

const link = {
  color: "#2563eb",
  fontWeight: "bold",
  textDecoration: "none",
};

const muted = {
  color: "#64748b",
};
