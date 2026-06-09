import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "../../components/Sidebar";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

const lines = [
  { key: "tql_nv", label: "TQL Não Vida", company: "TRANQUILIDADE", segment: "NÃO VIDA" },
  { key: "tql_vida", label: "TQL Vida", company: "TRANQUILIDADE", segment: "VIDA" },
  { key: "real", label: "Real Vida", company: "REAL VIDA", segment: "VIDA" },
  { key: "allianz", label: "Allianz", company: "ALLIANZ", segment: "NÃO VIDA" },
  { key: "zurich", label: "Zurich", company: "ZURICH", segment: "NÃO VIDA" },
];

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export async function getServerSideProps() {
  const { data: receipts } = await supabase
    .from("commission_receipts")
    .select("*")
    .order("receipt_date", { ascending: false })
    .order("created_at", { ascending: false });

  const { data: baselines } = await supabase
    .from("commission_baselines")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: true });

  return {
    props: {
      receipts: receipts || [],
      baselines: baselines || [],
    },
  };
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

function parseDecimal(value) {
  if (value === "" || value === null || value === undefined) return 0;

  if (typeof value === "number") return value;

  const text = String(value)
    .replace(/\s/g, "")
    .replace("€", "")
    .trim();

  if (!text) return 0;

  if (text.includes(",")) {
    return Number(text.replace(/\./g, "").replace(",", ".")) || 0;
  }

  return Number(text) || 0;
}

function formatEuro(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function formatDecimalInput(value) {
  if (value === "" || value === null || value === undefined) return "";

  return new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-PT").format(new Date(date));
}

function getYear(date) {
  return Number(String(date || "").slice(0, 4));
}

function getMonth(date) {
  return Number(String(date || "").slice(5, 7));
}

function baselineKey(year, month) {
  return `${year}-${month}`;
}

function receiptMatchesLine(receipt, line) {
  return (
    String(receipt.company || "").toUpperCase() === line.company &&
    String(receipt.segment || "").toUpperCase() === line.segment
  );
}

function buildBaselineMap(baselines) {
  const map = {};

  baselines.forEach((item) => {
    map[baselineKey(item.year, item.month)] = item;
  });

  return map;
}

function calculateMonthLine(receipts, year, month, line) {
  return receipts
    .filter(
      (receipt) =>
        getYear(receipt.receipt_date) === year &&
        getMonth(receipt.receipt_date) === month &&
        receiptMatchesLine(receipt, line)
    )
    .reduce((sum, receipt) => sum + Number(receipt.amount || 0), 0);
}

function getBaselineValue(baseline, lineKey) {
  if (!baseline) return 0;
  return Number(baseline[lineKey] || 0);
}

function calculateExecutionPercentage(current, previous) {
  const base = Number(previous || 0);

  if (!base || base <= 0) return 0;

  return (Number(current || 0) / base) * 100;
}

function calculateMissingAmount(current, previous) {
  return Math.max(Number(previous || 0) - Number(current || 0), 0);
}

function buildMonthlyResults(receipts, baselines, selectedYear) {
  const baselineMap = buildBaselineMap(baselines);

  return monthNames.map((monthName, index) => {
    const month = index + 1;
    const previousYearBaseline = baselineMap[baselineKey(selectedYear - 1, month)] || null;

    const lineResults = lines.map((line) => {
      const current = calculateMonthLine(receipts, selectedYear, month, line);
      const previous = getBaselineValue(previousYearBaseline, line.key);

      return {
        ...line,
        current,
        previous,
        difference: current - previous,
        missing: calculateMissingAmount(current, previous),
        execution: calculateExecutionPercentage(current, previous),
      };
    });

    const currentTotal = lineResults.reduce((sum, item) => sum + item.current, 0);
    const previousTotal = lineResults.reduce((sum, item) => sum + item.previous, 0);
    const difference = currentTotal - previousTotal;

    return {
      month,
      monthName,
      lineResults,
      currentTotal,
      previousTotal,
      difference,
      percentage: previousTotal > 0 ? (currentTotal / previousTotal) * 100 : 0,
    };
  });
}

function buildReceiptFormForDate(date) {
  return lines.reduce(
    (acc, line) => ({
      ...acc,
      [line.key]: "",
    }),
    {
      receipt_date: date,
      notes: "",
    }
  );
}

function buildBaselineFormForYear(year, baselines) {
  const baselineMap = buildBaselineMap(baselines);

  const form = {};

  monthNames.forEach((_, index) => {
    const month = index + 1;
    const baseline = baselineMap[baselineKey(year, month)] || {};

    form[month] = {};

    lines.forEach((line) => {
      form[month][line.key] = baseline[line.key]
        ? formatDecimalInput(baseline[line.key])
        : "";
    });
  });

  return form;
}

export default function RecebimentosComissoes({ receipts, baselines }) {
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [baselineYear, setBaselineYear] = useState(currentYear - 1);
  const [showBaselineEditor, setShowBaselineEditor] = useState(false);

  const [receiptForm, setReceiptForm] = useState(() =>
    buildReceiptFormForDate(todayIso())
  );

  const [baselineForm, setBaselineForm] = useState(() =>
    buildBaselineFormForYear(currentYear - 1, baselines)
  );

  const monthlyResults = useMemo(
    () => buildMonthlyResults(receipts, baselines, selectedYear),
    [receipts, baselines, selectedYear]
  );

  const yearTotal = monthlyResults.reduce(
    (sum, month) => sum + month.currentTotal,
    0
  );

  const previousYearTotal = monthlyResults.reduce(
    (sum, month) => sum + month.previousTotal,
    0
  );

  const yearDifference = yearTotal - previousYearTotal;

  const availableYears = useMemo(() => {
    const years = new Set([currentYear, currentYear - 1]);

    receipts.forEach((receipt) => {
      if (receipt.receipt_date) {
        years.add(getYear(receipt.receipt_date));
      }
    });

    baselines.forEach((item) => {
      if (item.year) {
        years.add(Number(item.year) + 1);
        years.add(Number(item.year));
      }
    });

    return [...years].sort((a, b) => b - a);
  }, [receipts, baselines, currentYear]);

  function updateBaselineYear(year) {
    setBaselineYear(year);
    setBaselineForm(buildBaselineFormForYear(year, baselines));
  }

  async function saveDailyReceipts(e) {
    e.preventDefault();

    if (!receiptForm.receipt_date) {
      alert("Indica a data do recebimento.");
      return;
    }

    const inserts = lines
      .map((line) => {
        const amount = parseDecimal(receiptForm[line.key]);

        if (!amount || amount <= 0) return null;

        return {
          receipt_date: receiptForm.receipt_date,
          company: line.company,
          segment: line.segment,
          amount,
          notes: receiptForm.notes || null,
        };
      })
      .filter(Boolean);

    if (inserts.length === 0) {
      alert("Indica pelo menos um valor recebido.");
      return;
    }

    const { error } = await supabase.from("commission_receipts").insert(inserts);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function saveBaselineValues() {
    const rows = monthNames.map((_, index) => {
      const month = index + 1;
      const monthData = baselineForm[month] || {};

      const row = {
        year: baselineYear,
        month,
      };

      lines.forEach((line) => {
        row[line.key] = parseDecimal(monthData[line.key]);
      });

      return row;
    });

    const { error } = await supabase
      .from("commission_baselines")
      .upsert(rows, {
        onConflict: "year,month",
      });

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  async function deleteReceipt(id) {
    const ok = window.confirm("Eliminar este recebimento?");
    if (!ok) return;

    const { error } = await supabase
      .from("commission_receipts")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  return (
    <div style={page}>
      <Sidebar active="financeiro" />

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={title}>Recebimentos de Comissões</h1>
            <p style={subtitle}>
              Lançamento manual diário e comparação mensal com valores fixos do ano anterior.
            </p>
          </div>

          <div style={headerActions}>
            <select
              style={input}
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  Ver {year}
                </option>
              ))}
            </select>

            <button
              type="button"
              style={baselineButton}
              onClick={() => setShowBaselineEditor(!showBaselineEditor)}
            >
              Editar valores ano anterior
            </button>
          </div>
        </header>

        <section style={statsGrid}>
          <StatCard
            title={`Recebido ${selectedYear}`}
            value={formatEuro(yearTotal)}
            color="#16a34a"
          />

          <StatCard
            title={`Base ${selectedYear - 1}`}
            value={formatEuro(previousYearTotal)}
            color="#2563eb"
          />

          <StatCard
            title="Diferença"
            value={formatEuro(yearDifference)}
            color={yearDifference >= 0 ? "#16a34a" : "#dc2626"}
          />

          <StatCard
            title="% face ao ano anterior"
            value={`${previousYearTotal > 0 ? ((yearTotal / previousYearTotal) * 100).toFixed(1) : "0.0"}%`}
            color="#7c3aed"
          />
        </section>

        <section style={sectionCard}>
          <h2 style={sectionTitle}>Gráfico diferencial {selectedYear} vs {selectedYear - 1}</h2>

          <div style={chartLegend}>
            <span style={legendItem}>
              <span style={legendDotPositive}></span>
              Diferença positiva
            </span>

            <span style={legendItem}>
              <span style={legendDotNegative}></span>
              Diferença negativa
            </span>
          </div>

          <div style={differenceChart}>
            {monthlyResults.map((month) => {
              const maxDifference =
                Math.max(
                  ...monthlyResults.map((item) =>
                    Math.abs(Number(item.difference || 0))
                  ),
                  1
                );

              const widthPercent =
                Math.min(
                  100,
                  (Math.abs(Number(month.difference || 0)) / maxDifference) * 100
                );

              return (
                <div key={`chart-${month.month}`} style={chartRow}>
                  <div style={chartMonth}>{month.monthName.slice(0, 3)}</div>

                  <div style={chartTrack}>
                    <div style={chartCenterLine}></div>

                    {month.difference >= 0 ? (
                      <div
                        style={{
                          ...chartBarPositive,
                          width: `${widthPercent / 2}%`,
                        }}
                      ></div>
                    ) : (
                      <div
                        style={{
                          ...chartBarNegative,
                          width: `${widthPercent / 2}%`,
                        }}
                      ></div>
                    )}
                  </div>

                  <div
                    style={{
                      ...chartValue,
                      color: month.difference >= 0 ? "#15803d" : "#dc2626",
                    }}
                  >
                    {formatEuro(month.difference)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section style={formCard}>
          <h2 style={sectionTitle}>Registo diário</h2>
          <p style={muted}>
            Preenche só as linhas que recebeste hoje. As restantes podem ficar em branco.
          </p>

          <form style={dailyForm} onSubmit={saveDailyReceipts}>
            <label style={fieldLabel}>
              Data do recebimento
              <input
                style={input}
                type="date"
                value={receiptForm.receipt_date}
                onChange={(e) =>
                  setReceiptForm({
                    ...receiptForm,
                    receipt_date: e.target.value,
                  })
                }
              />
            </label>

            <div style={receiptLinesGrid}>
              {lines.map((line) => (
                <label key={line.key} style={fieldLabel}>
                  {line.label}
                  <input
                    style={input}
                    inputMode="decimal"
                    placeholder="0,00"
                    value={receiptForm[line.key]}
                    onChange={(e) =>
                      setReceiptForm({
                        ...receiptForm,
                        [line.key]: e.target.value,
                      })
                    }
                  />
                </label>
              ))}
            </div>

            <label style={fieldLabel}>
              Observações
              <textarea
                style={textarea}
                placeholder="Ex: Recebimento mensal comunicado pela companhia"
                value={receiptForm.notes}
                onChange={(e) =>
                  setReceiptForm({
                    ...receiptForm,
                    notes: e.target.value,
                  })
                }
              />
            </label>

            <div style={dailyTotalBox}>
              <span>Total a lançar</span>
              <strong>
                {formatEuro(
                  lines.reduce(
                    (sum, line) => sum + parseDecimal(receiptForm[line.key]),
                    0
                  )
                )}
              </strong>
            </div>

            <button type="submit" style={button}>
              Guardar recebimentos
            </button>
          </form>
        </section>

        {showBaselineEditor && (
          <section style={baselineCard}>
            <div style={baselineHeader}>
              <div>
                <h2 style={sectionTitle}>Valores fixos do ano anterior</h2>
                <p style={muted}>
                  Aqui colocas os valores de referência do ano passado. Estes valores ficam fixos para comparação.
                </p>
              </div>

              <select
                style={input}
                value={baselineYear}
                onChange={(e) => updateBaselineYear(Number(e.target.value))}
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    Base {year}
                  </option>
                ))}
              </select>
            </div>

            <div style={baselineTableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Mês</th>
                    {lines.map((line) => (
                      <th key={line.key} style={th}>{line.label}</th>
                    ))}
                    <th style={th}>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {monthNames.map((monthName, index) => {
                    const month = index + 1;
                    const values = baselineForm[month] || {};
                    const total = lines.reduce(
                      (sum, line) => sum + parseDecimal(values[line.key]),
                      0
                    );

                    return (
                      <tr key={month}>
                        <td style={td}>
                          <strong>{monthName}</strong>
                        </td>

                        {lines.map((line) => (
                          <td key={line.key} style={td}>
                            <input
                              style={smallInput}
                              inputMode="decimal"
                              placeholder="0,00"
                              value={values[line.key] || ""}
                              onChange={(e) =>
                                setBaselineForm({
                                  ...baselineForm,
                                  [month]: {
                                    ...(baselineForm[month] || {}),
                                    [line.key]: e.target.value,
                                  },
                                })
                              }
                            />
                          </td>
                        ))}

                        <td style={td}>
                          <strong style={moneyValue}>{formatEuro(total)}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button type="button" style={button} onClick={saveBaselineValues}>
              Guardar valores fixos
            </button>
          </section>
        )}

        <section style={sectionCard}>
          <h2 style={sectionTitle}>Resultado mensal {selectedYear} vs {selectedYear - 1}</h2>

          <div style={monthlyGrid}>
            {monthlyResults.map((month) => (
              <div key={month.month} style={monthCard}>
                <div style={monthTop}>
                  <h3 style={monthTitle}>{month.monthName}</h3>

                  <span
                    style={{
                      ...differenceBadge,
                      ...(month.difference >= 0
                        ? positiveBadge
                        : negativeBadge),
                    }}
                  >
                    {formatEuro(month.difference)}
                  </span>
                </div>

                <div style={monthValues}>
                  <div>
                    <span style={smallLabel}>{selectedYear}</span>
                    <strong>{formatEuro(month.currentTotal)}</strong>
                  </div>

                  <div>
                    <span style={smallLabel}>{selectedYear - 1}</span>
                    <strong>{formatEuro(month.previousTotal)}</strong>
                  </div>

                  <div>
                    <span style={smallLabel}>% atingida</span>
                    <strong>{month.percentage.toFixed(1)}%</strong>
                  </div>
                </div>

                <div style={lineList}>
                  {month.lineResults.map((line) => (
                    <div key={line.key} style={lineExecutionRow}>
                      <div>
                        <strong>{line.label}</strong>
                        <div style={smallMuted}>
                          Base {selectedYear - 1}: {formatEuro(line.previous)}
                        </div>
                      </div>

                      <div style={lineExecutionValues}>
                        <span>
                          Recebido: <strong>{formatEuro(line.current)}</strong>
                        </span>

                        <span
                          style={{
                            ...executionBadge,
                            ...(line.execution >= 100
                              ? executionOkBadge
                              : executionMissingBadge),
                          }}
                        >
                          {line.execution.toFixed(1)}%
                        </span>

                        <span
                          style={{
                            ...missingValue,
                            color: line.missing <= 0 ? "#15803d" : "#dc2626",
                          }}
                        >
                          {line.missing <= 0
                            ? "Objetivo superado"
                            : `Falta ${formatEuro(line.missing)}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={sectionCard}>
          <h2 style={sectionTitle}>Registos lançados</h2>

          {receipts.length === 0 ? (
            <p style={muted}>Sem recebimentos registados.</p>
          ) : (
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Data</th>
                    <th style={th}>Companhia</th>
                    <th style={th}>Linha</th>
                    <th style={th}>Valor</th>
                    <th style={th}>Observações</th>
                    <th style={th}>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {receipts.slice(0, 120).map((receipt) => (
                    <tr key={receipt.id}>
                      <td style={td}>{formatDate(receipt.receipt_date)}</td>
                      <td style={td}>{receipt.company}</td>
                      <td style={td}>{receipt.segment}</td>
                      <td style={td}>
                        <strong style={moneyValue}>
                          {formatEuro(receipt.amount)}
                        </strong>
                      </td>
                      <td style={td}>{receipt.notes || "-"}</td>
                      <td style={td}>
                        <button
                          type="button"
                          style={deleteButton}
                          onClick={() => deleteReceipt(receipt.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div style={statCard}>
      <span style={statLabel}>{title}</span>
      <strong style={{ ...statValue, color }}>{value}</strong>
    </div>
  );
}

const page = {
  display: "flex",
  minHeight: "100vh",
  background: "#f3f4f6",
  fontFamily: "Arial, sans-serif",
};

const main = {
  flex: 1,
  padding: 40,
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  marginBottom: 26,
};

const title = {
  fontSize: 40,
  margin: 0,
};

const subtitle = {
  color: "#6b7280",
  marginTop: 8,
};

const headerActions = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 16,
  marginBottom: 24,
};

const statCard = {
  background: "white",
  padding: 20,
  borderRadius: 16,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  display: "grid",
  gap: 8,
};

const statLabel = {
  color: "#6b7280",
  fontSize: 13,
  fontWeight: "bold",
};

const statValue = {
  fontSize: 28,
};

const formCard = {
  background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  border: "1px solid #bfdbfe",
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const chartLegend = {
  display: "flex",
  gap: 18,
  flexWrap: "wrap",
  marginBottom: 18,
};

const legendItem = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#475569",
  fontWeight: "bold",
  fontSize: 13,
};

const legendDotPositive = {
  width: 12,
  height: 12,
  borderRadius: 999,
  background: "#16a34a",
};

const legendDotNegative = {
  width: 12,
  height: 12,
  borderRadius: 999,
  background: "#dc2626",
};

const differenceChart = {
  display: "grid",
  gap: 12,
};

const chartRow = {
  display: "grid",
  gridTemplateColumns: "54px 1fr 120px",
  gap: 12,
  alignItems: "center",
};

const chartMonth = {
  fontWeight: "bold",
  color: "#334155",
};

const chartTrack = {
  position: "relative",
  height: 24,
  background: "#f1f5f9",
  borderRadius: 999,
  overflow: "hidden",
  border: "1px solid #e5e7eb",
};

const chartCenterLine = {
  position: "absolute",
  left: "50%",
  top: 0,
  bottom: 0,
  width: 2,
  background: "#94a3b8",
  zIndex: 2,
};

const chartBarPositive = {
  position: "absolute",
  left: "50%",
  top: 0,
  bottom: 0,
  background: "#16a34a",
  borderRadius: "0 999px 999px 0",
};

const chartBarNegative = {
  position: "absolute",
  right: "50%",
  top: 0,
  bottom: 0,
  background: "#dc2626",
  borderRadius: "999px 0 0 999px",
};

const chartValue = {
  textAlign: "right",
  fontWeight: "bold",
};

const baselineCard = {
  background: "linear-gradient(135deg, #fef3c7, #fffbeb)",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  border: "1px solid #f59e0b",
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const sectionCard = {
  background: "white",
  padding: 24,
  borderRadius: 18,
  marginBottom: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const sectionTitle = {
  marginTop: 0,
};

const dailyForm = {
  display: "grid",
  gap: 14,
};

const receiptLinesGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 14,
};

const fieldLabel = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  color: "#374151",
  fontSize: 13,
  fontWeight: "bold",
};

const input = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 14,
  background: "white",
};

const smallInput = {
  padding: 9,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 13,
  width: "100%",
  minWidth: 95,
  boxSizing: "border-box",
};

const textarea = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  minHeight: 70,
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "Arial, sans-serif",
};

const dailyTotalBox = {
  background: "white",
  padding: 16,
  borderRadius: 14,
  border: "1px solid #bfdbfe",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 18,
};

const button = {
  background: "#111827",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const baselineButton = {
  background: "#7c3aed",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const baselineHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  marginBottom: 18,
};

const baselineTableWrap = {
  overflowX: "auto",
  marginBottom: 16,
};

const monthlyGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
  gap: 16,
};

const monthCard = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  padding: 16,
  borderRadius: 16,
};

const monthTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginBottom: 12,
};

const monthTitle = {
  margin: 0,
};

const differenceBadge = {
  padding: "6px 10px",
  borderRadius: 999,
  fontWeight: "bold",
  fontSize: 13,
};

const positiveBadge = {
  background: "#dcfce7",
  color: "#166534",
};

const negativeBadge = {
  background: "#fee2e2",
  color: "#991b1b",
};

const monthValues = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 10,
  marginBottom: 12,
};

const smallLabel = {
  color: "#6b7280",
  display: "block",
  fontSize: 12,
  marginBottom: 4,
};

const lineList = {
  display: "grid",
  gap: 7,
};

const lineRow = {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.8fr 0.9fr",
  gap: 8,
  borderTop: "1px solid #e5e7eb",
  paddingTop: 7,
  fontSize: 13,
};

const lineExecutionRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1.7fr",
  gap: 10,
  borderTop: "1px solid #e5e7eb",
  paddingTop: 10,
  fontSize: 13,
};

const lineExecutionValues = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "flex-end",
};

const executionBadge = {
  padding: "5px 9px",
  borderRadius: 999,
  fontWeight: "bold",
  fontSize: 12,
};

const executionOkBadge = {
  background: "#dcfce7",
  color: "#166534",
};

const executionMissingBadge = {
  background: "#fee2e2",
  color: "#991b1b",
};

const missingValue = {
  fontWeight: "bold",
};

const tableWrap = {
  overflowX: "auto",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

const th = {
  textAlign: "left",
  padding: "11px 10px",
  borderBottom: "1px solid #e5e7eb",
  color: "#374151",
  background: "#f9fafb",
  whiteSpace: "nowrap",
};

const td = {
  padding: "11px 10px",
  borderBottom: "1px solid #e5e7eb",
};

const moneyValue = {
  color: "#16a34a",
};

const deleteButton = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "8px 11px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const muted = {
  color: "#6b7280",
};

const smallMuted = {
  color: "#64748b",
  fontSize: 12,
};
