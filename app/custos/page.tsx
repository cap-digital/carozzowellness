"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
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
import { Dropdown } from "@/components/ui/Dropdown";
import { DataTable, Column } from "@/components/ui/DataTable";
import { makeTooltip, TipShell } from "@/components/charts/ChartTooltip";
import { sum, derive, byDate } from "@/lib/metrics";
import { objectiveBreakdown, conversionStats } from "@/lib/aggregate";
import { gSum, gDerive } from "@/lib/google";
import { brl, int, pct, dec, compactBRL, shortDate } from "@/lib/format";
import { CHART } from "@/lib/theme";

export default function CustosPage() {
  return (
    <Loadable>
      <Custos />
    </Loadable>
  );
}

type Kind = "money" | "pct" | "x";
const fmtKind = (k: Kind, v: number) =>
  k === "money" ? brl(v) : k === "pct" ? pct(v) : `${dec(v, 2)}x`;
const axisKind = (k: Kind) => (v: number) =>
  k === "money" ? compactBRL(v) : k === "pct" ? `${v}%` : `${v}x`;

// Time-trend rate metrics (daily)
const RATE_METRICS: { key: string; label: string; kind: Kind; color: string }[] = [
  { key: "cpm", label: "CPM", kind: "money", color: "#465907" },
  { key: "cpcLink", label: "CPC (link)", kind: "money", color: "#e0a010" },
  { key: "ctrLink", label: "CTR (link)", kind: "pct", color: "#2f80c4" },
  { key: "ctr", label: "CTR (total)", kind: "pct", color: "#5a8f22" },
  { key: "cpv", label: "CPV", kind: "money", color: "#cf3a5f" },
  { key: "vtr", label: "VTR", kind: "pct", color: "#14a58c" },
  { key: "frequency", label: "Frequência", kind: "x", color: "#8a63d4" },
  { key: "engagementRate", label: "Engajamento", kind: "pct", color: "#d269a8" },
];

// Per-objective comparison metrics (uniform across campaigns — the campaign's own
// "custo por resultado / métrica mãe" comparison lives on the Campanhas page)
const OBJ_METRICS: { key: string; label: string; kind: Kind }[] = [
  { key: "cpm", label: "CPM", kind: "money" },
  { key: "cpcLink", label: "CPC (link)", kind: "money" },
  { key: "ctrLink", label: "CTR (link)", kind: "pct" },
  { key: "cpv", label: "CPV", kind: "money" },
];

function Custos() {
  const { rows, googleRows } = useData();
  const t = useMemo(() => sum(rows), [rows]);
  const d = useMemo(() => derive(t), [t]);
  const objectives = useMemo(() => objectiveBreakdown(rows), [rows]);
  // Google Search cost/rate metrics
  const gT = useMemo(() => gSum(googleRows), [googleRows]);
  const gD = useMemo(() => gDerive(gT), [gT]);
  const googleTiles = [
    { l: "Investido", v: brl(gT.spend, 0), hint: "total na Rede de Pesquisa" },
    { l: "CPC", v: brl(gD.cpc), hint: "custo por clique" },
    { l: "CTR", v: pct(gD.ctr), hint: "taxa de cliques" },
    { l: "CPM", v: brl(gD.cpm), hint: "custo por mil impressões" },
    { l: "Cliques", v: int(gT.clicks), hint: `de ${int(gT.impressions)} impressões` },
  ];
  // Cost per conversion action, each from its OWN campaign strategy's spend.
  const cs = useMemo(() => {
    const m = new Map(conversionStats(rows).map((s) => [s.key, s]));
    return { conversations: m.get("conversations")!, whatsapp: m.get("whatsapp")!, leadGrouped: m.get("leadGrouped")! };
  }, [rows]);

  const [trendKey, setTrendKey] = useState("cpm");
  const [objKey, setObjKey] = useState("cpm");
  const tm = RATE_METRICS.find((m) => m.key === trendKey)!;
  const om = OBJ_METRICS.find((m) => m.key === objKey)!;

  const dailyRates = useMemo(
    () =>
      byDate(rows).map((g) => {
        const dd = derive(g.totals);
        return {
          date: g.key,
          cpm: +dd.cpm.toFixed(2),
          cpcLink: +dd.cpcLink.toFixed(2),
          ctrLink: +dd.ctrLink.toFixed(3),
          ctr: +dd.ctr.toFixed(3),
          cpv: +dd.cpv.toFixed(3),
          vtr: +dd.vtr.toFixed(2),
          frequency: +dd.frequency.toFixed(2),
          engagementRate: +dd.engagementRate.toFixed(2),
        } as Record<string, number | string>;
      }),
    [rows]
  );

  const objBars = useMemo(
    () =>
      objectives
        .map((o) => ({ name: o.key, value: +((o.derived as any)[om.key] as number).toFixed(2), color: o.color }))
        .filter((r) => isFinite(r.value) && r.value > 0)
        .sort((a, b) => (om.kind === "pct" ? b.value - a.value : a.value - b.value)),
    [objectives, om]
  );

  // 5 headline metrics (the ones the client cares about)
  const tiles = [
    { l: "CPM", v: brl(d.cpm), hint: "custo por mil impressões", color: "#465907" },
    { l: "CPC (link)", v: brl(d.cpcLink), hint: "custo por clique no link", color: "#e0a010" },
    { l: "CTR (link)", v: pct(d.ctrLink), hint: "taxa de cliques no link", color: "#2f80c4" },
    { l: "CPV", v: brl(d.cpv, 3), hint: "custo por view de vídeo", color: "#cf3a5f" },
    { l: "VTR", v: pct(d.vtr), hint: "thruplays ÷ impressões", color: "#14a58c" },
  ];
  // secondary metrics shown as a slim inline strip — cost per conversion action,
  // one per strategy, kept separate (never a blended "custo por conversão")
  const secondary = [
    { l: "Frequência", v: `${dec(d.frequency, 2)}x`, color: "#8a63d4" },
    { l: "Custo / WhatsApp", v: brl(cs.conversations.cost), color: "#5a8f22" },
    { l: "Custo / Lead LP", v: brl(cs.whatsapp.cost), color: "#e0a010" },
    { l: "Custo / Lead Formulário", v: brl(cs.leadGrouped.cost), color: "#cf3a5f" },
  ];

  // Table by objective
  type ORow = (typeof objectives)[number];
  const cols: Column<ORow>[] = [
    {
      key: "obj",
      header: "Campanha",
      render: (r) => (
        <span className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: r.color }} />
          {r.key}
        </span>
      ),
      sortValue: (r) => r.key,
    },
    { key: "spend", header: "Investido", align: "right", render: (r) => brl(r.totals.spend), sortValue: (r) => r.totals.spend },
    { key: "cpm", header: "CPM", align: "right", render: (r) => brl(r.derived.cpm), sortValue: (r) => r.derived.cpm },
    { key: "cpc", header: "CPC link", align: "right", render: (r) => brl(r.derived.cpcLink), sortValue: (r) => r.derived.cpcLink },
    { key: "ctr", header: "CTR link", align: "right", render: (r) => pct(r.derived.ctrLink), sortValue: (r) => r.derived.ctrLink },
    { key: "cpv", header: "CPV", align: "right", render: (r) => (r.totals.videoViews ? brl(r.derived.cpv, 3) : "—"), sortValue: (r) => r.derived.cpv },
    { key: "vtr", header: "VTR", align: "right", render: (r) => (r.totals.videoViews ? pct(r.derived.vtr) : "—"), sortValue: (r) => r.derived.vtr },
    { key: "freq", header: "Freq.", align: "right", render: (r) => `${dec(r.derived.frequency, 2)}x`, sortValue: (r) => r.derived.frequency },
    { key: "cpl", header: "CPL", align: "right", render: (r) => (r.totals.leads ? brl(r.derived.cpl) : "—"), sortValue: (r) => r.derived.cpl },
  ];

  const trendTip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <TipShell
        title={shortDate(String(label))}
        rows={[{ label: tm.label, value: fmtKind(tm.kind, payload[0].value), color: tm.color }]}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Metric tiles */}
      <Reveal>
        <SectionTitle hint="indicadores de custo e eficiência do período">Custos e taxas</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {tiles.map((m) => (
            <Card key={m.l} className="relative overflow-hidden p-4">
              <span className="absolute left-0 top-4 h-7 w-[3px] rounded-full" style={{ background: m.color }} />
              <div className="pl-2 text-[12px] font-medium text-[var(--text-secondary)]">{m.l}</div>
              <div className="mt-1.5 pl-2 text-[23px] font-semibold leading-none tnum text-[var(--text-primary)]">{m.v}</div>
              <div className="mt-1.5 pl-2 text-[11px] text-[var(--text-muted)]">{m.hint}</div>
            </Card>
          ))}
        </div>
        {/* secondary metrics — slim strip so the top isn't a wall of KPI cards */}
        <Card className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-3">
          {secondary.map((m) => (
            <div key={m.l} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: m.color }} />
              <span className="text-[12px] text-[var(--text-secondary)]">{m.l}</span>
              <span className="text-[14px] font-semibold tnum text-[var(--text-primary)]">{m.v}</span>
            </div>
          ))}
        </Card>
      </Reveal>

      {/* Google Search costs */}
      {gT.rows > 0 && (
        <Reveal delay={40}>
          <SectionTitle hint="rede de pesquisa · custo por clique e impressão">Custos — Google Rede de Pesquisa</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {googleTiles.map((m) => (
              <Card key={m.l} className="relative overflow-hidden p-4">
                <span className="absolute left-0 top-4 h-7 w-[3px] rounded-full" style={{ background: "#e0a010" }} />
                <div className="pl-2 text-[12px] font-medium text-[var(--text-secondary)]">{m.l}</div>
                <div className="mt-1.5 pl-2 text-[23px] font-semibold leading-none tnum text-[var(--text-primary)]">{m.v}</div>
                <div className="mt-1.5 pl-2 text-[11px] text-[var(--text-muted)]">{m.hint}</div>
              </Card>
            ))}
          </div>
        </Reveal>
      )}

      {/* Trend + per-objective */}
      <Reveal delay={60}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard
            className="lg:col-span-2"
            title="Evolução das taxas no período"
            subtitle="Acompanhe a métrica escolhida dia a dia"
            accent={tm.color}
            right={
              <Dropdown
                size="sm"
                swatch
                align="right"
                options={RATE_METRICS.map((m) => ({ value: m.key, label: m.label, color: m.color }))}
                value={trendKey}
                onChange={setTrendKey}
              />
            }
          >
            <div style={{ height: 258 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyRates} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={tm.color} stopOpacity={0.24} />
                      <stop offset="100%" stopColor={tm.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                  <YAxis tickFormatter={axisKind(tm.kind)} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={false} width={56} />
                  <Tooltip content={trendTip} />
                  <Area isAnimationActive={false} type="monotone" dataKey={tm.key} stroke={tm.color} strokeWidth={2.5} fill="url(#gRate)" dot={{ r: 2.5, fill: tm.color, stroke: "var(--surface-1)", strokeWidth: 1.5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard
            title="Custo por campanha"
            subtitle={`Comparativo de ${om.label}`}
            accent="#b08a3e"
            right={
              <Dropdown
                size="sm"
                align="right"
                options={OBJ_METRICS.map((m) => ({ value: m.key, label: m.label }))}
                value={objKey}
                onChange={setObjKey}
              />
            }
          >
            <div style={{ height: 258 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={objBars} margin={{ top: 4, right: 58, left: 4, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke={CHART.grid} />
                  <XAxis type="number" tickFormatter={axisKind(om.kind)} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10.5, fill: CHART.textSecondary }} tickLine={false} axisLine={false} width={96} />
                  <Tooltip cursor={{ fill: "rgba(70,89,7,0.06)" }} content={makeTooltip((_n, v, p) => ({ label: om.label, value: fmtKind(om.kind, v), color: (p as any).color }))} />
                  <Bar isAnimationActive={false} dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {objBars.map((b) => (
                      <Cell key={b.name} fill={b.color} />
                    ))}
                    <LabelList dataKey="value" position="right" formatter={(v: any) => fmtKind(om.kind, v)} style={{ fontSize: 10.5, fill: CHART.textSecondary, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </Reveal>

      {/* Full table */}
      <Reveal delay={120}>
        <SectionTitle hint="ordene por qualquer coluna">Detalhamento de custos por campanha</SectionTitle>
        <Card className="p-1.5">
          <DataTable columns={cols} data={objectives} rowKey={(r) => r.key} initialSort={{ key: "spend", dir: "desc" }} />
        </Card>
      </Reveal>
    </div>
  );
}
