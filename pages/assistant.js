import { useState } from "react";

export default function AssistantPage() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  async function askAssistant() {
    if (!message.trim()) return;

    setLoading(true);
    setReply("");

    try {
      const res = await fetch(
        `/api/assistant?message=${encodeURIComponent(message)}`
      );

      const data = await res.json();

      if (data.reply) {
        setReply(data.reply);
      } else {
        setReply("Erro ao obter resposta.");
      }
    } catch (err) {
      setReply("Erro na ligação à IA.");
    }

    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: 40,
        fontFamily: "Arial",
      }}
    >
      {/* BOTÃO VOLTAR */}
      <button
        onClick={() => (window.location.href = "/")}
        style={{
          marginBottom: 25,
          background: "#2563eb",
          color: "white",
          border: "none",
          padding: "12px 18px",
          borderRadius: 10,
          cursor: "pointer",
          fontWeight: "bold",
          fontSize: 16,
        }}
      >
        ← Voltar ao Dashboard
      </button>

      <h1
        style={{
          fontSize: 48,
          marginBottom: 30,
        }}
      >
        Assistente IA
      </h1>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Escreve aqui..."
        style={{
          width: "100%",
          maxWidth: 900,
          height: 220,
          padding: 20,
          borderRadius: 12,
          border: "1px solid #d1d5db",
          fontSize: 18,
          resize: "none",
          background: "white",
        }}
      />

      <br />

      <button
        onClick={askAssistant}
        disabled={loading}
        style={{
          marginTop: 20,
          background: "#111827",
          color: "white",
          border: "none",
          padding: "14px 24px",
          borderRadius: 10,
          cursor: "pointer",
          fontWeight: "bold",
          fontSize: 16,
        }}
      >
        {loading ? "A pensar..." : "Perguntar"}
      </button>

      {reply && (
        <div
          style={{
            marginTop: 30,
            background: "white",
            padding: 25,
            borderRadius: 14,
            maxWidth: 900,
            border: "1px solid #e5e7eb",
            lineHeight: 1.7,
            fontSize: 18,
            whiteSpace: "pre-wrap",
          }}
        >
          <strong>Resposta IA:</strong>
          <br />
          <br />
          {reply}
        </div>
      )}
    </div>
  );
}
