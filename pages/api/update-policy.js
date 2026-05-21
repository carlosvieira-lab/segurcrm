import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function cleanNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  return Number(String(value).replace(",", "."));
}

function cleanDate(value) {
  return value === "" ? null : value;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const {
      policy_id,
      policy_number,
      branch,
      license_plate,
      insurer_name,
      annual_premium,
      commission_per_payment,
      payment_frequency,
      start_date,
      renewal_date,
      last_payment_date,
    } = req.body;

    if (!policy_id) {
      return res.status(400).json({ error: "ID da apólice em falta" });
    }

    let insurerId = null;

    if (insurer_name) {
      const { data: insurer, error: insurerError } = await supabase
        .from("insurers")
        .select("id")
        .eq("name", insurer_name)
        .maybeSingle();

      if (insurerError) {
        return res.status(500).json({ error: insurerError.message });
      }

      insurerId = insurer?.id || null;
    }

    const updateData = {
      policy_number,
      branch,
      license_plate,
      annual_premium: cleanNumber(annual_premium),
      commission_per_payment: cleanNumber(commission_per_payment),
      payment_frequency,
      start_date: cleanDate(start_date),
      renewal_date: cleanDate(renewal_date),
      last_payment_date: cleanDate(last_payment_date),
    };

    if (insurerId) {
      updateData.insurer_id = insurerId;
    }

    const { data, error } = await supabase
      .from("policies")
      .update(updateData)
      .eq("id", policy_id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      policy: data,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "Erro ao atualizar apólice",
    });
  }
}
