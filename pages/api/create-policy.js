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
    return res.status(405).json({
      error: "Método não permitido",
    });
  }

  const {
    client_id,
    policy_number,
    branch,
    insurer_name,
    annual_premium,
    commission_per_payment,
    payment_frequency,
    start_date,
    renewal_date,
    last_payment_date,
    next_payment_date,
  } = req.body;

  const cleanInsurerName =
    insurer_name?.trim();

  let insurer_id = null;

  if (cleanInsurerName) {
    let {
      data: existingInsurer,
    } = await supabase
      .from("insurers")
      .select("id")
      .eq("name", cleanInsurerName)
      .maybeSingle();

    if (!existingInsurer) {
      const {
        data: newInsurer,
        error: insurerError,
      } = await supabase
        .from("insurers")
        .insert({
          name: cleanInsurerName,
        })
        .select("id")
        .single();

      if (insurerError) {
        const {
          data: fallbackInsurer,
        } = await supabase
          .from("insurers")
          .select("id")
          .eq("name", cleanInsurerName)
          .maybeSingle();

        if (!fallbackInsurer) {
          return res.status(400).json({
            error:
              insurerError.message,
          });
        }

        existingInsurer =
          fallbackInsurer;
      } else {
        existingInsurer =
          newInsurer;
      }
    }

    insurer_id =
      existingInsurer.id;
  }

  const { error } = await supabase
    .from("policies")
    .insert({
      client_id,
      policy_number,
      branch,
      license_plate,
      insurer_id,

      annual_premium:
        annual_premium
          ? String(
              annual_premium
            ).replace(",", ".")
          : null,

      commission_per_payment:
        commission_per_payment
          ? String(
              commission_per_payment
            ).replace(",", ".")
          : null,

      payment_frequency:
        payment_frequency ||
        "anual",

      start_date:
        start_date ||
        renewal_date ||
        null,

      renewal_date:
        renewal_date || null,

      last_payment_date:
        last_payment_date ||
        null,

      next_payment_date:
        next_payment_date ||
        null,

      status: "ativa",

      cancelled_at: null,
    });

  if (error) {
    return res.status(400).json({
      error: error.message,
    });
  }

  return res.status(200).json({
    success: true,
  });
}
