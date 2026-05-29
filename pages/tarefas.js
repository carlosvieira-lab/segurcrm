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
    .select("*, clients(id, name, nif, phone), policies(id, policy_number, branch, license_plate)")
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

function onlyNumbers(value) {
  return String(value || "").replace(/\D/g, "");
}

function buildWhatsappLink(phone) {
  const numbers = onlyNumbers(phone);

  if (!numbers) return "";

  if (numbers.startsWith("351")) {
    return `https://wa.me/${numbers}`;
  }

  return `https://wa.me/351${numbers}`;
}

function extractTaskPhone(task) {
  const clientPhone = task.clients?.phone;

  if (clientPhone) return clientPhone;

  const description = String(task.description || "");
  const match = description.match(/Telemóvel cliente:\s*([^\n]+)/i);

  if (match && match[1]) {
    return match[1].trim();
  }

  return "";
}

function cleanDescription(description) {
  return String(description || "")
    .replace(/\n?\n?Telemóvel cliente:\s*[^\n]+/i, "")
    .trim();
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
    client_phone: "",
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

    if (!onlyNumbers(taskForm.client_phone)) {
      alert("Indica o telemóvel do cliente.");
      return;
    }

    const descriptionWithPhone = taskForm.description
      ? `${taskForm.description}\n\nTelemóvel cliente: ${taskForm.client_phone}`
      : `Telemóvel cliente: ${taskForm.client_phone}`;

    const { error } = await supabase.from("tasks").insert({
      title: taskForm.title,
      description: descriptionWithPhone,
      category: normalizeCategory(taskForm.category),
      priority: normalizePriority(taskForm.priority),
      status: "aberta",
      due_date: taskForm.due_date || null,
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
      client_phone: extractTaskPhone(task),
      description: cleanDescription(task.description),
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

    if (!onlyNumbers(editTaskForm.client_phone)) {
      alert("Indica o telemóvel do cliente.");
      return;
    }

    const descriptionWithPhone = editTaskForm.description
      ? `${editTaskForm.description}\n\nTelemóvel cliente: ${editTaskForm.client_phone}`
      : `Telemóvel cliente: ${editTaskForm.client_phone}`;

    const { error } = await supabase
      .from("tasks")
      .update({
        title: editTaskForm.title,
        description: descriptionWithPhone,
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

              <input
                style={input}
                placeholder="Telemóvel do cliente"
                value={taskForm.client_phone}
                onChange={(e) =>
                  setTaskForm({
                    ...taskForm,
                    client_phone: e.target.value,
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
                  onClick={() => setShowTaskForm(false)}
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

              <input
                style={input}
                placeholder="Telemóvel do cliente"
                value={editTaskForm.client_phone}
                onChange={(e) =>
                  setEditTaskForm({
                    ...editTaskForm,
                    client_phone: e.target.value,
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
                const taskPhone = extractTaskPhone(task);
                const whatsappLink = buildWhatsappLink(taskPhone);
                const visibleDescription = cleanDescription(task.description);

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

                    <p>
                      <strong>Telemóvel:</strong> {taskPhone || "-"}
                    </p>

                    {task.policies && (
                      <p>
                        <strong>Apólice:</strong>{" "}
                        {task.policies.policy_number || "-"} ·{" "}
                        {task.policies.license_plate || "-"}
                      </p>
                    )}

                    <p>
                      <strong>Descrição:</strong> {visibleDescription || "-"}
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

                      {whatsappLink && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noreferrer"
                          style={whatsappTaskButton}
                        >
                          WhatsApp
                        </a>
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
