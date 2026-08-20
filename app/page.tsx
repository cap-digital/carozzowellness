"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  BarChart,
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
import { Card, ChartCard, SectionTitle } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { Donut } from "@/components/charts/Donut";
import { Funnel } from "@/components/charts/Funnel";
import { Dropdown } from "@/components/ui/Dropdown";
import { makeTooltip, TipShell } from "@/components/charts/ChartTooltip";
import { sum, derive } from "@/lib/metrics";
import { dailySeries, objectiveBreakdown, conversionStats } from "@/lib/aggregate";
import { gaSum, gaDerive, gaDaily } from "@/lib/googleAds";
import { platformAggs, combinedTotals, combinedDailySpend } from "@/lib/combined";
import { brl, int, compact, compactBRL, pct, shortDate } from "@/lib/format";
import { CHART } from "@/lib/theme";
import { Eye, Users, MousePointerClick } from "lucide-react";

// Selectable metrics for the daily comparison chart.
type Kind = "money" | "int" | "pct";
interface DeliveryMetric {
  key: string;
  label: string;
  color: string;
  kind: Kind;
}
const DELIVERY_METRICS: DeliveryMetric[] = [
  { key: "impressions", label: "Impressões", color: "#2f80c4", kind: "int" },
  { key: "reach", label: "Alcance", color: "#14a58c", kind: "int" },
  { key: "clicks", label: "Cliques", color: "#5a8f22", kind: "int" },
  { key: "linkClicks", label: "Cliques no link", color: "#e0a010", kind: "int" },
  { key: "spend", label: "Investimento", color: "#465907", kind: "money" },
  { key: "engagement", label: "Engajamento", color: "#8a63d4", kind: "int" },
  { key: "videoViews", label: "Views de vídeo", color: "#cf3a5f", kind: "int" },
  { key: "conversations", label: "WhatsApp", color: "#5a8f22", kind: "int" },
  { key: "whatsapp", label: "Leads LP", color: "#e0a010", kind: "int" },
  { key: "leadGrouped", label: "Leads Formulário", color: "#cf3a5f", kind: "int" },
  { key: "cpm", label: "CPM", color: "#8f6d29", kind: "money" },
  { key: "ctr", label: "CTR", color: "#b08a3e", kind: "pct" },
  { key: "cpc", label: "CPC", color: "#324420", kind: "money" },
];
const axisFmt = (m: DeliveryMetric) => (v: number) =>
  m.kind === "money" ? compactBRL(v) : m.kind === "pct" ? `${v}%` : compact(v);
const fullFmt = (m: DeliveryMetric, v: number) =>
  m.kind === "money" ? brl(v) : m.kind === "pct" ? pct(v) : int(v);

export default function OverviewPage() {
  return (
    <Loadable>
      <Overview />
    </Loadable>
  );
}

function Overview() {
  const { rows, googleSearchRows, youtubeRows } = useData();

  const t = useMemo(() => sum(rows), [rows]);
  const d = useMemo(() => derive(t), [t]);
  const daily = useMemo(() => dailySeries(rows), [rows]);
  const objectives = useMemo(() => objectiveBreakdown(rows), [rows]);
  const convStats = useMemo(() => conversionStats(rows), [rows]);

  // Cross-platform: Meta + Programática + Google Search + YouTube
  const aggs = useMemo(() => platformAggs(t, googleSearchRows, youtubeRows), [t, googleSearchRows, youtubeRows]);
  const gSearch = useMemo(() => gaSum(googleSearchRows), [googleSearchRows]);
  const yt = useMemo(() => gaSum(youtubeRows), [youtubeRows]);
  const combined = combinedTotals(aggs);
  const totalSpend = combined.spend;
  const platforms = aggs; // Meta, Google, YouTube, Programática (zeros)

  // Combined daily spend across all platforms.
  const cumulative = useMemo(() => {
    const merged = combinedDailySpend(daily, gaDaily(googleSearchRows), gaDaily(youtubeRows));
    let acc = 0;
    return merged.map((p) => {
      acc += p.spend;
      return { date: p.date, spend: p.spend, cum: +acc.toFixed(2) };
    });
  }, [daily, googleSearchRows, youtubeRows]);

  const spark = (k: keyof (typeof daily)[number]) => daily.map((p) => Number(p[k]));

  // Investment split — Meta objectives + Google Search + YouTube as their own slices.
  const investSplit = [
    ...objectives.map((o) => ({ name: o.key, value: o.totals.spend, color: o.color })),
    ...(gSearch.spend > 0 ? [{ name: "Google Pesquisa", value: gSearch.spend, color: "#e56a2b" }] : []),
    ...(yt.spend > 0 ? [{ name: "YouTube", value: yt.spend, color: "#cf3a5f" }] : []),
  ];
  // CPM comparison across campaigns/platforms.
  const gSd = gaDerive(gSearch), ytd = gaDerive(yt);
  const cpmSplit = [
    ...objectives.map((o) => ({ name: o.key, cpm: +o.derived.cpm.toFixed(2), color: o.color })),
    ...(gSearch.impressions > 0 ? [{ name: "Google Pesquisa", cpm: +gSd.cpm.toFixed(2), color: "#e56a2b" }] : []),
    ...(yt.impressions > 0 ? [{ name: "YouTube", cpm: +ytd.cpm.toFixed(2), color: "#cf3a5f" }] : []),
  ];

  // Delivery funnel — combined impressions/clicks across all platforms.
  const funnelStages = [
    { label: "Impressões", value: combined.impressions, color: "#2f80c4" },
    { label: "Cliques", value: t.clicks + gSearch.clicks + yt.clicks, color: "#5a8f22" },
    { label: "Cliques no link", value: combined.clicks, color: "#e0a010" },
  ];

  const spendLineTip = makeTooltip(
    (name, value) =>
      name === "spend"
        ? { label: "Investimento no dia", value: brl(value), color: "#465907" }
        : { label: "Acumulado", value: brl(value), color: "#b08a3e" },
    (label) => shortDate(String(label))
  );

  // Selectable 2-metric daily comparison
  const [metricA, setMetricA] = useState("impressions");
  const [metricB, setMetricB] = useState("reach");
  const mA = DELIVERY_METRICS.find((m) => m.key === metricA)!;
  const mB = DELIVERY_METRICS.find((m) => m.key === metricB)!;
  const sameMetric = metricA === metricB;

  const deliveryTip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    const rows = [{ label: mA.label, value: fullFmt(mA, p[mA.key]), color: mA.color }];
    if (!sameMetric) rows.push({ label: mB.label, value: fullFmt(mB, p[mB.key]), color: mB.color });
    return <TipShell title={shortDate(String(label))} rows={rows} />;
  };

  return (
    <div className="space-y-6">
      {/* Hero + KPIs */}
      <Reveal>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-4 relative flex flex-col justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[#26331a] to-[#161f0d] p-6 text-[#f3f1e7] shadow-card">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#5a7020]/25 blur-2xl" />
            <div className="relative">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#c9a463]">
                Investimento total em mídia
              </p>
              <p className="mt-3 font-display text-[46px] font-semibold leading-none">
                {brl(totalSpend)}
              </p>
              <p className="mt-3 text-[12.5px] text-white/55">
                Meta {compactBRL(t.spend)} · Google {compactBRL(gSearch.spend)} · YouTube {compactBRL(yt.spend)}
              </p>
            </div>
          </div>

          <div className="xl:col-span-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi
              label="Impressões"
              value={compact(t.impressions)}
              sub={`CPM ${brl(d.cpm)}`}
              color="#2f80c4"
              icon={<Eye size={14} />}
              spark={spark("impressions")}
            />
            <Kpi
              label="Alcance"
              value={compact(t.reach)}
              sub={`${d.frequency.toFixed(2)}x frequência`}
              color="#14a58c"
              icon={<Users size={14} />}
              spark={spark("reach")}
            />
            <Kpi
              label="Cliques no link"
              value={int(t.linkClicks)}
              sub={`CPC ${brl(d.cpcLink)}`}
              color="#e0a010"
              icon={<MousePointerClick size={14} />}
              spark={spark("linkClicks")}
            />
            <div className="relative flex min-w-0 flex-col justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-card">
              <span className="absolute left-0 top-4 h-7 w-[3px] rounded-full bg-[#cf3a5f]" />
              <div className="flex items-center gap-1.5 pl-2 text-[12px] font-medium text-[var(--text-secondary)]">
                <span className="truncate">Conversões por tipo</span>
              </div>
              <div className="mt-2 space-y-1.5 pl-2">
                {convStats.map((m) => (
                  <div key={m.key} className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: m.color }} />
                    <span className="truncate text-[11.5px] text-[var(--text-muted)]">{m.short}</span>
                    <span className="ml-auto text-[14px] font-semibold tnum text-[var(--text-primary)]">
                      {int(m.count)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Per-platform summary */}
      <Reveal delay={40}>
        <SectionTitle hint="investimento e entrega por canal">Por plataforma</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {platforms.map((p) => {
            const empty = p.spend === 0 && p.impressions === 0;
            return (
              <Card key={p.key} className="relative overflow-hidden p-4">
                <span className="absolute left-0 top-4 h-9 w-[3px] rounded-full" style={{ background: p.color }} />
                <div className="flex items-center gap-2 pl-2">
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                  <span className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{p.label}</span>
                  <span className="ml-auto text-[15px] font-semibold tnum text-[var(--text-primary)]">{brl(p.spend, 0)}</span>
                </div>
                {empty ? (
                  <div className="mt-3 pl-2 text-[11.5px] text-[var(--text-muted)]">Sem dados no período</div>
                ) : (
                  <div className="mt-3 grid grid-cols-3 gap-2 pl-2">
                    {(p.key === "youtube"
                      ? [
                          { l: "Views", v: compact(p.views) },
                          { l: "CPV", v: brl(p.cpv, 3) },
                          { l: "VTR", v: pct(p.vtr) },
                        ]
                      : [
                          { l: "Impressões", v: compact(p.impressions) },
                          { l: "Cliques", v: int(p.clicks) },
                          { l: "CTR", v: pct(p.ctr) },
                        ]
                    ).map((s) => (
                      <div key={s.l}>
                        <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{s.l}</div>
                        <div className="mt-0.5 text-[14px] font-semibold tnum text-[var(--text-primary)]">{s.v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </Reveal>

      {/* Combined bar+line & donut */}
      <Reveal delay={60}>
        <SectionTitle hint="todas as plataformas · ritmo de veiculação e mix de campanhas">Desempenho ao longo do período</SectionTitle>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard
            className="lg:col-span-2"
            title="Investimento diário e acumulado"
            subtitle="Barras: gasto do dia · Linha: gasto acumulado (R$)"
            accent="#465907"
          >
            <div style={{ height: 288 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cumulative} margin={{ top: 12, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={shortDate}
                    tick={{ fontSize: 11, fill: CHART.textMuted }}
                    tickLine={false}
                    axisLine={{ stroke: CHART.axis }}
                  />
                  <YAxis
                    tickFormatter={(v) => compactBRL(v)}
                    tick={{ fontSize: 11, fill: CHART.textMuted }}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                  />
                  <Tooltip content={spendLineTip} cursor={{ fill: "rgba(70,89,7,0.06)" }} />
                  <Bar isAnimationActive={false} dataKey="spend" fill="#7c9440" radius={[4, 4, 0, 0]} maxBarSize={26} />
                  <Line
                    type="monotone"
                    dataKey="cum"
                    stroke="#b08a3e"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, fill: "#b08a3e", stroke: "var(--surface-1)", strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex items-center gap-4 px-1 text-[11.5px] text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-[#7c9440]" /> Gasto diário
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-[3px] w-3.5 rounded-full bg-[#b08a3e]" /> Acumulado
              </span>
            </div>
          </ChartCard>

          <ChartCard
            title="Investimento por campanha"
            subtitle="Distribuição do gasto — Meta e Google"
            accent="#2f80c4"
          >
            <Donut
              data={investSplit}
              centerValue={compactBRL(totalSpend)}
              centerLabel="investimento"
              format={(v) => brl(v, 0)}
              legendBelow
            />
          </ChartCard>
        </div>
      </Reveal>

      {/* Funnel & efficiency */}
      <Reveal delay={120}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title="Jornada de mídia"
            subtitle="Da impressão ao clique no link, com taxa entre etapas"
            accent="#14a58c"
          >
            <div className="pt-1">
              <Funnel stages={funnelStages} />
            </div>
          </ChartCard>

          <ChartCard
            title="Custo por mil impressões (CPM) por campanha"
            subtitle="Quanto custa alcançar cada público — Meta e Google · menor é melhor"
            accent="#b08a3e"
          >
            <div style={{ height: 232 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={cpmSplit}
                  margin={{ top: 4, right: 46, left: 4, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} stroke={CHART.grid} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => brl(v, 0)}
                    tick={{ fontSize: 11, fill: CHART.textMuted }}
                    tickLine={false}
                    axisLine={{ stroke: CHART.axis }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: CHART.textSecondary }}
                    tickLine={false}
                    axisLine={false}
                    width={104}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(70,89,7,0.06)" }}
                    content={makeTooltip((_n, v) => ({ label: "CPM", value: brl(v), color: "#b08a3e" }))}
                  />
                  <Bar isAnimationActive={false} dataKey="cpm" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {cpmSplit.map((o) => (
                      <Cell key={o.name} fill={o.color} />
                    ))}
                    <LabelList
                      dataKey="cpm"
                      position="right"
                      formatter={(v: any) => brl(v)}
                      style={{ fontSize: 11, fill: CHART.textSecondary, fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </Reveal>

      {/* Delivery — user picks 2 metrics */}
      <Reveal delay={180}>
        <ChartCard
          title="Entrega diária por métrica"
          subtitle="Escolha duas métricas para comparar dia a dia"
          accent={mA.color}
          right={
            <div className="flex flex-wrap items-center gap-2">
              <Dropdown
                size="sm"
                swatch
                options={DELIVERY_METRICS.map((m) => ({ value: m.key, label: m.label, color: m.color }))}
                value={metricA}
                onChange={setMetricA}
              />
              <span className="text-[12px] text-[var(--text-muted)]">vs</span>
              <Dropdown
                size="sm"
                swatch
                align="right"
                options={DELIVERY_METRICS.map((m) => ({ value: m.key, label: m.label, color: m.color }))}
                value={metricB}
                onChange={setMetricB}
              />
            </div>
          }
        >
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={daily} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="gMetricA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={mA.color} stopOpacity={0.24} />
                    <stop offset="100%" stopColor={mA.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tick={{ fontSize: 11, fill: CHART.textMuted }}
                  tickLine={false}
                  axisLine={{ stroke: CHART.axis }}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={axisFmt(mA)}
                  tick={{ fontSize: 11, fill: mA.color }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                {!sameMetric && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={axisFmt(mB)}
                    tick={{ fontSize: 11, fill: mB.color }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                  />
                )}
                <Tooltip content={deliveryTip} />
                <Area
                  isAnimationActive={false}
                  yAxisId="left"
                  type="monotone"
                  dataKey={mA.key}
                  stroke={mA.color}
                  strokeWidth={2.5}
                  fill="url(#gMetricA)"
                  dot={false}
                />
                {!sameMetric && (
                  <Line
                    isAnimationActive={false}
                    yAxisId="right"
                    type="monotone"
                    dataKey={mB.key}
                    stroke={mB.color}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, fill: mB.color, stroke: "var(--surface-1)", strokeWidth: 2 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-4 px-1 text-[11.5px] text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: mA.color }} /> {mA.label}{" "}
              <span className="text-[var(--text-muted)]">(área, esq.)</span>
            </span>
            {!sameMetric && (
              <span className="flex items-center gap-1.5">
                <span className="h-[3px] w-3.5 rounded-full" style={{ background: mB.color }} /> {mB.label}{" "}
                <span className="text-[var(--text-muted)]">(linha, dir.)</span>
              </span>
            )}
          </div>
        </ChartCard>
      </Reveal>
    </div>
  );
}
