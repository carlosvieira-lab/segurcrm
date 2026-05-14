export default function Home() {
  return (
    <main style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>SegurCRM</h1>

      <p>CRM para mediação de seguros.</p>

      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          border: "1px solid #ccc",
          borderRadius: "10px",
        }}
      >
        <h2>Clientes</h2>

        <ul>
          <li>João Silva</li>
          <li>Maria Costa</li>
          <li>Oficina Central Lda</li>
        </ul>
      </div>
    </main>
  );
