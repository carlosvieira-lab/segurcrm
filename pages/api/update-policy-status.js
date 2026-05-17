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

  const { policy_id, status } = req.body;

  const updateData = {
    status,
  };

  if (status === "anulada") {
    updateData.cancelled_at = new Date().toISOString().split("T")[0];
  }

  if (status === "ativa") {
    updateData.cancelled_at = null;
  }

  const { error } = await supabase
    .from("policies")
    .update(updateData)
    .eq("id", policy_id);

  if (error) {
    return res.status(400).json({
      error: error.message,
    });
  }

  return res.status(200).json({
    success: true,
  });
}
