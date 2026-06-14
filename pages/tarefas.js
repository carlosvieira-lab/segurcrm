import { useState } from "react";
import { useRouter } from "next/router";
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

export async function getServerSideProps() {
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, clients(id, name, nif), policies(id, policy_number, branch, license_plate)")
    .order("created_at", { ascending: false });

  return {
    props: {
      tasks: tasks || [],
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

  if (c.includes("comercial")) {
    return "COMERCIAL";
  }

  if (
    c.includes("administrativa") ||
    c.includes("administrativo") ||
    c.includes("admin")
  ) {
    return "ADMINISTRATIVA";
  }

  return "SEM CATEGORIA";
}

export default function Tarefas({ tasks }) {
  const router = useRouter();
  const dashboardFilter = router.query.filtro || "";

  const [priorityFilter, setPriorityFilter] = useState("TODAS");
  const [categoryFilter, setCategoryFilter] = useState("TODAS");

  const [showTaskForm, setShowTaskForm] = useState(false);

  const [taskForm, setTaskForm] = useState({
    title: "",
    client_id: null,
    client_name: "",
    client_phone: "",
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

  const openTasks = tasks.filter((t) => t.status !== "concluida");

  const today = todayIso();

  const overdueTasks = openTasks.filter(
    (t) => t.due_date && t.due_date < today
  );

  const todayTasks = openTasks.filter(
    (t) => t.due_date === today
  );

  const normalTasks = openTasks.filter(
    (t) => normalizePriority(t.priority) === "NORMAL"
  );

  const urgentTasks = openTasks.filter(
    (t) => normalizePriority(t.priority) === "URGENTE"
  );

  const veryUrgentTasks = openTasks.filter(
    (t) => normalizePriority(t.priority) === "MUITO URGENTE"
  );

  const administrativeTasks = openTasks.filter(
    (t) => normalizeCategory(t.category) === "ADMINISTRATIVA"
  );

  const commercialTasks = openTasks.filter(
    (t) => normalizeCategory(t.category) === "COMERCIAL"
  );

  const uncategorizedTasks = openTasks.filter(
    (t) => normalizeCategory(t.category) === "SEM CATEGORIA"
  );

  let filteredTasks = openTasks;

  if (priorityFilter !== "TODAS") {
    filteredTasks = filteredTasks.filter(
      (t) => normalizePriority(t.priority) === priorityFilter
    );
  }

  if (categoryFilter !== "TODAS") {
    filteredTasks = filteredTasks.filter(
      (t) => normalizeCategory(t.category) === categoryFilter
    );
  }

  if (dashboardFilter === "vencidas") {
    filteredTasks = filteredTasks.filter(
      (t) => t.due_date && t.due_date < today
    );
  }

  if (dashboardFilter === "hoje") {
    filteredTasks = filteredTasks.filter(
      (t) => t.due_date === today
    );
  }

  const filteredTitle =
    dashboardFilter === "vencidas"
      ? "Tarefas vencidas"
      : dashboardFilter === "hoje"
      ? "Tarefas para hoje"
      : "Tarefas filtradas";

  async function createTask(e) {
    e.preventDefault();

    if (!taskForm.title.trim()) {
      alert("Indica o título da tarefa.");
      return;
    }

    const { error } = await supabase.from("tasks").insert({
      title: taskForm.title,
      client_id: taskForm.client_id || null,
      description: taskForm.description,
      category: normalizeCategory(taskForm.category),
      priority: normalizePriority(taskForm.priority),
      status: "aberta",
      due_date: taskForm.due_date || null,
      origin: "manual - tarefas",
    });

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
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }, 100);
  }

  async function saveTask(e) {
    e.preventDefault();

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
      .update({
        status: "concluida",
      })
      .eq("id", taskId);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  return (
    <div style={page}>
      <Sidebar active="tarefas" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Tarefas</h1>
            <p style={subtitle}>
              Gestão por prioridade e categoria.
            </p>
          </div>

          <button style={button} onClick={() => setShowTaskForm(true)}>
            + Nova tarefa
          </button>
        </header>

        {showTaskForm && (
          <section
            style={{
              ...card,
              background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
              border: "1px solid #bfdbfe",
            }}
          >
            <h2>Nova Tarefa</h2>

            <form onSubmit={createTask} style={formGrid}>
              <input
                style={input}
                placeholder="Título da tarefa"
                value={taskForm.title}
                onChange={(e) =>
                  setTaskForm({
                    ...taskForm,
                    title: e.target.value,
                  })
                }
                required
              />

              <select
                style={input}
                value={taskForm.category}
                onChange={(e) =>
                  setTaskForm({
                    ...taskForm,
                    category: e.target.value,
                  })
                }
              >
                <option value="ADMINISTRATIVA">Administrativa</option>
                <option value="COMERCIAL">Comercial</option>
              </select>

              <select
                style={input}
                value={taskForm.priority}
                onChange={(e) =>
                  setTaskForm({
                    ...taskForm,
                    priority: e.target.value,
                  })
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
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      due_date: e.target.value,
                    })
                  }
                />
              </label>

              <textarea
                style={{
                  ...input,
                  minHeight: 120,
                  gridColumn: "1 / -1",
                }}
                placeholder="Descrição"
                value={taskForm.description}
                onChange={(e) =>
                  setTaskForm({
                    ...taskForm,
                    description: e.target.value,
                  })
                }
              />

              <div style={formButtons}>
                <button type="submit" style={button}>
                  Guardar tarefa
                </button>

                <button
                  type="button"
                  style={cancelButton}
                  onClick={() => {
                    setShowTaskForm(false);
                    setTaskForm({
                      title: "",
                      client_id: null,
                      client_name: "",
                      client_phone: "",
                      description: "",
                      category: "ADMINISTRATIVA",
                      priority: "NORMAL",
                      due_date: "",
                    });
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        )}

        {showEditTaskForm && (
          <section
            style={{
              ...card,
              background: "linear-gradient(135deg, #fef3c7, #fffbeb)",
              border: "1px solid #f59e0b",
            }}
          >
            <h2>Editar Tarefa</h2>

            <form onSubmit={saveTask} style={formGrid}>
              <input
                style={input}
                placeholder="Título da tarefa"
                value={editTaskForm.title}
                onChange={(e) =>
                  setEditTaskForm({
                    ...editTaskForm,
                    title: e.target.value,
                  })
                }
                required
              />

              <select
                style={input}
                value={editTaskForm.category}
                onChange={(e) =>
                  setEditTaskForm({
                    ...editTaskForm,
                    category: e.target.value,
                  })
                }
              >
                <option value="ADMINISTRATIVA">Administrativa</option>
                <option value="COMERCIAL">Comercial</option>
              </select>

              <select
                style={input}
                value={editTaskForm.priority}
                onChange={(e) =>
                  setEditTaskForm({
                    ...editTaskForm,
                    priority: e.target.value,
                  })
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
                  onChange={(e) =>
                    setEditTaskForm({
                      ...editTaskForm,
                      due_date: e.target.value,
                    })
                  }
                />
              </label>

              <textarea
                style={{
                  ...input,
                  minHeight: 120,
                  gridColumn: "1 / -1",
                }}
                placeholder="Descrição"
                value={editTaskForm.description}
                onChange={(e) =>
                  setEditTaskForm({
                    ...editTaskForm,
                    description: e.target.value,
                  })
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

        <section style={card}>
          <h2>Vista rápida</h2>

          <div style={statsGrid}>
            <FilterCard
              title="Todas abertas"
              value={openTasks.length}
              active={!dashboardFilter}
              color="#111827"
              onClick={() => router.push("/tarefas")}
            />

            <FilterCard
              title="Vencidas"
              value={overdueTasks.length}
              active={dashboardFilter === "vencidas"}
              color="#dc2626"
              onClick={() => router.push("/tarefas?filtro=vencidas")}
            />

            <FilterCard
              title="Hoje"
              value={todayTasks.length}
              active={dashboardFilter === "hoje"}
              color="#7c3aed"
              onClick={() => router.push("/tarefas?filtro=hoje")}
            />
          </div>
        </section>

        <section style={card}>
          <h2>Prioridade</h2>

          <div style={statsGrid}>
            <FilterCard
              title="Todas"
              value={openTasks.length}
              active={priorityFilter === "TODAS"}
              color="#111827"
              onClick={() => setPriorityFilter("TODAS")}
            />

            <FilterCard
              title="Normais"
              value={normalTasks.length}
              active={priorityFilter === "NORMAL"}
              color="#2563eb"
              onClick={() => setPriorityFilter("NORMAL")}
            />

            <FilterCard
              title="Urgentes"
              value={urgentTasks.length}
              active={priorityFilter === "URGENTE"}
              color="#f59e0b"
              onClick={() => setPriorityFilter("URGENTE")}
            />

            <FilterCard
              title="Muito urgentes"
              value={veryUrgentTasks.length}
              active={priorityFilter === "MUITO URGENTE"}
              color="#dc2626"
              onClick={() => setPriorityFilter("MUITO URGENTE")}
            />
          </div>
        </section>

        <section style={card}>
          <h2>Categoria</h2>

          <div style={statsGrid}>
            <FilterCard
              title="Todas"
              value={openTasks.length}
              active={categoryFilter === "TODAS"}
              color="#111827"
              onClick={() => setCategoryFilter("TODAS")}
            />

            <FilterCard
              title="Administrativas"
              value={administrativeTasks.length}
              active={categoryFilter === "ADMINISTRATIVA"}
              color="#0f766e"
              onClick={() => setCategoryFilter("ADMINISTRATIVA")}
            />

            <FilterCard
              title="Comerciais"
              value={commercialTasks.length}
              active={categoryFilter === "COMERCIAL"}
              color="#7c3aed"
              onClick={() => setCategoryFilter("COMERCIAL")}
            />

            <FilterCard
              title="Sem categoria"
              value={uncategorizedTasks.length}
              active={categoryFilter === "SEM CATEGORIA"}
              color="#6b7280"
              onClick={() => setCategoryFilter("SEM CATEGORIA")}
            />
          </div>
        </section>

        <section style={card}>
          <h2>{filteredTitle}: {filteredTasks.length}</h2>

          {filteredTasks.length === 0 ? (
            <p style={muted}>Sem tarefas nesta seleção.</p>
          ) : (
            <div style={taskGrid}>
              {filteredTasks.map((task) => {
                const priority = normalizePriority(task.priority);
                const category = normalizeCategory(task.category);

                return (
                  <div key={task.id} style={taskCard}>
                    <div style={taskTop}>
                      <h3>{task.title || "Sem título"}</h3>

                      <div style={badgeRow}>
                        <span
                          style={{
                            ...badge,
                            ...priorityStyle(priority),
                          }}
                        >
                          {priority}
                        </span>

                        <span
                          style={{
                            ...badge,
                            ...categoryStyle(category),
                          }}
                        >
                          {category}
                        </span>
                      </div>
                    </div>

                    <p>
                      <strong>Estado:</strong> {task.status || "aberta"}
                    </p>

                    <p>
                      <strong>Data limite:</strong> {formatDate(task.due_date)}
                    </p>

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
                        {task.policies.policy_number || "-"} ·{" "}
                        {task.policies.license_plate || "-"}
                      </p>
                    )}

                    <p>
                      <strong>Descrição:</strong> {task.description || "-"}
                    </p>

                    <div style={buttonGroup}>
                      {task.client_id && (
                        <Link
                          href={`/clientes/${task.client_id}`}
                          style={smallLinkButton}
                        >
                          Abrir cliente
                        </Link>
                      )}

                      <button
                        style={{ ...smallButton, background: "#2563eb" }}
                        onClick={() => editTask(task)}
                      >
                        Editar
                      </button>

                      <button
                        style={{ ...smallButton, background: "#16a34a" }}
                        onClick={() => completeTask(task.id)}
                      >
                        Concluir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function FilterCard({ title, value, color, active, onClick }) {
  return (
    <button
      style={{
        ...statCard,
        borderTop: `6px solid ${color}`,
        outline: active ? `3px solid ${color}` : "none",
      }}
      onClick={onClick}
    >
      <p style={cardLabel}>{title}</p>
      <h2 style={{ ...cardValue, color }}>{value}</h2>
    </button>
  );
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
    background: "#dbeafe",
    color: "#1d4ed8",
  };
}

function categoryStyle(category) {
  if (category === "COMERCIAL") {
    return {
      background: "#ede9fe",
      color: "#5b21b6",
    };
  }

  if (category === "ADMINISTRATIVA") {
    return {
      background: "#ccfbf1",
      color: "#0f766e",
    };
  }

  if (category === "SEM CATEGORIA") {
    return {
      background: "#e5e7eb",
      color: "#374151",
    };
  }

  return {
    background: "#e5e7eb",
    color: "#374151",
  };
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
  alignItems: "center",
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

const button = {
  background: "#111827",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 18,
};

const statCard = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  border: "none",
  textAlign: "left",
  cursor: "pointer",
};

const cardLabel = {
  color: "#6b7280",
  margin: 0,
};

const cardValue = {
  marginTop: 12,
  fontSize: 32,
};

const card = {
  background: "white",
  borderRadius: 18,
  padding: 24,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const taskGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
};

const taskCard = {
  background: "#f9fafb",
  padding: 18,
  borderRadius: 14,
};

const taskTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
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
  marginTop: 16,
};

const smallButton = {
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const smallLinkButton = {
  background: "#111827",
  color: "white",
  padding: "10px 14px",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: "bold",
};

const link = {
  color: "#2563eb",
  fontWeight: "bold",
  textDecoration: "none",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const input = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};

const linkedClientBox = {
  background: "#dcfce7",
  color: "#166534",
  padding: 12,
  borderRadius: 10,
  fontWeight: "bold",
};

const fieldLabel = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  color: "#374151",
  fontSize: 13,
};

const formButtons = {
  display: "flex",
  gap: 12,
  gridColumn: "1 / -1",
};

const cancelButton = {
  background: "#6b7280",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const muted = {
  color: "#6b7280",
};
