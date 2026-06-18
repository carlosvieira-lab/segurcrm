import Link from "next/link";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

export default function Sidebar({ active }) {
  const router = useRouter();

  const clientId =
    typeof router.query.id === "string"
      ? router.query.id
      : Array.isArray(router.query.id)
      ? router.query.id[0]
      : null;

  const showClientCompactButton =
    router.pathname === "/clientes/[id]" ||
    router.pathname === "/clientes/[id]/compacto";

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside style={sidebar}>
      <div>
        <h2 style={logo}>SegurCRM</h2>

        <nav style={nav}>
          <MenuItem href="/" label="Dashboard" active={active === "dashboard"} />

          <MenuItem
            href="/assistant"
            label="✨ IA"
            active={active === "assistant"}
          />

          <MenuItem
            href="/pesquisa"
            label="Pesquisa"
            active={active === "pesquisa"}
          />

          <MenuItem
            href="/clientes"
            label="Clientes"
            active={active === "clientes"}
          />

          {showClientCompactButton && clientId && (
            <MenuItem
              href={`/clientes/${clientId}/compacto`}
              label="Cliente Compacto"
              active={active === "cliente-compacto"}
            />
          )}

          <MenuItem
            href="/apolices"
            label="Apólices"
            active={active === "apolices"}
          />

          <MenuItem
            href="/renovacoes"
            label="Renovações"
            active={active === "renovacoes"}
          />

          <MenuItem
            href="/financeiro"
            label="Financeiro"
            active={active === "financeiro"}
          />

          <MenuItem
            href="/comissoes/recebimentos"
            label="Recebimentos Comissões"
            active={active === "recebimentos-comissoes"}
          />

          <MenuItem
            href="/campanhas"
            label="Campanhas"
            active={active === "campanhas"}
          />

          <MenuItem
            href="/negocios-financeiros"
            label="Negócios Financeiros"
            active={active === "negocios-financeiros"}
          />

          <MenuItem
            href="/orcamento-seguros"
            label="Orçamento Seguros"
            active={active === "orcamento-seguros"}
          />

          <MenuItem
            href="/cots-generali"
            label="COTs Generali"
            active={active === "cots-generali"}
          />

          <MenuItem
            href="/relatorios"
            label="Relatórios"
            active={active === "relatorios"}
          />

          <MenuItem
            href="/importacoes"
            label="Importações"
            active={active === "importacoes"}
          />

          <MenuItem
            href="/tarefas"
            label="Tarefas"
            active={active === "tarefas"}
          />

          <MenuItem
            href="/tarefas/compacto"
            label="Tarefas Compacto"
            active={active === "tarefas-compacto"}
          />

          <MenuItem
            href="/oportunidades"
            label="Oportunidades"
            active={active === "oportunidades"}
          />

          <MenuItem
            href="/oportunidades/compacto"
            label="Oportunidades Compacto"
            active={active === "oportunidades-compacto"}
          />

          <MenuItem
            href="/sinistros"
            label="Sinistros"
            active={active === "sinistros"}
          />
        </nav>
      </div>

      <button style={logoutButton} onClick={logout}>
        Sair
      </button>
    </aside>
  );
}

function MenuItem({ href, label, active }) {
  const isNegociosFinanceiros = href === "/negocios-financeiros";
  const isOrcamentoSeguros = href === "/orcamento-seguros";
  const isCotsGenerali = href === "/cots-generali";

  return (
    <Link
      href={href}
      style={{
        ...menuItem,
        ...(active ? activeMenuItem : {}),

        ...(isNegociosFinanceiros
          ? {
              background: "#facc15",
              color: "#000000",
            }
          : {}),

        ...(isOrcamentoSeguros
          ? {
              background: "#22c55e",
              color: "#ffffff",
            }
          : {}),

        ...(isCotsGenerali
          ? {
              background: "#ea580c",
              color: "#ffffff",
            }
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
  justifyContent: "space-between",
  minHeight: "100vh",
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
