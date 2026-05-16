import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

function addMonths(dateString, months) {
  const date = new Date(dateString);

  date.setMonth(date.getMonth() + months);

  return date.toISOString().split("T")[0];
}

function calculateNextPayment(currentDate, frequency) {
  if (frequency === "mensal") {
    return addMonths(currentDate, 1);
  }

  if (frequency === "trimestral") {
    return addMonths(currentDate, 3);
  }

  if (frequency === "semestral") {
    return addMonths(currentDate, 6);
  }

  return addMonths(currentDate, 12);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido",
    });
  }

  try {
    const { policy_id } = req.body;

    const { data: policy, error: fetchError } = await supabase
      .from("policies")
      .select("*")
      .eq("id", policy_id)
      .single();

    if (fetchError || !policy) {
      return res.status(404).json({
        error: "Apólice não encontrada",
      });
    }

    const paymentDate =
      policy.next_payment_date ||
      new Date().toISOString().split("T")[0];

    const newNextPayment = calculateNextPayment(
      paymentDate,
      policy.payment_frequency
    );

    const { data, error } = await supabase
      .from("policies")
      .update({
        last_payment_date: paymentDate,
        next_payment_date: newNextPayment,
      })
      .eq("id", policy_id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: error.message,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      error: "Erro interno",
    });
  }
}
