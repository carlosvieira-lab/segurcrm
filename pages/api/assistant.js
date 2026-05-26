export default async function handler(req, res) {
  return res.status(200).json({
    allEnvKeys: Object.keys(process.env).filter((k) =>
      k.includes("OPENAI")
    ),
  });
}
