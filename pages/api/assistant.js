export default async function handler(req, res) {
  return res.status(200).json({
    env: process.env.OPENAI_API_KEY || "SEM_CHAVE",
  });
}
