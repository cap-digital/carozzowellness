"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { useData } from "@/components/providers/DataProvider";
import { Loadable, Reveal } from "@/components/ui/Loadable";
import { ChartCard, SectionTitle, Card } from "@/components/ui/Card";
import { Funnel, FunnelStage } from "@/components/charts/Funnel";
import { Dropdown } from "@/components/ui/Dropdown";
import { DataTable, Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { makeTooltip } from "@/components/charts/ChartTooltip";
import { sum } from "@/lib/metrics";
import { objectiveBreakdown } from "@/lib/aggregate";
import { brl, int, resultNum } from "@/lib/format";
import { CHART } from "@/lib/theme";
import { cn } from "@/lib/cn";
import type { Totals } from "@/lib/types";
import { Clock } from "lucide-react";

const PLATFORM_TABS = [
  { key: "meta", label: "Meta Ads", color: "#2f80c4" },
  { key: "google", label: "Google", color: "#e0a010" },
  { key: "youtube", label: "YouTube", color: "#cf3a5f" },
  { key: "programatica", label: "Programática", color: "#8a63d4" },
] as const;

export default function CampanhasPage() {
  return (
    <Loadable>
      <Campanhas />
    </Loadable>
  );
}

function Campanhas() {
  const { rows, platforms } = useData();
  const t = useMemo(() => sum(rows), [rows]);
  const objectives = useMemo(() => objectiveBreakdown(rows), [rows]);
  const [selCampaign, setSelCampaign] = useState<string>("all");
  const [platform, setPlatform] = useState<string>("meta");

  const primaryOf = (key: string) => objectives.find((o) => o.key === key)?.primaryValue ?? 0;

  const costPer = objectives
    .filter((o) => o.primary?.isConversion && o.primaryValue > 0)
    .map((o) => ({ name: o.key, value: +o.costPerResult.toFixed(2), color: o.color, short: o.primary!.short }))
    .sort((a, b) => a.value - b.value);

  // Cost display per campaign (CPM for reach/impressions strategy, CPV for views, cost/result otherwise)
  const costInfo = (o: (typeof objectives)[number]) => {
    if (o.key === "ALCANCE") return { label: "CPM", value: brl(o.derived.cpm), num: o.derived.cpm };
    if (o.key === "VIDEOVIEW") return { label: "CPV", value: brl(o.derived.cpv, 3), num: o.derived.cpv };
    return { label: "por resultado", value: brl(o.costPerResult), num: o.costPerResult };
  };

  const funnelStages = (objKey: string, st: Totals): FunnelStage[] => {
    const impressions = { label: "Impressões", value: st.impressions, color: "#2f80c4" };
    if (objKey === "ALCANCE")
      return [
        impressions,
        { label: "Alcance", value: st.reach, color: "#14a58c" },
        { label: "Cliques", value: st.clicks, color: "#5a8f22" },
        { label: "Cliques no link", value: st.linkClicks, color: "#e0a010" },
      ];
    if (objKey === "VIDEOVIEW")
      return [
        impressions,
        { label: "Views de vídeo", value: st.videoViews, color: "#14a58c" },
        { label: "Cliques no link", value: st.linkClicks, color: "#e0a010" },
        { label: "Thruplays", value: st.thruplays, color: "#cf3a5f" },
      ];
    const sel = objectives.find((o) => o.key === objKey);
    const base = [
      impressions,
      { label: "Cliques", value: st.clicks, color: "#5a8f22" },
      { label: "Cliques no link", value: st.linkClicks, color: "#e0a010" },
    ];
    // "Todas as campanhas" mistura ações de resultado diferentes — não inventamos
    // uma soma "Conversões". Uma campanha específica mostra sua própria métrica mãe.
    if (objKey === "all" || !sel?.primary) return base;
    return [...base, { label: sel.primary.label, value: sel.primaryValue, color: "#cf3a5f" }];
  };

  const sel = objectives.find((o) => o.key === selCampaign);
  const st = sel ? sel.totals : t;
  const selColor = sel ? sel.color : "#465907";
  const campaignOptions = [
    { value: "all", label: "Todas as campanhas", color: "#465907" },
    ...objectives.map((o) => ({ value: o.key, label: o.key, color: o.color })),
  ];

  // Platform availability (only Meta has data today)
  const platformLive = (key: string) => (platforms as any)[key] > 0;
  const activePlatform = PLATFORM_TABS.find((p) => p.key === platform)!;

  type ORow = (typeof objectives)[number];
  const cols: Column<ORow>[] = [
    {
      key: "camp",
      header: "Campanha",
      render: (r) => (
        <span className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: r.color }} />
          {r.key}
        </span>
      ),
      sortValue: (r) => r.key,
    },
    {
      key: "metric",
      header: "Métrica principal",
      render: (r) => <span className="text-[var(--text-secondary)]">{r.primary?.label ?? "—"}</span>,
      sortValue: (r) => r.primary?.label ?? "",
    },
    {
      key: "result",
      header: "Resultado",
      align: "right",
      render: (r) => <span className="font-semibold text-[var(--text-primary)]" style={{ color: r.color }}>{resultNum(r.primaryValue)}</span>,
      sortValue: (r) => r.primaryValue,
    },
    { key: "spend", header: "Investido", align: "right", render: (r) => brl(r.totals.spend), sortValue: (r) => r.totals.spend },
    {
      key: "cost",
      header: "Custo",
      align: "right",
      render: (r) => {
        const ci = costInfo(r);
        return (
          <span>
            <span className="font-semibold text-[var(--text-primary)]">{ci.value}</span>{" "}
            <span className="text-[10.5px] text-[var(--text-muted)]">{ci.label}</span>
          </span>
        );
      },
      sortValue: (r) => costInfo(r).num,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary — each conversion campaign by its métrica mãe */}
      <Reveal>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard label="Investimento total" value={brl(t.spend, 0)} hint="nas campanhas ativas" color="#465907" />
          <SummaryCard label="WhatsApp" value={int(primaryOf("WHATSAPP"))} hint="campanha WhatsApp" color="#5a8f22" />
          <SummaryCard label="Leads LP" value={int(primaryOf("CONVERSAO-LP"))} hint="campanha Conversão-LP" color="#e0a010" />
          <SummaryCard label="Leads Formulário" value={int(primaryOf("LEAD-ADS"))} hint="campanha Lead-Ads" color="#cf3a5f" />
        </div>
      </Reveal>

      {/* Funnel (selectable) + cost per result */}
      <Reveal delay={60}>
        <SectionTitle hint="da entrega ao resultado, com custo por campanha">Funil e custo por campanha</SectionTitle>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title="Funil de conversão"
            subtitle={`${brl(st.spend, 0)} investidos · ${selCampaign === "all" ? "todas as campanhas" : selCampaign}`}
            accent={selColor}
            right={
              <Dropdown size="sm" align="right" swatch options={campaignOptions} value={selCampaign} onChange={setSelCampaign} />
            }
          >
            <div className="pt-2">
              <Funnel stages={funnelStages(selCampaign, st)} />
            </div>
          </ChartCard>

          <ChartCard
            title="Custo por resultado por campanha"
            subtitle="Investimento ÷ métrica mãe — apenas campanhas de conversão"
            accent="#b08a3e"
          >
            <div style={{ height: 60 + costPer.length * 60 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={costPer} margin={{ top: 4, right: 70, left: 4, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke={CHART.grid} />
                  <XAxis type="number" tickFormatter={(v) => brl(v, 0)} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: CHART.textSecondary }} tickLine={false} axisLine={false} width={110} />
                  <Tooltip
                    cursor={{ fill: "rgba(70,89,7,0.06)" }}
                    content={makeTooltip((_n, v, p) => ({ label: `Custo por ${(p as any).short}`, value: brl(v), color: (p as any).color }))}
                  />
                  <Bar isAnimationActive={false} dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={30}>
                    {costPer.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                    <LabelList dataKey="value" position="right" formatter={(v: any) => brl(v)} style={{ fontSize: 11, fill: CHART.textSecondary, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 px-1 text-[11px] text-[var(--text-muted)]">
              Cada barra usa a métrica principal da campanha (WhatsApp, Leads LP ou Leads Formulário).
            </div>
          </ChartCard>
        </div>
      </Reveal>

      {/* Primary result per campaign — table with platform filter (scales as platforms/campaigns grow) */}
      <Reveal delay={120}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            Resultado principal por campanha
          </h2>
          {/* Platform filter */}
          <div className="inline-flex flex-wrap items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
            {PLATFORM_TABS.map((p) => {
              const live = platformLive(p.key);
              const active = platform === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setPlatform(p.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                    active
                      ? "bg-[var(--surface-1)] text-[var(--text-primary)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: live ? p.color : "#c3bfad" }} />
                  {p.label}
                  {!live && <span className="text-[9.5px] uppercase tracking-wide text-[var(--text-muted)]">breve</span>}
                </button>
              );
            })}
          </div>
        </div>

        <Card className={platform === "meta" ? "p-1.5" : ""}>
          {platform === "meta" ? (
            <DataTable columns={cols} data={objectives} rowKey={(r) => r.key} initialSort={{ key: "spend", dir: "desc" }} />
          ) : (
            <EmptyState
              icon={<Clock size={22} />}
              color={activePlatform.color}
              title={`${activePlatform.label} em breve`}
              description={`Assim que a conta de ${activePlatform.label} for integrada, as campanhas e seus resultados aparecem aqui — no mesmo formato.`}
            />
          )}
        </Card>
      </Reveal>
    </div>
  );
}

function SummaryCard({ label, value, hint, color }: { label: string; value: string; hint: string; color: string }) {
  return (
    <Card className="relative overflow-hidden p-4">
      <span className="absolute left-0 top-4 h-7 w-[3px] rounded-full" style={{ background: color }} />
      <div className="pl-2 text-[12px] text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1 pl-2 text-[26px] font-semibold leading-none tnum text-[var(--text-primary)]">{value}</div>
      <div className="mt-1.5 pl-2 text-[11.5px] text-[var(--text-muted)]">{hint}</div>
    </Card>
  );
}
