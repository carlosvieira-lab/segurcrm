import { useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState(
    "carlos.vieira@lojasegurostrajouce.com"
  );

  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    setLoading(true);

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/");
  }

  async function createUser() {
    if (!email || !password) {
      alert("Preenche email e password.");
      return;
    }

    const { error } =
      await supabase.auth.signUp({
        email,
        password,
      });

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      "Utilizador criado. Confirma o email antes de entrar."
    );
  }

  async function recoverPassword() {
    if (!email) {
      alert(
        "Escreve primeiro o teu email."
      );
      return;
    }

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo:
            window.location.origin +
            "/login",
        }
      );

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      "Email de recuperação enviado."
    );
  }

  return (
    <div style={page}>
      <form
        style={card}
        onSubmit={handleLogin}
      >
        <h1 style={title}>
          SegurCRM
        </h1>

        <p style={subtitle}>
          Login seguro
        </p>

        <input
          style={input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
        />

        <div style={passwordBox}>
          <input
            style={passwordInput}
            type={
              showPassword
                ? "text"
                : "password"
            }
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
          />

          <button
            type="button"
            style={eyeButton}
            onClick={() =>
              setShowPassword(
                !showPassword
              )
            }
          >
            {showPassword
              ? "🙈"
              : "👁️"}
          </button>
        </div>

        <button
          style={button}
          disabled={loading}
        >
          {loading
            ? "A entrar..."
            : "Entrar"}
        </button>

        <button
          type="button"
          style={secondaryButton}
          onClick={createUser}
        >
          Criar utilizador
        </button>

        <button
          type="button"
          style={linkButton}
          onClick={recoverPassword}
        >
          Recuperar password
        </button>
      </form>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#111827",
  fontFamily:
    "Arial, sans-serif",
};

const card = {
  background: "white",
  padding: 40,
  borderRadius: 20,
  width: 380,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const title = {
  margin: 0,
  fontSize: 38,
};

const subtitle = {
  color: "#6b7280",
  marginBottom: 10,
};

const input = {
  padding: 14,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 16,
};

const passwordBox = {
  display: "flex",
  alignItems: "center",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  overflow: "hidden",
};

const passwordInput = {
  flex: 1,
  padding: 14,
  border: "none",
  fontSize: 16,
  outline: "none",
};

const eyeButton = {
  width: 54,
  height: "100%",
  border: "none",
  background: "#f3f4f6",
  cursor: "pointer",
  fontSize: 18,
};

const button = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: 14,
  borderRadius: 10,
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: 16,
};

const secondaryButton = {
  background: "#111827",
  color: "white",
  border: "none",
  padding: 14,
  borderRadius: 10,
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: 16,
};

const linkButton = {
  background: "transparent",
  color: "#2563eb",
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: 15,
};
