import Link from "next/link";

export default function Sidebar({ active }) {
  return (
    <aside style={sidebar}>
      <h2 style={logo}>SegurCRM</h2>

      <nav style={nav}>
        <NavLink href="/" label="Dashboard" active={active === "dashboard"} />
        <NavLink href="/clientes" label="Clientes" active={active === "clientes"} />
        <NavLink href="/apolices" label="Apólices" active={active === "apolices"} />
        <NavLink href="/renovacoes" label="Renovações" active={active === "renovacoes"} />
        <NavLink href="/financeiro" label="Financeiro" active={active === "financeiro"} />
        <NavLink href="/tarefas" label="Tarefas" active={active === "tarefas"} />
        <NavLink href="/oportunidades" label="Oportunidades" active={active === "oportunidades"} />
        <NavLink href="/sinistros" label="Sinistros" active={active === "sinistros"} />
      </nav>
    </aside>
  );
}

function NavLink({ href, label, active }) {
  return (
    <Link href={href} style={active ? activeLink : link}>
      {label}
    </Link>
  );
}

const sidebar = {
  width: 240,
  background: "#111827",
  color: "white",
  padding: 24,
};

const logo = {
  marginBottom: 40,
};

const nav = {
  display: "grid",
  gap: 12,
};

const link = {
  color: "#cbd5e1",
  textDecoration: "none",
  padding: "12px 14px",
  borderRadius: 10,
};

const activeLink = {
  ...link,
  background: "#2563eb",
  color: "white",
};
