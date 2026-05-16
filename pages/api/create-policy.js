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

  try {
    const {
      client_id,
      policy_number,
      branch,
      insurer_name,
      annual_premium,
      payment_frequency,
      renewal_date,
      last_payment_date,
      next_payment_date,
    } = req.body;

    let insurer_id = null;

    if (insurer_name) {
      const { data: existingInsurer } = await supabase
        .from("insurers")
        .select("*")
        .ilike("name", insurer_name)
        .single();

      if (existingInsurer) {
        insurer_id = existingInsurer.id;
      } else {
        const { data: newInsurer } = await supabase
          .from("insurers")
          .insert([
            {
              name: insurer_name,
            },
          ])
          .select()
          .single();

        insurer_id = newInsurer.id;
      }
    }

    const { data, error } = await supabase
      .from("policies")
      .insert([
        {
          client_id,
          insurer_id,
          policy_number,
          branch,
          annual_premium,
          payment_frequency,
          renewal_date,
          last_payment_date,
          next_payment_date,
          status: "ativa",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(error);

      return res.status(500).json({
        error: error.message,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Erro interno",
    });
  }
}
