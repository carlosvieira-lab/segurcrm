import Link from "next/link";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

export default function Sidebar({
  active,
}) {
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();

    router.push("/login");
  }

  return (
    <aside style={sidebar}>
      <div>
        <h2 style={logo}>
          SegurCRM
        </h2>

        <nav style={nav}>
          <MenuItem
            href="/"
            label="Dashboard"
            active={
              active ===
              "dashboard"
            }
          />

          <MenuItem
            href="/clientes"
            label="Clientes"
            active={
              active ===
              "clientes"
            }
          />

          <MenuItem
            href="/sinistros"
            label="Sinistros"
            active={
              active ===
              "sinistros"
            }
          />

          <MenuItem
            href="/comissoes"
            label="Comissões"
            active={
              active ===
              "comissoes"
            }
          />

          <MenuItem
            href="/agenda"
            label="Agenda"
            active={
              active ===
              "agenda"
            }
          />
        </nav>
      </div>

      <button
        style={logoutButton}
        onClick={logout}
      >
        Sair
      </button>
    </aside>
  );
}

function MenuItem({
  href,
  label,
  active,
}) {
  return (
    <Link
      href={href}
      style={{
        ...menuItem,
        ...(active
          ? activeMenuItem
          : {}),
      }}
    >
      {label}
    </Link>
  );
}

const sidebar = {
  width: 240,
  background: "#111827",
  color: "white",
  padding: 24,
  display: "flex",
  flexDirection: "column",
  justifyContent:
    "space-between",
};

const logo = {
  marginBottom: 40,
  fontSize: 28,
};

const nav = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const menuItem = {
  color: "white",
  textDecoration: "none",
  padding: "12px 14px",
  borderRadius: 10,
  fontWeight: "bold",
};

const activeMenuItem = {
  background: "#2563eb",
};

const logoutButton = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "12px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};
