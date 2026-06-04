import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
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
    .order("due_date", { ascending: true });

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

function formatDateTime(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
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

function sortByDueDate(a, b) {
  const dateA = a.due_date || "9999-12-31";
  const dateB = b.due_date || "9999-12-31";

  if (dateA !== dateB) {
    return dateA.localeCompare(dateB);
  }

  const priorityOrder = {
    "MUITO URGENTE": 0,
    URGENTE: 1,
    NORMAL: 2,
  };

  const priorityA = priorityOrder[normalizePriority(a.priority)] ?? 2;
  const priorityB = priorityOrder[normalizePriority(b.priority)] ?? 2;

  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }

  return String(a.title || "").localeCompare(String(b.title || ""), "pt-PT");
}

function taskTiming(task) {
  const today = todayIso();

  if (!task.due_date) {
    return {
      label: "Sem data",
      color: "#64748b",
      background: "#f1f5f9",
    };
  }

  if (task.due_date < today) {
    return {
      label: "Atrasada",
      color: "#b91c1c",
      background: "#fee2e2",
    };
  }

  if (task.due_date === today) {
    return {
      label: "Hoje",
      color: "#c2410c",
      background: "#ffedd5",
    };
  }

  return {
    label: "Futura",
    color: "#1d4ed8",
    background: "#dbeafe",
  };
}

function getClientName(task) {
  return task.clients?.name || task.client_name || "";
}

function getClientNif(task) {
  return task.clients?.nif || task.client_nif || "";
}

function getClientPhone(task) {
  return task.clients?.phone || task.client_phone || "";
}

function getInitials(name) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export default function TarefasCompacto({ tasks }) {
  const router = useRouter();
  const dashboardFilter = router.query.filtro || "";

  const [priorityFilter, setPriorityFilter] = useState("TODAS");
  const [categoryFilter, setCategoryFilter] = useState("TODAS");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

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

  useEffect(() => {
    async function loadClientFromQuery() {
      const clientId = router.query.cliente;

      if (!clientId) return;

      const { data, error } = await supabase
        .from("clients")
        .select("id, name, nif, phone")
        .eq("id", clientId)
        .maybeSingle();

      if (error || !data) return;

      setShowTaskForm(true);

      setTaskForm((current) => ({
        ...current,
        client_id: data.id,
        client_name: data.name || "",
        client_phone: data.phone || "",
      }));
    }

    loadClientFromQuery();
  }, [router.query.cliente]);

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
  const completedTasks = tasks.filter((t) => t.status === "concluida");

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

  const searchClean = String(search || "").toLowerCase().trim();

  let filteredTasks = openTasks.filter((task) => {
    if (!searchClean) return true;

    const text = `
      ${task.title || ""}
      ${task.description || ""}
      ${task.status || ""}
      ${task.category || ""}
      ${task.priority || ""}
      ${getClientName(task)}
      ${getClientNif(task)}
      ${getClientPhone(task)}
      ${task.policies?.policy_number || ""}
      ${task.policies?.branch || ""}
      ${task.policies?.license_plate || ""}
    `.toLowerCase();

    return text.includes(searchClean);
  });

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

  filteredTasks = filteredTasks.sort(sortByDueDate);

  const doNowTasks = openTasks
    .filter((task) => {
      const priority = normalizePriority(task.priority);
      return (
        (task.due_date && task.due_date <= today) ||
        priority === "MUITO URGENTE"
      );
    })
    .sort(sortByDueDate);

  const nextTasks = openTasks
    .filter((task) => task.due_date && task.due_date > today)
    .sort(sortByDueDate);

  const selectedTask =
    filteredTasks.find((task) => task.id === selectedId) ||
    doNowTasks.find((task) => task.id === selectedId) ||
    nextTasks.find((task) => task.id === selectedId) ||
    null;

  const filteredTitle =
    dashboardFilter === "vencidas"
      ? "Tarefas vencidas"
      : dashboardFilter === "hoje"
      ? "Tarefas para hoje"
      : "Todas as tarefas";

  async function createTask(e) {
    e.preventDefault();

    if (!taskForm.title.trim()) {
      alert("Indica o título da tarefa.");
      return;
    }

    const { error } = await supabase.from("tasks").insert({
      title: taskForm.title,
      description: taskForm.description,
      category: normalizeCategory(taskForm.category),
      priority: normalizePriority(taskForm.priority),
      status: "aberta",
      due_date: taskForm.due_date || null,
      client_id: taskForm.client_id || null,
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
      <Sidebar active="tarefas-compacto" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>✅ Tarefas</h1>
            <p style={subtitle}>Gestão por prioridade, categoria e data limite.</p>
          </div>

          <button style={button} onClick={() => setShowTaskForm(true)}>
            + Nova tarefa
          </button>
        </header>

        {(showTaskForm || showEditTaskForm) && (
          <section style={showEditTaskForm ? editFormCard : formCard}>
            <h2 style={formTitle}>{showEditTaskForm ? "Editar Tarefa" : "Nova Tarefa"}</h2>

            <form onSubmit={showEditTaskForm ? saveTask : createTask} style={formGrid}>
              <input
                style={input}
                placeholder="Título da tarefa"
                value={showEditTaskForm ? editTaskForm.title : taskForm.title}
                onChange={(e) =>
                  showEditTaskForm
                    ? setEditTaskForm({ ...editTaskForm, title: e.target.value })
                    : setTaskForm({ ...taskForm, title: e.target.value })
                }
                required
              />

              <select
                style={input}
                value={showEditTaskForm ? editTaskForm.category : taskForm.category}
                onChange={(e) =>
                  showEditTaskForm
                    ? setEditTaskForm({ ...editTaskForm, category: e.target.value })
                    : setTaskForm({ ...taskForm, category: e.target.value })
                }
              >
                <option value="ADMINISTRATIVA">Administrativa</option>
                <option value="COMERCIAL">Comercial</option>
              </select>

              <select
                style={input}
                value={showEditTaskForm ? editTaskForm.priority : taskForm.priority}
                onChange={(e) =>
                  showEditTaskForm
                    ? setEditTaskForm({ ...editTaskForm, priority: e.target.value })
                    : setTaskForm({ ...taskForm, priority: e.target.value })
                }
              >
                <option value="NORMAL">Normal</option>
                <option value="URGENTE">Urgente</option>
                <option value="MUITO URGENTE">Muito urgente</option>
              </select>

              <input
                style={input}
                type="date"
                value={showEditTaskForm ? editTaskForm.due_date : taskForm.due_date}
                onChange={(e) =>
                  showEditTaskForm
                    ? setEditTaskForm({ ...editTaskForm, due_date: e.target.value })
                    : setTaskForm({ ...taskForm, due_date: e.target.value })
                }
              />

              <textarea
                style={textarea}
                placeholder="Descrição"
                value={showEditTaskForm ? editTaskForm.description : taskForm.description}
                onChange={(e) =>
                  showEditTaskForm
                    ? setEditTaskForm({ ...editTaskForm, description: e.target.value })
                    : setTaskForm({ ...taskForm, description: e.target.value })
                }
              />

              <div style={formButtons}>
                <button type="submit" style={button}>
                  {showEditTaskForm ? "Guardar alterações" : "Guardar tarefa"}
                </button>

                <button
                  type="button"
                  style={cancelButton}
                  onClick={() => {
                    setShowTaskForm(false);
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
          <StatCard title="Abertas" value={openTasks.length} color="#2563eb" icon="📋" />
          <StatCard title="Atrasadas" value={overdueTasks.length} color="#dc2626" icon="⏰" />
          <StatCard title="Urgentes" value={urgentTasks.length + veryUrgentTasks.length} color="#f59e0b" icon="❗" />
          <StatCard title="Hoje" value={todayTasks.length} color="#16a34a" icon="📅" />
          <StatCard title="Concluídas" value={completedTasks.length} color="#7c3aed" icon="✅" />
        </section>

        <section style={workArea}>
          <div style={leftColumn}>
            <section style={urgentSection}>
              <div style={sectionTop}>
                <h2 style={urgentTitle}>🔥 Fazer Agora ({doNowTasks.length})</h2>
                <button type="button" style={ghostButton} onClick={() => setPriorityFilter("TODAS")}>
                  Ver todas →
                </button>
              </div>

              {doNowTasks.length === 0 ? (
                <p style={muted}>Sem tarefas urgentes.</p>
              ) : (
                <div style={urgentGrid}>
                  {doNowTasks.slice(0, 3).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      selected={selectedId === task.id}
                      compact
                      onOpen={() => setSelectedId(task.id)}
                      editTask={editTask}
                      completeTask={completeTask}
                    />
                  ))}
                </div>
              )}
            </section>

            <section style={nextSection}>
              <div style={sectionTop}>
                <h2 style={sectionTitle}>📅 Próximas Tarefas ({nextTasks.length})</h2>
                <button type="button" style={ghostButton} onClick={() => setSelectedId(nextTasks[0]?.id || null)}>
                  Ver detalhe →
                </button>
              </div>

              {nextTasks.length === 0 ? (
                <p style={muted}>Sem próximas tarefas.</p>
              ) : (
                <div style={tableWrap}>
                  <table style={table}>
                    <thead>
                      <tr>
                        <th style={th}>Data limite</th>
                        <th style={th}>Tarefa</th>
                        <th style={th}>Cliente</th>
                        <th style={th}>Categoria</th>
                        <th style={th}>Prioridade</th>
                        <th style={th}>Estado</th>
                        <th style={th}>Abrir</th>
                      </tr>
                    </thead>

                    <tbody>
                      {nextTasks.slice(0, 8).map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          selected={selectedId === task.id}
                          onOpen={() => setSelectedId(task.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section style={allSection}>
              <div style={sectionTop}>
                <h2 style={sectionTitle}>{filteredTitle}: {filteredTasks.length}</h2>
              </div>

              <div style={filters}>
                <input
                  style={searchInput}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar tarefa, cliente, NIF, telefone, descrição..."
                />

                <select style={filterSelect} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="TODAS">Todas as categorias</option>
                  <option value="ADMINISTRATIVA">Administrativas</option>
                  <option value="COMERCIAL">Comerciais</option>
                  <option value="SEM CATEGORIA">Sem categoria</option>
                </select>

                <select style={filterSelect} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                  <option value="TODAS">Todas as prioridades</option>
                  <option value="NORMAL">Normais</option>
                  <option value="URGENTE">Urgentes</option>
                  <option value="MUITO URGENTE">Muito urgentes</option>
                </select>

                <button type="button" style={clearButton} onClick={() => {
                  setSearch("");
                  setCategoryFilter("TODAS");
                  setPriorityFilter("TODAS");
                }}>
                  Limpar
                </button>
              </div>

              {filteredTasks.length === 0 ? (
                <p style={muted}>Sem tarefas nesta seleção.</p>
              ) : (
                <div style={taskListGrid}>
                  {filteredTasks.slice(0, 10).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      selected={selectedId === task.id}
                      onOpen={() => setSelectedId(task.id)}
                      editTask={editTask}
                      completeTask={completeTask}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          <div style={rightColumn}>
            {selectedTask ? (
              <TaskDetail task={selectedTask} editTask={editTask} completeTask={completeTask} />
            ) : (
              <div style={emptyDetail}>
                <h2>Detalhe da Tarefa</h2>
                <p>Seleciona uma tarefa para ver o detalhe completo.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ title, value, color, icon }) {
  return (
    <div style={statCard}>
      <div style={{ ...statIcon, color, background: `${color}18` }}>{icon}</div>
      <div>
        <p style={cardLabel}>{title}</p>
        <h2 style={{ ...cardValue, color }}>{value}</h2>
      </div>
    </div>
  );
}

function TaskRow({ task, selected, onOpen }) {
  const timing = taskTiming(task);
  const priority = normalizePriority(task.priority);
  const category = normalizeCategory(task.category);
  const clientName = getClientName(task);

  return (
    <tr style={selected ? selectedRow : tr}>
      <td style={td}>
        <strong>{formatDate(task.due_date)}</strong>
      </td>

      <td style={td}>{task.title || "Sem título"}</td>

      <td style={td}>
        {clientName ? (
          <div>
            <strong>{clientName}</strong>
            <div style={smallMuted}>Cliente da carteira</div>
          </div>
        ) : (
          "Tarefa geral"
        )}
      </td>

      <td style={td}>
        <span style={{ ...miniBadge, ...categoryStyle(category) }}>{category}</span>
      </td>

      <td style={td}>
        <span style={{ ...miniBadge, ...priorityStyle(priority) }}>{priority}</span>
      </td>

      <td style={td}>
        <span style={{ ...miniBadge, color: timing.color, background: timing.background }}>
          {timing.label}
        </span>
      </td>

      <td style={td}>
        <button style={openIconButton} onClick={onOpen}>›</button>
      </td>
    </tr>
  );
}

function TaskCard({ task, selected, compact = false, onOpen, editTask, completeTask }) {
  const priority = normalizePriority(task.priority);
  const category = normalizeCategory(task.category);
  const timing = taskTiming(task);
  const clientName = getClientName(task);
  const clientNif = getClientNif(task);
  const clientPhone = getClientPhone(task);

  return (
    <div style={{ ...taskCard, ...(selected ? selectedCard : {}) }}>
      <div style={taskTop}>
        <button type="button" style={taskTitleButton} onClick={onOpen}>
          {task.title || "Sem título"}
        </button>

        <div style={badgeRow}>
          <span style={{ ...miniBadge, ...priorityStyle(priority) }}>{priority}</span>
          <span style={{ ...miniBadge, ...categoryStyle(category) }}>{category}</span>
        </div>
      </div>

      <div style={taskMetaGrid}>
        <InfoLine icon="📅" label="Data limite" value={formatDate(task.due_date)} />
        <InfoLine icon="📌" label="Estado" value={task.status || "aberta"} />
      </div>

      {clientName ? (
        <div style={clientBox}>
          <div style={clientTop}>
            <span style={avatar}>{getInitials(clientName)}</span>
            <div>
              <strong>Cliente da carteira</strong>
              <div>{clientName}</div>
            </div>
          </div>

          <div style={clientData}>
            <span>NIF: {clientNif || "-"}</span>
            <span>Telefone: {clientPhone || "-"}</span>
          </div>
        </div>
      ) : (
        <div style={generalTaskBox}>Tarefa geral sem cliente associado</div>
      )}

      {!compact && task.description && (
        <p style={description}>{task.description}</p>
      )}

      {task.policies && (
        <div style={policyBox}>
          Apólice: {task.policies.policy_number || "-"} · {task.policies.branch || "-"} · {task.policies.license_plate || "-"}
        </div>
      )}

      <div style={buttonGroup}>
        {task.client_id && (
          <Link href={`/clientes/${task.client_id}`} style={smallLinkButton}>
            Abrir cliente
          </Link>
        )}

        <button style={{ ...smallButton, background: "#2563eb" }} onClick={() => editTask(task)}>
          Editar
        </button>

        <button style={{ ...smallButton, background: "#16a34a" }} onClick={() => completeTask(task.id)}>
          Concluir
        </button>
      </div>
    </div>
  );
}

function TaskDetail({ task, editTask, completeTask }) {
  const priority = normalizePriority(task.priority);
  const category = normalizeCategory(task.category);
  const timing = taskTiming(task);
  const clientName = getClientName(task);
  const clientNif = getClientNif(task);
  const clientPhone = getClientPhone(task);

  return (
    <aside style={detailPanel}>
      <h2 style={detailTitle}>Detalhe da Tarefa</h2>

      <h3 style={detailTaskTitle}>{task.title || "Sem título"}</h3>

      <div style={detailBadges}>
        <span style={{ ...miniBadge, ...priorityStyle(priority) }}>{priority}</span>
        <span style={{ ...miniBadge, ...categoryStyle(category) }}>{category}</span>
        <span style={{ ...miniBadge, color: timing.color, background: timing.background }}>{timing.label}</span>
      </div>

      <div style={detailGrid}>
        <InfoLine icon="📅" label="Data limite" value={formatDate(task.due_date)} />
        <InfoLine icon="📌" label="Estado" value={task.status || "aberta"} />
        <InfoLine icon="🕒" label="Criada em" value={formatDateTime(task.created_at)} />
      </div>

      {clientName ? (
        <div style={detailClientBox}>
          <strong>👤 Cliente da carteira</strong>
          <div style={detailClientName}>{clientName}</div>
          <div>NIF: {clientNif || "-"}</div>
          <div>Telefone: {clientPhone || "-"}</div>
        </div>
      ) : (
        <div style={generalTaskBox}>Tarefa geral sem cliente associado</div>
      )}

      {task.policies && (
        <div style={detailBlock}>
          <strong>Apólice</strong>
          <p>
            {task.policies.policy_number || "-"} · {task.policies.branch || "-"} · {task.policies.license_plate || "-"}
          </p>
        </div>
      )}

      <div style={detailBlock}>
        <strong>Descrição</strong>
        <p>{task.description || "-"}</p>
      </div>

      <div style={detailButtons}>
        {task.client_id && (
          <Link href={`/clientes/${task.client_id}`} style={fullDarkButton}>
            Abrir cliente
          </Link>
        )}

        <button style={fullBlueButton} onClick={() => editTask(task)}>
          Editar
        </button>

        <button style={fullGreenButton} onClick={() => completeTask(task.id)}>
          Concluir
        </button>
      </div>
    </aside>
  );
}

function InfoLine({ icon, label, value }) {
  return (
    <div style={infoLine}>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
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

  return {
    background: "#e5e7eb",
    color: "#374151",
  };
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
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 18,
  marginBottom: 18,
};

const title = {
  fontSize: 36,
  margin: 0,
  color: "#0f172a",
  fontWeight: 900,
  lineHeight: 1.05,
};

const subtitle = {
  color: "#475569",
  marginTop: 8,
  fontSize: 15,
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

const formCard = {
  background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
  padding: 16,
  borderRadius: 18,
  marginBottom: 16,
  border: "1px solid #bfdbfe",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const editFormCard = {
  background: "linear-gradient(135deg, #fef3c7, #fffbeb)",
  padding: 16,
  borderRadius: 18,
  marginBottom: 16,
  border: "1px solid #f59e0b",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const formTitle = {
  margin: "0 0 12px",
  fontSize: 20,
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
};

const input = {
  padding: 11,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};

const textarea = {
  padding: 11,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  minHeight: 82,
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
  gridColumn: "1 / -1",
  fontFamily: "Arial, sans-serif",
};

const formButtons = {
  display: "flex",
  gap: 10,
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

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
  marginBottom: 16,
};

const statCard = {
  background: "white",
  padding: 16,
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const statIcon = {
  width: 48,
  height: 48,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  fontSize: 22,
};

const cardLabel = {
  color: "#334155",
  margin: 0,
  fontWeight: 800,
  fontSize: 14,
};

const cardValue = {
  margin: "4px 0 0",
  fontSize: 31,
  lineHeight: 1,
};

const workArea = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 330px",
  gap: 16,
  alignItems: "start",
};

const leftColumn = {
  display: "grid",
  gap: 16,
};

const rightColumn = {
  position: "sticky",
  top: 16,
};

const urgentSection = {
  background: "linear-gradient(135deg, #fff7ed, #fee2e2)",
  padding: 16,
  borderRadius: 18,
  border: "1px solid #fecaca",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const nextSection = {
  background: "white",
  padding: 16,
  borderRadius: 18,
  border: "1px solid #bfdbfe",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const allSection = {
  background: "white",
  padding: 16,
  borderRadius: 18,
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const sectionTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
};

const urgentTitle = {
  margin: 0,
  color: "#9a3412",
  fontSize: 20,
  fontWeight: 900,
};

const sectionTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: 20,
  fontWeight: 900,
};

const ghostButton = {
  background: "transparent",
  color: "#2563eb",
  border: "none",
  cursor: "pointer",
  fontWeight: 800,
};

const urgentGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: 12,
};

const taskListGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 12,
};

const taskCard = {
  background: "#f8fafc",
  padding: 14,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
};

const selectedCard = {
  outline: "3px solid #16a34a",
  background: "#f0fdf4",
};

const taskTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
  marginBottom: 10,
};

const taskTitleButton = {
  border: "none",
  background: "transparent",
  padding: 0,
  textAlign: "left",
  cursor: "pointer",
  fontWeight: 900,
  fontSize: 17,
  color: "#0f172a",
  lineHeight: 1.2,
};

const badgeRow = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const miniBadge = {
  padding: "5px 9px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
  whiteSpace: "nowrap",
};

const taskMetaGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
  marginBottom: 10,
};

const infoLine = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#475569",
  fontSize: 13,
};

const clientBox = {
  background: "white",
  border: "1px solid #bbf7d0",
  padding: 10,
  borderRadius: 12,
  marginBottom: 10,
};

const clientTop = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "#166534",
  marginBottom: 8,
};

const avatar = {
  width: 34,
  height: 34,
  minWidth: 34,
  borderRadius: 999,
  background: "#dcfce7",
  color: "#15803d",
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
};

const clientData = {
  display: "grid",
  gap: 3,
  color: "#334155",
  fontSize: 13,
};

const generalTaskBox = {
  background: "#f1f5f9",
  color: "#64748b",
  padding: 10,
  borderRadius: 12,
  marginBottom: 10,
  fontWeight: 700,
};

const description = {
  color: "#334155",
  fontSize: 14,
  lineHeight: 1.35,
  margin: "8px 0",
};

const policyBox = {
  background: "#eff6ff",
  color: "#1d4ed8",
  padding: 9,
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 10,
};

const buttonGroup = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 10,
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

const tableWrap = {
  overflowX: "auto",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const th = {
  textAlign: "left",
  color: "#475569",
  padding: "9px 8px",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const tr = {
  background: "white",
};

const selectedRow = {
  background: "#f0fdf4",
};

const td = {
  padding: "9px 8px",
  borderBottom: "1px solid #e5e7eb",
  verticalAlign: "middle",
};

const smallMuted = {
  color: "#64748b",
  fontSize: 12,
  marginTop: 3,
};

const openIconButton = {
  border: "1px solid #e5e7eb",
  background: "white",
  borderRadius: 8,
  width: 30,
  height: 30,
  cursor: "pointer",
  fontWeight: 900,
};

const filters = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 1fr) 180px 180px auto",
  gap: 10,
  marginBottom: 12,
};

const searchInput = {
  padding: 11,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 14,
};

const filterSelect = {
  padding: 11,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  background: "white",
};

const clearButton = {
  background: "white",
  color: "#334155",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "0 14px",
  cursor: "pointer",
  fontWeight: 800,
};

const detailPanel = {
  background: "white",
  borderRadius: 18,
  padding: 16,
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
};

const emptyDetail = {
  background: "white",
  borderRadius: 18,
  padding: 18,
  border: "1px solid #e5e7eb",
  color: "#64748b",
};

const detailTitle = {
  margin: "0 0 14px",
  color: "#0f172a",
  fontSize: 20,
};

const detailTaskTitle = {
  margin: "0 0 10px",
  fontSize: 20,
  color: "#0f172a",
};

const detailBadges = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 14,
};

const detailGrid = {
  display: "grid",
  gap: 10,
  marginBottom: 14,
};

const detailClientBox = {
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  padding: 12,
  borderRadius: 12,
  color: "#166534",
  marginBottom: 12,
  display: "grid",
  gap: 4,
};

const detailClientName = {
  color: "#0f172a",
  fontWeight: 900,
  fontSize: 16,
};

const detailBlock = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  marginBottom: 12,
};

const detailButtons = {
  display: "grid",
  gap: 9,
};

const fullDarkButton = {
  background: "#111827",
  color: "white",
  border: "none",
  padding: "12px 14px",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: "bold",
  textAlign: "center",
};

const fullBlueButton = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "12px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const fullGreenButton = {
  background: "#16a34a",
  color: "white",
  border: "none",
  padding: "12px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const muted = {
  color: "#64748b",
};
