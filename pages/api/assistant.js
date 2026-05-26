import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const { message } = req.query;

    // CLIENTES
    if (message.toLowerCase().includes("clientes")) {
      const { count } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });

      return res.status(200).json({
        reply: `Tem ${count} clientes no CRM.`,
      });
    }

    // APÓLICES
    if (message.toLowerCase().includes("apólices")) {
      const { count } = await supabase
        .from("policies")
        .select("*", { count: "exact", head: true });

      return res.status(200).json({
        reply: `Tem ${count} apólices registadas.`,
      });
    }

    // TAREFAS
    if (message.toLowerCase().includes("tarefas")) {
      const { count } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true });

      return res.status(200).json({
        reply: `Tem ${count} tarefas no CRM.`,
      });
    }

    // OPENAI NORMAL
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "És o assistente inteligente do SegurCRM da Loja de Seguros de Trajouce.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    return res.status(200).json({
      reply: completion.choices[0].message.content,
    });
  } catch (error) {
    return res.status(500).json({
      reply: "Erro na ligação à IA.",
      error: error.message,
    });
  }
}
