"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
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
import { Funnel } from "@/components/charts/Funnel";
import { makeTooltip } from "@/components/charts/ChartTooltip";
import { sum, derive } from "@/lib/metrics";
import { objectiveBreakdown } from "@/lib/aggregate";
import { brl, int, pct } from "@/lib/format";
import { CHART } from "@/lib/theme";

export default function CampanhasPage() {
  return (
    <Loadable>
      <Campanhas />
    </Loadable>
  );
}

function Campanhas() {
  const { rows } = useData();
  const t = useMemo(() => sum(rows), [rows]);
  const objectives = useMemo(() => objectiveBreakdown(rows), [rows]);

  const totalConv = t.whatsapp + t.conversations + t.leads;
  const d = derive(t);

  // Stacked conversions by campaign & type
  const convStack = objectives.map((o) => ({
    name: o.key,
    WhatsApp: o.totals.whatsapp,
    Conversas: o.totals.conversations,
    Leads: o.totals.leads,
    total: o.totals.whatsapp + o.totals.conversations + o.totals.leads,
    color: o.color,
  }));
  const CONV_COLORS = { WhatsApp: "#5a8f22", Conversas: "#14a58c", Leads: "#cf3a5f" };

  // Radial share of conversions
  const radial = objectives
    .map((o) => ({
      name: o.key,
      value: o.totals.whatsapp + o.totals.conversations + o.totals.leads,
      fill: o.color,
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  // Cost per result per campaign
  const costPer = objectives
    .map((o) => {
      const c = o.totals.whatsapp + o.totals.conversations + o.totals.leads;
      return { name: o.key, value: c > 0 ? +(o.totals.spend / c).toFixed(2) : 0, color: o.color, conv: c };
    })
    .filter((r) => r.conv > 0)
    .sort((a, b) => a.value - b.value);

  const bestConv = [...objectives].sort(
    (a, b) =>
      b.totals.whatsapp + b.totals.conversations + b.totals.leads -
      (a.totals.whatsapp + a.totals.conversations + a.totals.leads)
  )[0];

  const stackTip = makeTooltip((name, value) =>
    value > 0 ? { label: name, value: int(value), color: (CONV_COLORS as any)[name] } : null
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Reveal>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="p-4">
            <div className="text-[12px] text-[var(--text-secondary)]">Conversões totais</div>
            <div className="mt-1 text-[26px] font-semibold text-[var(--text-primary)]">{int(totalConv)}</div>
            <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">WhatsApp + leads + conversas</div>
          </Card>
          <Card className="p-4">
            <div className="text-[12px] text-[var(--text-secondary)]">Custo por conversão</div>
            <div className="mt-1 text-[26px] font-semibold text-[var(--text-primary)]">{brl(d.costPerConversion)}</div>
            <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">média entre campanhas</div>
          </Card>
          <Card className="p-4">
            <div className="text-[12px] text-[var(--text-secondary)]">Campanha destaque</div>
            <div className="mt-1 truncate text-[18px] font-semibold" style={{ color: bestConv?.color }}>{bestConv?.key}</div>
            <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">mais conversões no período</div>
          </Card>
          <Card className="p-4">
            <div className="text-[12px] text-[var(--text-secondary)]">Taxa de conversão</div>
            <div className="mt-1 text-[26px] font-semibold text-[var(--text-primary)]">{pct(d.conversionRate)}</div>
            <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">sobre cliques no link</div>
          </Card>
        </div>
      </Reveal>

      {/* Stacked conversions + radial */}
      <Reveal delay={60}>
        <SectionTitle hint="volume e participação nos resultados">Resultados por campanha</SectionTitle>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard className="lg:col-span-2" title="Conversões por campanha e tipo" subtitle="Barras empilhadas por tipo de resultado" accent="#5a8f22">
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={convStack} margin={{ top: 4, right: 40, left: 4, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke={CHART.grid} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: CHART.textSecondary }} tickLine={false} axisLine={false} width={118} />
                  <Tooltip cursor={{ fill: "rgba(70,89,7,0.06)" }} content={stackTip} />
                  <Bar isAnimationActive={false} dataKey="WhatsApp" stackId="c" fill={CONV_COLORS.WhatsApp} maxBarSize={26} />
                  <Bar isAnimationActive={false} dataKey="Conversas" stackId="c" fill={CONV_COLORS.Conversas} maxBarSize={26} />
                  <Bar isAnimationActive={false} dataKey="Leads" stackId="c" fill={CONV_COLORS.Leads} maxBarSize={26} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="total" position="right" formatter={(v: any) => (v > 0 ? int(v) : "")} style={{ fontSize: 11, fill: CHART.textSecondary, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11.5px] text-[var(--text-secondary)]">
              {Object.entries(CONV_COLORS).map(([k, c]) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c }} /> {k}
                </span>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Participação nas conversões" subtitle="Share de cada campanha" accent="#e56a2b">
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="30%" outerRadius="100%" data={radial} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, Math.max(...radial.map((r) => r.value), 1)]} tick={false} />
                  <RadialBar isAnimationActive={false} background={{ fill: "var(--surface-2)" }} dataKey="value" cornerRadius={6}>
                    {radial.map((r) => (
                      <Cell key={r.name} fill={r.fill} />
                    ))}
                  </RadialBar>
                  <Tooltip content={makeTooltip((_n, v, p) => ({ label: String((p as any).name), value: `${int(v)} conv.`, color: (p as any).fill }))} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1 px-1">
              {radial.map((r) => (
                <li key={r.name} className="flex items-center gap-2 text-[12px]">
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: r.fill }} />
                  <span className="truncate text-[var(--text-secondary)]">{r.name}</span>
                  <span className="ml-auto font-semibold tnum text-[var(--text-primary)]">{int(r.value)}</span>
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>
      </Reveal>

      {/* Per-campaign funnels */}
      <Reveal delay={120}>
        <SectionTitle hint="da entrega ao resultado, campanha a campanha">Funis por campanha</SectionTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {objectives.map((o) => (
            <ChartCard key={o.key} title={o.key} subtitle={`${brl(o.totals.spend, 0)} investidos`} accent={o.color}>
              <Funnel
                stages={[
                  { label: "Impressões", value: o.totals.impressions, color: "#2f80c4" },
                  { label: "Alcance", value: o.totals.reach, color: "#14a58c" },
                  { label: "Cliques no link", value: o.totals.linkClicks, color: "#e0a010" },
                  {
                    label: "Conversões",
                    value: o.totals.whatsapp + o.totals.conversations + o.totals.leads,
                    color: "#cf3a5f",
                  },
                ]}
              />
            </ChartCard>
          ))}
        </div>
      </Reveal>

      {/* Cost per result */}
      <Reveal delay={160}>
        <ChartCard title="Custo por conversão por campanha" subtitle="Investimento ÷ conversões — menor é melhor" accent="#b08a3e">
          <div style={{ height: 60 + costPer.length * 46 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={costPer} margin={{ top: 4, right: 64, left: 4, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke={CHART.grid} />
                <XAxis type="number" tickFormatter={(v) => brl(v, 0)} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: CHART.textSecondary }} tickLine={false} axisLine={false} width={118} />
                <Tooltip cursor={{ fill: "rgba(70,89,7,0.06)" }} content={makeTooltip((_n, v, p) => ({ label: "Custo/conversão", value: brl(v), color: (p as any).color }))} />
                <Bar isAnimationActive={false} dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={26}>
                  {costPer.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                  <LabelList dataKey="value" position="right" formatter={(v: any) => brl(v)} style={{ fontSize: 11, fill: CHART.textSecondary, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </Reveal>
    </div>
  );
}
