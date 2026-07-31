import {
  LayoutDashboard,
  Images,
  Users,
  Megaphone,
  Calculator,
  Search,
  MonitorPlay,
  RadioTower,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  color?: string;
  status?: "live" | "soon";
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// Custom Meta glyph via lucide isn't available; use a Megaphone-free brand tile.
export const NAV: NavSection[] = [
  {
    title: "Visão geral",
    items: [{ href: "/", label: "Visão geral", icon: LayoutDashboard, color: "#465907" }],
  },
  {
    title: "Plataformas",
    items: [
      { href: "/plataformas/meta", label: "Meta Ads", icon: Megaphone, color: "#2f80c4", status: "live" },
      { href: "/plataformas/google", label: "Google Pesquisa", icon: Search, color: "#e0a010", status: "live" },
      { href: "/plataformas/youtube", label: "YouTube", icon: MonitorPlay, color: "#cf3a5f", status: "soon" },
      { href: "/plataformas/programatica", label: "Programática", icon: RadioTower, color: "#8a63d4", status: "soon" },
    ],
  },
  {
    title: "Análises",
    items: [
      { href: "/criativos", label: "Criativos", icon: Images, color: "#14a58c" },
      { href: "/publico", label: "Público", icon: Users, color: "#d269a8" },
      { href: "/campanhas", label: "Campanhas", icon: Megaphone, color: "#e56a2b" },
      { href: "/custos", label: "Custos & Taxas", icon: Calculator, color: "#b08a3e" },
    ],
  },
];
