import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido",
    });
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

    let insurerId = null;

    if (insurer_name) {
      const { data: insurer } = await supabase
        .from("insurers")
        .select("id")
        .ilike("name", insurer_name)
        .single();

      insurerId = insurer?.id || null;
    }

    const { error } = await supabase
      .from("policies")
      .update({
        policy_number,
        branch,
        license_plate,
        insurer_id: insurerId,
        annual_premium,
        commission_per_payment,
        payment_frequency,
        start_date,
        renewal_date,
        last_payment_date,
      })
      .eq("id", policy_id);

    if (error) {
      return res.status(500).json({
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
}
