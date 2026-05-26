export default async function handler(req, res) {
  try {
    const message = req.query.message || "Olá";

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
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
                "És um assistente IA de um CRM segurador. Responde em português de Portugal, de forma curta e útil.",
            },

            {
              role: "user",
              content: message,
            },
          ],

          temperature: 0.3,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        error: data?.error?.message || "Erro OpenAI",
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
