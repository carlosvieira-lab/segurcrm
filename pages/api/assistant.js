import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function inclui(texto, palavras) {
  const t = String(texto || "").toLowerCase();
  return palavras.some((p) => t.includes(p));
}

export default async function handler(req, res) {
  try {
    const message = req.query.message || "";

    if (!message) {
      return res.status(400).json({
        success: false,
        reply: "Mensagem não enviada.",
      });
    }

    const pergunta = message.toLowerCase();

    if (inclui(pergunta, ["clientes", "cliente"])) {
      const { count, error } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        reply: `Tens ${count || 0} cliente(s) registado(s) no CRM.`,
      });
    }

    if (inclui(pergunta, ["apólices", "apolices", "apólice", "apolice"])) {
      const { count, error } = await supabase
        .from("policies")
        .select("*", { count: "exact", head: true });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        reply: `Tens ${count || 0} apólice(s) registada(s) no CRM.`,
      });
    }

    if (inclui(pergunta, ["tarefas", "tarefa"])) {
      const { count, error } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        reply: `Tens ${count || 0} tarefa(s) registada(s) no CRM.`,
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "És o assistente inteligente do SegurCRM da Loja de Seguros de Trajouce. Responde em português de Portugal, de forma curta e prática.",
          },
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        reply: data?.error?.message || "Erro na OpenAI.",
      });
    }

    return res.status(200).json({
      success: true,
      reply: data.choices?.[0]?.message?.content || "Sem resposta da IA.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      reply: "Erro na ligação à IA.",
      error: error.message,
    });
  }
}
