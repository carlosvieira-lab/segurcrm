import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function getServerSideProps() {
  const { count: clients } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true });

  const { count: policies } = await supabase
    .from("policies")
    .select("*", { count: "exact", head: true });

  const { count: tasks } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true });

  return {
    props: {
      clients: clients || 0,
      policies: policies || 0,
      tasks: tasks || 0,
    },
  };
}

export default function Home({ clients, policies, tasks }) {
  return (
    <div
      style={{
        padding: 40,
        fontFamily: "Arial",
        background: "#f3f4f6",
        minHeight: "100vh",
      }}
    >
      <h1>SegurCRM</h1>
      <p>CRM para mediação de seguros.</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 20,
          marginTop: 40,
        }}
      >
        <div
          style={{
            background: "white",
            padding: 20,
            borderRadius: 10,
          }}
        >
          <h2>Clientes</h2>
          <p>{clients}</p>
        </div>

        <div
          style={{
            background: "white",
            padding: 20,
            borderRadius: 10,
          }}
        >
          <h2>Apólices</h2>
          <p>{policies}</p>
        </div>

        <div
          style={{
            background: "white",
            padding: 20,
            borderRadius: 10,
          }}
        >
          <h2>Tarefas</h2>
          <p>{tasks}</p>
        </div>
      </div>
    </div>
  );
}
