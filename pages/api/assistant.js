async function askAssistant() {
    if (!message.trim()) return;

    setLoading(true);
    setReply("");

    try {
      const res = await fetch(`/api/assistant?message=${encodeURIComponent(message)}`);
      const data = await res.json();

      if (data.success) {
        setReply(data.reply);
      } else {
        setReply(data.error || "Erro no assistente.");
      }
    } catch (error) {
      setReply("Erro ao contactar o assistente.");
    }

    setLoading(false);
  }

  return (
    <div style={{ padding: 40, fontFamily: "Arial", maxWidth: 800 }}>
      <h1>Assistente IA</h1>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Escreve aqui o que queres perguntar ao CRM..."
        style={{
          width: "100%",
          height: 120,
          padding: 12,
          fontSize: 16,
          borderRadius: 8,
          border: "1px solid #ccc",
        }}
      />

      <br />

      <button
        onClick={askAssistant}
        disabled={loading}
        style={{
          marginTop: 12,
          padding: "12px 20px",
          borderRadius: 8,
          border: "none",
          background: "#111827",
          color: "white",
          cursor: "pointer",
        }}
      >
        {loading ? "A pensar..." : "Perguntar"}
      </button>

      {reply && (
        <div
          style={{
            marginTop: 24,
            padding: 20,
            borderRadius: 8,
            background: "#f3f4f6",
            whiteSpace: "pre-wrap",
          }}
        >
          {reply}
        </div>
      )}
    </div>
  );
}
