import Link from "next/link";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "../../components/Sidebar";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

const insurersList = [
  "Generali",
  "Real Vida",
  "Zurich",
  "Ageas",
  "Allianz",
];

const branchList = [
  "Automóvel",
  "Casa",
  "Saude",
  "Atcp",
  "Atco",
  "Mremp",
  "Vida",
  "Aps",
  "Financeiros",
  "Viagem",
  "Rc",
  "Outros",
];

export async function getServerSideProps({ params }) {
  const { id } = params;

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  const { data: policies } = await supabase
    .from("policies")
    .select("*, insurers(name)")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const { data: claims } = await supabase
    .from("claims")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  return {
    props: {
      client,
      policies: policies || [],
      claims: claims || [],
    },
  };
}

function formatDate(date) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("pt-PT").format(
    new Date(date)
  );
}

function calculateAge(date) {
  if (!date) return "-";

  const start = new Date(date);
  const today = new Date();

  let years =
    today.getFullYear() -
    start.getFullYear();

  const monthDiff =
    today.getMonth() -
    start.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 &&
      today.getDate() <
        start.getDate())
  ) {
    years--;
  }

  return `${years} anos`;
}

function calculateAnnualCommission(
  policy
) {
  const commission = Number(
    policy.commission_per_payment || 0
  );

  const frequency = String(
    policy.payment_frequency || "anual"
  ).toLowerCase();

  if (frequency === "mensal")
    return commission * 12;

  if (frequency === "trimestral")
    return commission * 4;

  if (frequency === "semestral")
    return commission * 2;

  return commission;
}

function clientRating(
  policies,
  totalCommission
) {
  const count = policies.length;

  if (
    count >= 5 ||
    totalCommission >= 150
  )
    return "TOP";

  if (
    count >= 4 ||
    totalCommission >= 120
  )
    return "MUITO BOM";

  if (
    count >= 3 ||
    totalCommission >= 100
  )
    return "BOM";

  if (
    count >= 2 ||
    totalCommission >= 50
  )
    return "MÉDIO";

  if (
    count >= 1 ||
    totalCommission >= 20
  )
    return "FRACO";

  return "SEM CARTEIRA";
}

function ratingStyle(rating) {
  if (rating === "TOP") {
    return {
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (rating === "MUITO BOM") {
    return {
      background: "#dbeafe",
      color: "#1d4ed8",
    };
  }

  if (rating === "BOM") {
    return {
      background: "#ede9fe",
      color: "#5b21b6",
    };
  }

  if (rating === "MÉDIO") {
    return {
      background: "#fef3c7",
      color: "#92400e",
    };
  }

  if (rating === "FRACO") {
    return {
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  return {
    background: "#f3f4f6",
    color: "#374151",
  };
}

function InfoItem({
  label,
  value,
}) {
  return (
    <div style={infoItem}>
      <span style={infoLabel}>
        {label}
      </span>

      <strong style={infoValue}>
        {value || "-"}
      </strong>
    </div>
  );
}

export default function ClientePage({
  client,
  policies,
  claims,
}) {
  const [
    showPolicyForm,
    setShowPolicyForm,
  ] = useState(false);

  const [
    policyData,
    setPolicyData,
  ] = useState({
    policy_number: "",
    branch: "Automóvel",
    license_plate: "",
    insurer_name: "Generali",
    annual_premium: "",
    commission_per_payment: "",
    payment_frequency: "Mensal",
    start_date: "",
    renewal_date: "",
    last_payment_date: "",
  });

  if (!client) {
    return (
      <div>
        Cliente não encontrado.
      </div>
    );
  }

  async function addClientInteraction() {
    const note = prompt(
      "Nova interação com o cliente"
    );

    if (!note) return;

    const now =
      new Date().toLocaleString(
        "pt-PT",
        {
          dateStyle: "short",
          timeStyle: "short",
        }
      );

    const previous =
      client.interaction_notes || "";

    const updatedNotes =
      previous
        ? `${previous}\n\n${now} - ${note}`
        : `${now} - ${note}`;

    const { error } =
      await supabase
        .from("clients")
        .update({
          interaction_notes:
            updatedNotes,
        })
        .eq("id", client.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function editClient() {
    const name = prompt(
      "Nome",
      client.name || ""
    );

    if (name === null) return;

    const phone = prompt(
      "Telefone",
      client.phone || ""
    );

    if (phone === null) return;

    const email = prompt(
      "Email",
      client.email || ""
    );

    if (email === null) return;

    const address = prompt(
      "Morada",
      client.address || ""
    );

    if (address === null) return;

    const city = prompt(
      "Cidade",
      client.city || ""
    );

    if (city === null) return;

    const iban = prompt(
      "IBAN",
      client.iban || ""
    );

    if (iban === null) return;

    const notes = prompt(
      "Observações",
      client.notes || ""
    );

    if (notes === null) return;

    const { error } =
      await supabase
        .from("clients")
        .update({
          name,
          phone,
          email,
          address,
          city,
          iban,
          notes,
        })
        .eq("id", client.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function createPolicy() {
    const response = await fetch(
      "/api/create-policy",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          client_id: client.id,
          ...policyData,
        }),
      }
    );

    if (!response.ok) {
      const error =
        await response.json();

      alert(
        error.error ||
          "Erro ao criar apólice"
      );

      return;
    }

    window.location.reload();
  }

  async function editPolicy(
    policy
  ) {
    const numero = prompt(
      "Número da Apólice",
      policy.policy_number || ""
    );

    if (numero === null) return;

    const premio = prompt(
      "Prémio anual",
      policy.annual_premium || ""
    );

    if (premio === null) return;

    const { error } =
      await supabase
        .from("policies")
        .update({
          policy_number: numero,
          annual_premium:
            premio,
        })
        .eq("id", policy.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function updatePolicyStatus(
    policyId,
    status
  ) {
    const { error } =
      await supabase
        .from("policies")
        .update({
          status,
        })
        .eq("id", policyId);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  const totalPremium =
    policies.reduce(
      (sum, policy) =>
        sum +
        Number(
          policy.annual_premium || 0
        ),
      0
    );

  const totalCommission =
    policies.reduce(
      (sum, policy) =>
        sum +
        calculateAnnualCommission(
          policy
        ),
      0
    );

  const rating = clientRating(
    policies,
    totalCommission
  );

  const currentRatingStyle =
    ratingStyle(rating);
  import Link from "next/link";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "../../components/Sidebar";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

const insurersList = [
  "Generali",
  "Real Vida",
  "Zurich",
  "Ageas",
  "Allianz",
];

const branchList = [
  "Automóvel",
  "Casa",
  "Saude",
  "Atcp",
  "Atco",
  "Mremp",
  "Vida",
  "Aps",
  "Financeiros",
  "Viagem",
  "Rc",
  "Outros",
];

export async function getServerSideProps({ params }) {
  const { id } = params;

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  const { data: policies } = await supabase
    .from("policies")
    .select("*, insurers(name)")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const { data: claims } = await supabase
    .from("claims")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  return {
    props: {
      client,
      policies: policies || [],
      claims: claims || [],
    },
  };
}

function formatDate(date) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("pt-PT").format(
    new Date(date)
  );
}

function calculateAge(date) {
  if (!date) return "-";

  const start = new Date(date);
  const today = new Date();

  let years =
    today.getFullYear() -
    start.getFullYear();

  const monthDiff =
    today.getMonth() -
    start.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 &&
      today.getDate() <
        start.getDate())
  ) {
    years--;
  }

  return `${years} anos`;
}

function calculateAnnualCommission(
  policy
) {
  const commission = Number(
    policy.commission_per_payment || 0
  );

  const frequency = String(
    policy.payment_frequency || "anual"
  ).toLowerCase();

  if (frequency === "mensal")
    return commission * 12;

  if (frequency === "trimestral")
    return commission * 4;

  if (frequency === "semestral")
    return commission * 2;

  return commission;
}

function clientRating(
  policies,
  totalCommission
) {
  const count = policies.length;

  if (
    count >= 5 ||
    totalCommission >= 150
  )
    return "TOP";

  if (
    count >= 4 ||
    totalCommission >= 120
  )
    return "MUITO BOM";

  if (
    count >= 3 ||
    totalCommission >= 100
  )
    return "BOM";

  if (
    count >= 2 ||
    totalCommission >= 50
  )
    return "MÉDIO";

  if (
    count >= 1 ||
    totalCommission >= 20
  )
    return "FRACO";

  return "SEM CARTEIRA";
}

function ratingStyle(rating) {
  if (rating === "TOP") {
    return {
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (rating === "MUITO BOM") {
    return {
      background: "#dbeafe",
      color: "#1d4ed8",
    };
  }

  if (rating === "BOM") {
    return {
      background: "#ede9fe",
      color: "#5b21b6",
    };
  }

  if (rating === "MÉDIO") {
    return {
      background: "#fef3c7",
      color: "#92400e",
    };
  }

  if (rating === "FRACO") {
    return {
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  return {
    background: "#f3f4f6",
    color: "#374151",
  };
}

function InfoItem({
  label,
  value,
}) {
  return (
    <div style={infoItem}>
      <span style={infoLabel}>
        {label}
      </span>

      <strong style={infoValue}>
        {value || "-"}
      </strong>
    </div>
  );
}

export default function ClientePage({
  client,
  policies,
  claims,
}) {
  const [
    showPolicyForm,
    setShowPolicyForm,
  ] = useState(false);

  const [
    policyData,
    setPolicyData,
  ] = useState({
    policy_number: "",
    branch: "Automóvel",
    license_plate: "",
    insurer_name: "Generali",
    annual_premium: "",
    commission_per_payment: "",
    payment_frequency: "Mensal",
    start_date: "",
    renewal_date: "",
    last_payment_date: "",
  });

  if (!client) {
    return (
      <div>
        Cliente não encontrado.
      </div>
    );
  }

  async function addClientInteraction() {
    const note = prompt(
      "Nova interação com o cliente"
    );

    if (!note) return;

    const now =
      new Date().toLocaleString(
        "pt-PT",
        {
          dateStyle: "short",
          timeStyle: "short",
        }
      );

    const previous =
      client.interaction_notes || "";

    const updatedNotes =
      previous
        ? `${previous}\n\n${now} - ${note}`
        : `${now} - ${note}`;

    const { error } =
      await supabase
        .from("clients")
        .update({
          interaction_notes:
            updatedNotes,
        })
        .eq("id", client.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function editClient() {
    const name = prompt(
      "Nome",
      client.name || ""
    );

    if (name === null) return;

    const phone = prompt(
      "Telefone",
      client.phone || ""
    );

    if (phone === null) return;

    const email = prompt(
      "Email",
      client.email || ""
    );

    if (email === null) return;

    const address = prompt(
      "Morada",
      client.address || ""
    );

    if (address === null) return;

    const city = prompt(
      "Cidade",
      client.city || ""
    );

    if (city === null) return;

    const iban = prompt(
      "IBAN",
      client.iban || ""
    );

    if (iban === null) return;

    const notes = prompt(
      "Observações",
      client.notes || ""
    );

    if (notes === null) return;

    const { error } =
      await supabase
        .from("clients")
        .update({
          name,
          phone,
          email,
          address,
          city,
          iban,
          notes,
        })
        .eq("id", client.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function createPolicy() {
    const response = await fetch(
      "/api/create-policy",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          client_id: client.id,
          ...policyData,
        }),
      }
    );

    if (!response.ok) {
      const error =
        await response.json();

      alert(
        error.error ||
          "Erro ao criar apólice"
      );

      return;
    }

    window.location.reload();
  }

  async function editPolicy(
    policy
  ) {
    const numero = prompt(
      "Número da Apólice",
      policy.policy_number || ""
    );

    if (numero === null) return;

    const premio = prompt(
      "Prémio anual",
      policy.annual_premium || ""
    );

    if (premio === null) return;

    const { error } =
      await supabase
        .from("policies")
        .update({
          policy_number: numero,
          annual_premium:
            premio,
        })
        .eq("id", policy.id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function updatePolicyStatus(
    policyId,
    status
  ) {
    const { error } =
      await supabase
        .from("policies")
        .update({
          status,
        })
        .eq("id", policyId);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  const totalPremium =
    policies.reduce(
      (sum, policy) =>
        sum +
        Number(
          policy.annual_premium || 0
        ),
      0
    );

  const totalCommission =
    policies.reduce(
      (sum, policy) =>
        sum +
        calculateAnnualCommission(
          policy
        ),
      0
    );

  const rating = clientRating(
    policies,
    totalCommission
  );

  const currentRatingStyle =
    ratingStyle(rating);
