export default function Home() {
  return (
    <main style={{
      fontFamily: "Arial",
      padding: "40px",
      background: "#f5f7fb",
      minHeight: "100vh"
    }}>
      <h1 style={{ fontSize: "32px" }}>SegurCRM</h1>

      <p>CRM para mediação de seguros.</p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "20px",
        marginTop: "40px"
      }}>
        <div style={{
          background: "white",
          padding: "20px",
          borderRadius: "12px"
        }}>
          <h3>Clientes</h3>
          <p>124</p>
        </div>

        <div style={{
          background: "white",
          padding: "20px",
          borderRadius: "12px"
        }}>
          <h3>Apólices</h3>
          <p>89</p>
        </div>

        <div style={{
          background: "white",
          padding: "20px",
          borderRadius: "12px"
        }}>
          <h3>Tarefas</h3>
          <p>12</p>
        </div>
      </div>
    </main>
  );
}
