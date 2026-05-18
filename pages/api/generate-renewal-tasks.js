import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

function daysUntil(date) {
  if (!date) return null;

  const today = new Date();
  const target = new Date(date);

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diff = target.getTime() - today.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { data: policies, error } = await supabase
    .from("policies")
    .select(`
      *,
      clients(name, phone)
    `)
    .neq("status", "anulada");

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  let created = 0;

  for (const policy of policies || []) {
    const days = daysUntil(policy.renewal_date);

    if (days === null) continue;
    if (days > 30) continue;
    if (days < 0) continue;

    const { data: existingTask } = await supabase
      .from("tasks")
      .select("id")
      .eq("policy_id", policy.id)
      .eq("origin", "automática - renovação")
      .maybeSingle();

    if (existingTask) continue;

    let priority = "NORMAL";

    if (days <= 15) priority = "URGENTE";
    if (days <= 7) priority = "MUITO URGENTE";

    const { error: taskError } = await supabase.from("tasks").insert({
      client_id: policy.client_id || null,
      policy_id: policy.id,
      title: `Renovação da apólice ${policy.policy_number || ""}`.trim(),
      category: "renovação",
      priority,
      status: "aberta",
      due_date: policy.renewal_date,
      origin: "automática - renovação",
      description: `Renovação da apólice ${
        policy.policy_number || "-"
      } do cliente ${policy.clients?.name || "-"}. Faltam ${days} dias.`,
    });

    if (!taskError) created++;
  }

  return res.status(200).json({
    success: true,
    created,
  });
}
