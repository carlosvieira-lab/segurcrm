import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

function inclui(texto, palavras) {
  const t = String(texto || "").toLowerCase();
  return palavras.some((p) => t.includes(p));
}

export default async function handler(req, res) {
  try {
    const message = req.query.message || "";

    if (!message) {
      return res.status(200).json({
        success: false,
        reply: "Escreve uma pergunta para o assistente.",
      });
    }

    const pergunta = message.toLowerCase();

    // CLIENTES
    if (inclui(pergunta, ["clientes", "cliente"])) {
      const { count, error } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });

      if (error) {
        return res.status(200).json({
          success: false,
          reply: "Erro ao consultar clientes: " + error.message,
        });
      }

      return res.status(200).json({
        success: true,
        reply: `Tens ${count || 0} cliente(s) registado(s) no CRM.`,
      });
    }

    // APÓLICES
    if (inclui(pergunta, ["apólices", "apolices", "apólice", "apolice"])) {
      const { count, error } = await supabase
        .from("policies")
        .select("*", { count: "exact", head: true });

      if (error) {
        return res.status(200).json({
          success: false,
          reply: "Erro ao consultar apólices: " + error.message,
        });
      }

      return res.status(200).json({
        success: true,
        reply: `Tens ${count || 0} apólice(s) registada(s) no CRM.`,
      });
    }

    // TAREFAS
    if (inclui(pergunta, ["tarefas", "tarefa"])) {
      const { count, error } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true });

      if (error) {
        return res.status(200).json({
          success: false,
          reply: "Erro ao consultar tarefas: " + error.message,
        });
      }

      return res.status(200).json({
        success: true,
        reply: `Tens ${count || 0} tarefa(s) registada(s) no CRM.`,
      });
    }

    // RESPOSTA DEFAULT
    return res.status(200).json({
      success: true,
      reply:
        "Ainda não sei responder a essa pergunta com dados do CRM. Para já posso consultar clientes, apólices e tarefas.",
    });
  } catch (error) {
    return res.status(200).json({
      success: false,
      reply: "Erro interno no assistente: " + error.message,
    });
  }
}
