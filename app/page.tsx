"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  AreaChart,
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
import { ChartCard, SectionTitle } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { Donut } from "@/components/charts/Donut";
import { Funnel } from "@/components/charts/Funnel";
import { makeTooltip } from "@/components/charts/ChartTooltip";
import { sum, derive } from "@/lib/metrics";
import { dailySeries, objectiveBreakdown } from "@/lib/aggregate";
import { brl, int, compact, compactBRL, pct, shortDate } from "@/lib/format";
import { CHART } from "@/lib/theme";
import { Eye, Users, MousePointerClick, Target } from "lucide-react";

export default function OverviewPage() {
  return (
    <Loadable>
      <Overview />
    </Loadable>
  );
}

function Overview() {
  const { rows } = useData();

  const t = useMemo(() => sum(rows), [rows]);
  const d = useMemo(() => derive(t), [t]);
  const daily = useMemo(() => dailySeries(rows), [rows]);
  const objectives = useMemo(() => objectiveBreakdown(rows), [rows]);

  const cumulative = useMemo(() => {
    let acc = 0;
    return daily.map((p) => {
      acc += p.spend;
      return { ...p, cum: +acc.toFixed(2) };
    });
  }, [daily]);

  const conversions = t.whatsapp + t.conversations + t.leads;
  const spark = (k: keyof (typeof daily)[number]) => daily.map((p) => Number(p[k]));

  const funnelStages = [
    { label: "Impressões", value: t.impressions, color: "#2f80c4" },
    { label: "Alcance", value: t.reach, color: "#14a58c" },
    { label: "Cliques", value: t.clicks, color: "#5a8f22" },
    { label: "Cliques no link", value: t.linkClicks, color: "#e0a010" },
    { label: "Conversões", value: conversions, color: "#cf3a5f" },
  ];

  const spendLineTip = makeTooltip(
    (name, value) =>
      name === "spend"
        ? { label: "Investimento no dia", value: brl(value), color: "#465907" }
        : { label: "Acumulado", value: brl(value), color: "#b08a3e" },
    (label) => shortDate(String(label))
  );

  const deliveryTip = makeTooltip(
    (name, value) => ({
      label: name === "impressions" ? "Impressões" : "Alcance",
      value: int(value),
      color: name === "impressions" ? "#2f80c4" : "#14a58c",
    }),
    (label) => shortDate(String(label))
  );

  return (
    <div className="space-y-6">
      {/* Hero + KPIs */}
      <Reveal>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-4 relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[#26331a] to-[#161f0d] p-5 text-[#f3f1e7] shadow-card">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#5a7020]/25 blur-2xl" />
            <div className="relative">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#c9a463]">
                Investimento total em mídia
              </p>
              <p className="mt-2 font-display text-[42px] font-semibold leading-none">
                {brl(t.spend)}
              </p>
              <p className="mt-2 text-[12.5px] text-white/60">
                {int(t.impressions)} impressões · {int(t.reach)} pessoas alcançadas
              </p>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[12.5px]">
                <div>
                  <span className="text-white/50">CPM médio</span>
                  <div className="font-semibold tnum">{brl(d.cpm)}</div>
                </div>
                <div>
                  <span className="text-white/50">CTR</span>
                  <div className="font-semibold tnum">{pct(d.ctr)}</div>
                </div>
                <div>
                  <span className="text-white/50">Frequência</span>
                  <div className="font-semibold tnum">{d.frequency.toFixed(2)}x</div>
                </div>
              </div>
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
            <Kpi
              label="Conversões"
              value={int(conversions)}
              sub={`${int(t.whatsapp)} WhatsApp · ${int(t.leads)} leads`}
              color="#cf3a5f"
              icon={<Target size={14} />}
              spark={spark("clicks")}
            />
          </div>
        </div>
      </Reveal>

      {/* Combined bar+line & donut */}
      <Reveal delay={60}>
        <SectionTitle hint="ritmo de veiculação e mix de objetivos">Desempenho ao longo do período</SectionTitle>
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
            title="Investimento por objetivo"
            subtitle="Distribuição do gasto entre campanhas"
            accent="#2f80c4"
          >
            <Donut
              data={objectives.map((o) => ({ name: o.key, value: o.totals.spend, color: o.color }))}
              centerValue={compactBRL(t.spend)}
              centerLabel="investimento"
              format={(v) => brl(v, 0)}
            />
          </ChartCard>
        </div>
      </Reveal>

      {/* Funnel & efficiency */}
      <Reveal delay={120}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title="Jornada de conversão"
            subtitle="Da impressão à conversão, com taxa entre etapas"
            accent="#14a58c"
          >
            <div className="pt-1">
              <Funnel stages={funnelStages} />
            </div>
          </ChartCard>

          <ChartCard
            title="Custo por mil impressões (CPM) por objetivo"
            subtitle="Quanto custa alcançar cada público — menor é melhor"
            accent="#b08a3e"
          >
            <div style={{ height: 232 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={objectives.map((o) => ({ name: o.key, cpm: +o.derived.cpm.toFixed(2), color: o.color }))}
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
                    {objectives.map((o) => (
                      <Cell key={o.key} fill={o.color} />
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

      {/* Delivery area */}
      <Reveal delay={180}>
        <ChartCard
          title="Entrega diária: impressões e alcance"
          subtitle="Volume de exibições versus pessoas únicas alcançadas"
          accent="#2f80c4"
        >
          <div style={{ height: 236 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="gImp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2f80c4" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#2f80c4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gReach" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14a58c" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#14a58c" stopOpacity={0} />
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
                  tickFormatter={compact}
                  tick={{ fontSize: 11, fill: CHART.textMuted }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip content={deliveryTip} />
                <Area isAnimationActive={false} type="monotone" dataKey="impressions" stroke="#2f80c4" strokeWidth={2} fill="url(#gImp)" />
                <Area isAnimationActive={false} type="monotone" dataKey="reach" stroke="#14a58c" strokeWidth={2} fill="url(#gReach)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex items-center gap-4 px-1 text-[11.5px] text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <span className="h-[3px] w-3.5 rounded-full bg-[#2f80c4]" /> Impressões
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-[3px] w-3.5 rounded-full bg-[#14a58c]" /> Alcance
            </span>
          </div>
        </ChartCard>
      </Reveal>
    </div>
  );
}
