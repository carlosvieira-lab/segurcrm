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
  const { data: policies } = await supabase
    .from("policies")
    .select(`
      *,
      insurers(name)
    `);

  const { data: claims } = await supabase
    .from("claims")
    .select("*");

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*");

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("*");

  return {
    props: {
      policies: policies || [],
      claims: claims || [],
      tasks: tasks || [],
      opportunities: opportunities || [],
    },
  };
}

function formatEuro(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

export default function Dashboard({
  policies,
  claims,
  tasks,
  opportunities,
}) {
  const activePolicies = policies.filter(
    (p) => p.status !== "anulada"
  );

  const cancelledPolicies = policies.filter(
    (p) => p.status === "anulada"
  );

  const openClaims = claims.filter(
   
