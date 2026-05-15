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
    renewal_date,
  } = req.body;

  let insurerId = null;

  if (insurer_name) {
    const { data: existingInsurer } = await supabase
      .from("insurers")
      .select("id")
      .eq("name", insurer_name)
      .maybeSingle();

    if (existingInsurer) {
      insurerId = existingInsurer.id;
    } else {
      const { data: newInsurer, error: insurerError } = await supabase
        .from("insurers")
        .insert({ name: insurer_name })
        .select("id")
        .single();

      if (insurerError) {
        return res.status(500).json({ error: insurerError.message });
      }

      insurerId = newInsurer.id;
    }
  }

  const { error } = await supabase.from("policies").insert({
    client_id,
    insurer_id: insurerId,
    policy_number,
    branch,
    annual_premium: Number(annual_premium || 0),
    renewal_date,
    status: "ativa",
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
}

