import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

function textoInclui(texto, palavras) {
  const t = texto.toLowerCase();
  return palavras.some((p) => t.includes(p));
}

function linhaTemSeguroAuto(linha) {
  const texto = JSON.stringify(linha).toLowerCase();

  return (
    texto.includes("auto") ||
    texto.includes("automovel") ||
    texto.includes("automóvel") ||
    texto.includes("carro") ||
    texto.includes("veiculo") ||
    texto.includes("veículo")
  );
}

export default async function handler(req, res) {
  try {
    const message = req.query.message;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Mensagem não enviada",
      });
    }

    const pergunta = message.toLowerCase();

    // 1. QUANTOS CLIENTES TENHO
    if (
      textoInclui(pergunta, [
        "quantos clientes",
        "número de clientes",
        "numero de clientes",
        "total de clientes",
      ])
    ) {
      const { count, error } = await supabase
        .from("clientes")
        .select("*", { count: "exact", head: true });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        question: message,
        reply: `Tens ${count || 0} cliente(s) registado(s) no CRM.`,
      });
    }

    // 2. QUANTAS APÓLICES TENHO
    if (
      textoInclui(pergunta, [
        "quantas apólices",
        "quantas apolices",
        "total de apólices",
        "total de apolices",
      ])
    ) {
      const { count, error } = await supabase
        .from("apolices")
        .select("*", { count: "exact", head: true });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        question: message,
        reply: `Tens ${count || 0} apólice(s) registada(s) no CRM.`,
      });
    }

    // 3. CLIENTES COM SEGURO AUTOMÓVEL
    if (
      textoInclui(pergunta, [
        "seguro automóvel",
        "seguro automovel",
        "seguro auto",
        "clientes com auto",
        "clientes auto",
      ])
    ) {
      const { data, error } = await supabase.from("apolices").select("*");

      if (error) throw error;

      const apolicesAuto = (data || []).filter(linhaTemSeguroAuto);

      const clientesUnicos = new Set();

      apolicesAuto.forEach((apolice) => {
        const idCliente =
          apolice.cliente_id ||
          apolice.client_id ||
          apolice.clienteId ||
          apolice.cliente ||
          apolice.nif ||
          apolice.nome_cliente;

        if (idCliente) clientesUnicos.add(idCliente);
      });

      return res.status(200).json({
        success: true,
        question: message,
        reply: `Encontrei ${clientesUnicos.size} cliente(s) com seguro automóvel e ${apolicesAuto.length} apólice(s) automóvel no CRM.`,
      });
    }

    // 4. RENOVAÇÕES
    if (
      textoInclui(pergunta, [
        "renovações",
        "renovacoes",
        "renovar",
        "renovação",
        "renovacao",
      ])
    ) {
      const { count, error } = await supabase
        .from("renovacoes")
        .select("*", { count: "exact", head: true });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        question: message,
        reply: `Tens ${count || 0} renovação(ões) registada(s) no CRM.`,
      });
    }

    // 5. TAREFAS
    if (textoInclui(pergunta, ["tarefas", "pendências", "pendencias"])) {
      const { count, error } = await supabase
        .from("tarefas")
        .select("*", { count: "exact", head: true });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        question: message,
        reply: `Tens ${count || 0} tarefa(s) registada(s) no CRM.`,
      });
    }

    // FALLBACK IA NORMAL
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
              "És um assistente do CRM da Loja de Seguros de Trajouce. Responde em português de Portugal, de forma curta, prática e profissional.",
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
        error: data.error?.message || "Erro OpenAI",
      });
    }

    return res.status(200).json({
      success: true,
      question: message,
      reply: data.choices[0].message.content,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
