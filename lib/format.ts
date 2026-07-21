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

export const compactBRL = (n: number) => {
  const v = isFinite(n) ? n : 0;
  if (Math.abs(v) >= 1_000_000) return `R$ ${dec(v / 1_000_000, 1)} mi`;
  if (Math.abs(v) >= 1_000) return `R$ ${dec(v / 1_000, 1)} mil`;
  return brl(v, 0);
};

// yyyy-mm-dd -> "13 jul"
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const shortDate = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${parseInt(d, 10)} ${MES[parseInt(m, 10) - 1]}`;
};

export const weekday = (iso: string) => {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][wd];
};
