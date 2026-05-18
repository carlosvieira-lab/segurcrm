import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

function addMonths(date, months) {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate.toISOString().split("T")[0];
}

function getNextPaymentDate(frequency) {
  const today = new Date();

  const cleanFrequency = String(frequency || "anual").toLowerCase();

  if (cleanFrequency === "mensal") return addMonths(today, 1);
  if (cleanFrequency === "trimestral") return addMonths(today, 3);
  if (cleanFrequency === "semestral") return addMonths(today, 6);

  return addMonths(today, 12);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { policy_id } = req.body;

  const { data: policy, error: policyError } = await supabase
    .from("policies")
    .select(`
      *,
      clients(name)
    `)
    .eq("id", policy_id)
    .single();

  if (policyError || !policy) {
    return res.status(400).json({
      error: policyError?.message || "Apólice não encontrada",
    });
  }

  const today = new Date().toISOString().split("T")[0];
  const nextPaymentDate = getNextPaymentDate(policy.payment_frequency);

  const { error: updateError } = await supabase
    .from("policies")
    .update({
      last_payment_date: today,
      next_payment_date: nextPaymentDate,
    })
    .eq("id", policy_id);

  if (updateError) {
    return res.status(400).json({ error: updateError.message });
  }

  await supabase.from("tasks").insert({
    client_id: policy.client_id || null,
    policy_id: policy.id,
    title: `Cobrança da apólice ${policy.policy_number || ""}`.trim(),
    category: "cobrança",
    priority: "NORMAL",
    status: "aberta",
    due_date: nextPaymentDate,
    origin: "automática - marcação de pagamento",
    description: `Próxima cobrança da apólice ${
      policy.policy_number || "-"
    } do cliente ${policy.clients?.name || "-"}.`,
  });

  return res.status(200).json({
    success: true,
    last_payment_date: today,
    next_payment_date: nextPaymentDate,
  });
}
       
