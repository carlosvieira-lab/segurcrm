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
    renewal_date,
  } = req.body;

  let insurerId = null;

  if (insurer_name) {
    const cleanInsurerName = insurer_name.trim();

    const { data: existingInsurer, error: findInsurerError } = await supabase
      .from("insurers")
      .select("id")
      .eq("name", cleanInsurerName)
      .maybeSingle();

    if (findInsurerError) {
      return res.status(500).json({ error: findInsurerError.message });
    }

    if (existingInsurer) {
      insurerId = existingInsurer.id;
    } else {
      const { data: newInsurer, error: createInsurerError } = await supabase
        .from("insurers")
        .insert({ name: cleanInsurerName })
        .select("id")
        .single();

      if (createInsurerError) {
        return res.status(500).json({ error: createInsurerError.message });
      }

      insurerId = newInsurer.id;
    }
  }

  const cleanFrequency =
    payment_frequency && payment_frequency.trim()
      ? payment_frequency.trim().toLowerCase()
      : "anual";

  const cleanRenewalDate =
    renewal_date && renewal_date.trim() ? renewal_date.trim() : null;

  const { error: createPolicyError } = await supabase.from("policies").insert({
    client_id,
    insurer_id: insurerId,
    policy_number: policy_number || null,
    branch: branch || null,
    annual_premium: Number(annual_premium || 0),
    payment_frequency: cleanFrequency,
    renewal_date: cleanRenewalDate,
    status: "ativa",
  });

  if (createPolicyError) {
    return res.status(500).json({ error: createPolicyError.message });
  }

  return res.status(200).json({ success: true });
}

