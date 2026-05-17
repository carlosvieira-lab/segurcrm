import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const {
    client_id,
    policy_number,
    branch,
    insurer_name,
    annual_premium,
    payment_frequency,
    start_date,
    renewal_date,
    last_payment_date,
    next_payment_date,
  } = req.body;

  const cleanInsurerName = insurer_name?.trim();

  let insurer_id = null;

  if (cleanInsurerName) {
    const { data: existingInsurer } = await supabase
      .from("insurers")
      .select("*")
      .ilike("name", cleanInsurerName)
      .maybeSingle();

    if (existingInsurer) {
      insurer_id = existingInsurer.id;
    } else {
      const { data: newInsurer, error: insurerError } = await supabase
        .from("insurers")
        .insert({ name: cleanInsurerName })
        .select()
        .single();

      if (insurerError) {
        return res.status(400).json({ error: insurerError.message });
      }

      insurer_id = newInsurer.id;
    }
  }

  const { error } = await supabase.from("policies").insert({
    client_id,
    policy_number,
    branch,
    insurer_id,
    annual_premium: annual_premium || null,
    payment_frequency: payment_frequency || "anual",
    start_date: start_date || renewal_date || null,
    renewal_date: renewal_date || null,
    last_payment_date: last_payment_date || null,
    next_payment_date: next_payment_date || null,
    status: "ativa",
    cancelled_at: null,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
}
