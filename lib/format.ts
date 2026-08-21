// Pt-BR formatters used across the dashboard.

export const brl = (n: number, digits = 2) =>
  (isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const int = (n: number) =>
  Math.round(isFinite(n) ? n : 0).toLocaleString("pt-BR");

export const dec = (n: number, digits = 2) =>
  (isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const pct = (n: number, digits = 2) => `${dec(n, digits)}%`;

// Compact for big standalone numbers: 12,9 mil / 1,2 mi
export const compact = (n: number) => {
  const v = isFinite(n) ? n : 0;
  if (Math.abs(v) >= 1_000_000)
    return `${dec(v / 1_000_000, 1)} mi`;
  if (Math.abs(v) >= 1_000) return `${dec(v / 1_000, 1)} mil`;
  return int(v);
};

// Result/KPI counts: compact when large (e.g. impressions), plain int otherwise.
export const resultNum = (n: number) => (Math.abs(n) >= 100000 ? compact(n) : int(n));

export const compactBRL = (n: number) => {
  const v = isFinite(n) ? n : 0;
  if (Math.abs(v) >= 1_000_000) return `R$ ${dec(v / 1_000_000, 1)} mi`;
  if (Math.abs(v) >= 1_000) return `R$ ${dec(v / 1_000, 1)} mil`;
  return brl(v, 0);
};

// A valid yyyy-mm-dd date (the source occasionally returns empty/invalid dates).
export const isValidDate = (d: unknown): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);

// yyyy-mm-dd -> "13 jul" (defensive: never renders "NaN undefined" for bad input)
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const shortDate = (iso: string) => {
  if (!isValidDate(iso)) return "—";
  const [, m, d] = iso.split("-");
  return `${parseInt(d, 10)} ${MES[parseInt(m, 10) - 1]}`;
};

export const weekday = (iso: string) => {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][wd];
};
