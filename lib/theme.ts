// Chart + brand color tokens (mirrors CSS custom properties in globals.css).
// Categorical palette validated with the dataviz skill validator:
// worst adjacent CVD ΔE 16.6 (>12 target). Gold(#e0a010) carries the contrast-
// relief rule → always paired with legend/direct-label/table (satisfied app-wide).

export const CHART = {
  surface: "#fdfcf8",
  grid: "#e6e3d6",
  axis: "#cfccbc",
  textPrimary: "#232a1c",
  textSecondary: "#5f5d52",
  textMuted: "#97958a",
};

// Fixed categorical order — assigned by entity identity, never cycled by rank.
export const SERIES = [
  "#5a8f22", // 1 green
  "#e0a010", // 2 gold
  "#2f80c4", // 3 blue
  "#cf3a5f", // 4 wine
  "#14a58c", // 5 teal
  "#8a63d4", // 6 purple
  "#e56a2b", // 7 terracotta
  "#d269a8", // 8 pink
];

// Brand chrome (deep, for UI — distinct role from data color)
export const BRAND = {
  forest: "#465907",
  forestDeep: "#324420",
  forestNight: "#1b2612",
  gold: "#b08a3e",
  wine: "#942143",
  navy: "#293052",
  cream: "#f1efe4",
};

export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

// Semantic mapping — color follows the entity so filters never repaint survivors.
export const OBJECTIVE_COLOR: Record<string, string> = {
  ALCANCE: "#2f80c4",
  VIDEOVIEW: "#14a58c",
  WHATSAPP: "#5a8f22",
  "CLIQUE BOTAO WPP": "#e0a010",
  "CONVERSAO-LP": "#e0a010", // legacy alias
  "LEAD NO SITE": "#8a63d4",
  "LEAD-ADS": "#cf3a5f",
};

export const FORMAT_COLOR: Record<string, string> = {
  Estático: "#2f80c4",
  Carrossel: "#e0a010",
  'Animação 15"': "#14a58c",
  'Animação 30"': "#8a63d4",
  Outro: "#8b8b8b",
};

export const GENDER_COLOR: Record<string, string> = {
  female: "#cf3a5f",
  male: "#2f80c4",
  unknown: "#a8a496",
};

// Sequential green ramp for heatmaps (single hue, light→dark)
export const GREEN_RAMP = [
  "#eef3e3",
  "#dbe8c4",
  "#c3d99b",
  "#a6c66e",
  "#86b04a",
  "#6a9330",
  "#52781f",
  "#3d5c14",
];

// Platform identity for the sidebar / platform pages
export const PLATFORMS = {
  meta: { label: "Meta Ads", color: "#2f80c4", key: "meta" as const },
  google: { label: "Google Pesquisa", color: "#e0a010", key: "google" as const },
  youtube: { label: "YouTube", color: "#cf3a5f", key: "youtube" as const },
  programatica: { label: "Programática", color: "#8a63d4", key: "programatica" as const },
};
