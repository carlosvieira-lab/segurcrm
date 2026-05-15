import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "A_TUA_CHAVE";

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
    } = req.body;

    const renewal = new Date(renewal_date);

    let nextDueDate = renewal;

    if (payment_frequency === "mensal") {
      nextDueDate = new Date(renewal);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }

    if (payment_frequency === "trimestral") {
      nextDueDate = new Date(renewal);
      nextDueDate.setMonth(nextDueDate.getMonth() + 3);
    }

    if (payment_frequency === "semestral") {
      nextDueDate = new Date(renewal);
      nextDueDate.setMonth(nextDueDate.getMonth() + 6);
    }

    if (payment_frequency === "anual") {
      nextDueDate = new Date(renewal);
      nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
    }

    const { data, error } = await supabase
      .from("policies")
      .insert([
        {
          client_id,
          policy_number,
          branch,
          insurer_name,
          annual_premium,
          payment_frequency,
          renewal_date,
          next_due_date: nextDueDate.toISOString().split("T")[0],
          status: "ativa",
        },
      ])
      .select();

    if (error) {
      return res.status(500).json({
        error: error.message,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
}

