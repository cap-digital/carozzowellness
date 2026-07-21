"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
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
import { DataTable, Column } from "@/components/ui/DataTable";
import { Sparkline } from "@/components/ui/Sparkline";
import { Badge } from "@/components/ui/Badge";
import { makeTooltip } from "@/components/charts/ChartTooltip";
import { sum, derive, groupSum, byDate } from "@/lib/metrics";
import { objectiveBreakdown, placementBreakdown } from "@/lib/aggregate";
import { brl, int, pct, compact, shortDate } from "@/lib/format";
import { CHART, OBJECTIVE_COLOR } from "@/lib/theme";
import { Aperture } from "lucide-react";

export default function MetaPage() {
  return (
    <Loadable>
      <Meta />
    </Loadable>
  );
}

function Meta() {
  const { rows } = useData();
  const t = useMemo(() => sum(rows), [rows]);
  const d = useMemo(() => derive(t), [t]);
  const objectives = useMemo(() => objectiveBreakdown(rows), [rows]);
  const placements = useMemo(() => placementBreakdown(rows), [rows]);

  // Pivot: daily spend stacked by objective
  const objKeys = objectives.map((o) => o.key);
  const stacked = useMemo(() => {
    const days = byDate(rows);
    return days.map((g) => {
      const rec: Record<string, number | string> = { date: g.key };
      for (const k of objKeys) rec[k] = 0;
      for (const r of g.rows) rec[r.objective] = (rec[r.objective] as number) + r.spend;
      for (const k of objKeys) rec[k] = +(rec[k] as number).toFixed(2);
      return rec;
    });
  }, [rows, objKeys]);

  // Small multiples: spend trend per objective
  const objTrends = useMemo(
    () =>
      objectives.map((o) => {
        const series = byDate(o.rows).map((g) => g.totals.spend);
        return { key: o.key, color: o.color, totals: o.totals, derived: o.derived, series };
      }),
    [objectives]
  );

  // Radar: placement profiles, normalized 0-100
  const radar = useMemo(() => {
    const axes: { key: string; label: string; invert: boolean; raw?: boolean }[] = [
      { key: "ctrLink", label: "CTR", invert: false },
      { key: "engagementRate", label: "Engaj.", invert: false },
      { key: "reach", label: "Alcance", invert: false, raw: true },
      { key: "linkClicks", label: "Cliques", invert: false, raw: true },
      { key: "cpm", label: "CPM baixo", invert: true },
    ];
    return axes.map((ax) => {
      const rec: Record<string, number | string> = { axis: ax.label };
      const vals = placements.map((p) =>
        ax.raw ? (p.totals as any)[ax.key] : (p.derived as any)[ax.key]
      );
      const max = Math.max(...vals, 0.0001);
      const min = Math.min(...vals);
      placements.forEach((p, i) => {
        const v = vals[i];
        const score = ax.invert
          ? max === min ? 100 : ((max - v) / (max - min)) * 100
          : (v / max) * 100;
        rec[p.key] = +score.toFixed(1);
      });
      return rec;
    });
  }, [placements]);

  const conversions = t.whatsapp + t.conversations + t.leads;

  const stackTip = makeTooltip(
    (name, value) => (value > 0 ? { label: name, value: brl(value), color: OBJECTIVE_COLOR[name] ?? "#888" } : null),
    (label) => shortDate(String(label))
  );

  // Campaign table rows
  const table = useMemo(() => {
    return groupSum(rows, (r) => r.objective)
      .map((g) => ({
        objective: g.key,
        totals: g.totals,
        derived: derive(g.totals),
        trend: byDate(g.rows).map((x) => x.totals.spend),
        color: OBJECTIVE_COLOR[g.key] ?? "#888",
      }))
      .sort((a, b) => b.totals.spend - a.totals.spend);
  }, [rows]);

  type TRow = (typeof table)[number];
  const cols: Column<TRow>[] = [
    {
      key: "objective",
      header: "Objetivo",
      render: (r) => (
        <span className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: r.color }} />
          {r.objective}
        </span>
      ),
      sortValue: (r) => r.objective,
    },
    { key: "spend", header: "Investido", align: "right", render: (r) => brl(r.totals.spend), sortValue: (r) => r.totals.spend },
    { key: "impr", header: "Impressões", align: "right", render: (r) => int(r.totals.impressions), sortValue: (r) => r.totals.impressions },
    { key: "cpm", header: "CPM", align: "right", render: (r) => brl(r.derived.cpm), sortValue: (r) => r.derived.cpm },
    { key: "ctr", header: "CTR", align: "right", render: (r) => pct(r.derived.ctrLink), sortValue: (r) => r.derived.ctrLink },
    { key: "clicks", header: "Cliques link", align: "right", render: (r) => int(r.totals.linkClicks), sortValue: (r) => r.totals.linkClicks },
    { key: "cpc", header: "CPC", align: "right", render: (r) => brl(r.derived.cpcLink), sortValue: (r) => r.derived.cpcLink },
    {
      key: "trend",
      header: "Tendência",
      align: "right",
      render: (r) => (
        <div className="flex justify-end">
          <Sparkline data={r.trend.length > 1 ? r.trend : [0, 0]} color={r.color} width={78} height={26} fill={false} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Channel ribbon */}
      <Reveal>
        <Card className="overflow-hidden">
          <div className="h-1 w-full bg-[#2f80c4]" />
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#3a6fd8] to-[#8a3ab9] text-white">
                <Aperture size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg text-[var(--text-primary)]">Meta Ads</h2>
                  <Badge color="#0ca30c" dot>
                    Conectado
                  </Badge>
                </div>
                <p className="text-[12.5px] text-[var(--text-secondary)]">
                  Facebook & Instagram · {int(t.rows)} registros · Carozzo Wellness
                </p>
              </div>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--border)] pt-4 sm:grid-cols-3 md:border-l md:border-t-0 md:pl-6 md:pt-0 lg:grid-cols-5">
              {[
                { l: "Investido", v: brl(t.spend, 0) },
                { l: "Impressões", v: compact(t.impressions) },
                { l: "CTR link", v: pct(d.ctrLink) },
                { l: "Cliques no link", v: int(t.linkClicks) },
                { l: "Conversões", v: int(conversions) },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{s.l}</div>
                  <div className="mt-0.5 text-[18px] font-semibold tnum text-[var(--text-primary)]">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </Reveal>

      {/* Stacked spend by objective */}
      <Reveal delay={60}>
        <SectionTitle hint="composição diária do investimento">Investimento por objetivo</SectionTitle>
        <ChartCard
          title="Distribuição diária do gasto entre objetivos"
          subtitle="Colunas empilhadas — cada cor é uma campanha"
          accent="#2f80c4"
        >
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stacked} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                <YAxis tickFormatter={(v) => brl(v, 0)} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={false} width={54} />
                <Tooltip content={stackTip} cursor={{ fill: "rgba(70,89,7,0.06)" }} />
                {objKeys.map((k, i) => (
                  <Bar key={k} isAnimationActive={false} dataKey={k} stackId="s" fill={OBJECTIVE_COLOR[k] ?? "#888"} maxBarSize={40} radius={i === objKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11.5px] text-[var(--text-secondary)]">
            {objKeys.map((k) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: OBJECTIVE_COLOR[k] ?? "#888" }} />
                {k}
              </span>
            ))}
          </div>
        </ChartCard>
      </Reveal>

      {/* Small multiples */}
      <Reveal delay={120}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {objTrends.map((o) => (
            <Card key={o.key} className="p-3.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: o.color }} />
                <span className="truncate text-[11.5px] font-semibold text-[var(--text-secondary)]">{o.key}</span>
              </div>
              <div className="mt-1 text-[19px] font-semibold tnum text-[var(--text-primary)]">{brl(o.totals.spend, 0)}</div>
              <div className="mt-1.5 -mx-1 h-[38px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={o.series.map((v, i) => ({ i, v }))} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`sm-${o.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={o.color} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={o.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area isAnimationActive={false} type="monotone" dataKey="v" stroke={o.color} strokeWidth={1.8} fill={`url(#sm-${o.key})`} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                <span>CTR {pct(o.derived.ctrLink, 1)}</span>
                <span>CPM {brl(o.derived.cpm, 0)}</span>
              </div>
            </Card>
          ))}
        </div>
      </Reveal>

      {/* Radar + placement bars */}
      <Reveal delay={160}>
        <SectionTitle hint="onde os anúncios são exibidos">Colocações (placements)</SectionTitle>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Perfil de desempenho por colocação" subtitle="Índice 0–100 relativo entre placements" accent="#8a63d4">
            <div style={{ height: 264 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar} outerRadius="72%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                  <PolarGrid stroke={CHART.grid} />
                  <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: CHART.textSecondary }} />
                  {placements.map((p) => (
                    <Radar
                      key={p.key}
                      isAnimationActive={false}
                      name={p.key}
                      dataKey={p.key}
                      stroke={p.color}
                      fill={p.color}
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  ))}
                  <Tooltip content={makeTooltip((n, v) => ({ label: n, value: `${v.toFixed(0)}/100`, color: placements.find((p) => p.key === n)?.color }))} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11.5px] text-[var(--text-secondary)]">
              {placements.map((p) => (
                <span key={p.key} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                  {p.key}
                </span>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Cliques no link e CTR por colocação" subtitle="Volume de cliques com a taxa de cliques ao lado" accent="#e0a010">
            <div style={{ height: 264 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={placements.map((p) => ({ name: p.key, clicks: p.totals.linkClicks, ctr: +p.derived.ctrLink.toFixed(2), color: p.color }))}
                  margin={{ top: 4, right: 60, left: 4, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} stroke={CHART.grid} />
                  <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: CHART.textSecondary }} tickLine={false} axisLine={false} width={96} />
                  <Tooltip cursor={{ fill: "rgba(70,89,7,0.06)" }} content={makeTooltip((n, v, p) => n === "clicks" ? { label: "Cliques no link", value: int(v), color: p.color as string } : null, (l, p) => String((p as any)?.name))} />
                  <Bar isAnimationActive={false} dataKey="clicks" radius={[0, 4, 4, 0]} maxBarSize={26}>
                    {placements.map((p) => (
                      <Cell key={p.key} fill={p.color} />
                    ))}
                    <LabelList dataKey="ctr" position="right" formatter={(v: any) => `${v.toFixed(2)}% CTR`} style={{ fontSize: 10.5, fill: CHART.textSecondary, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </Reveal>

      {/* Campaign table */}
      <Reveal delay={200}>
        <SectionTitle hint="ordene por qualquer coluna">Campanhas em detalhe</SectionTitle>
        <Card className="p-1.5">
          <DataTable
            columns={cols}
            data={table}
            rowKey={(r) => r.objective}
            initialSort={{ key: "spend", dir: "desc" }}
          />
        </Card>
      </Reveal>
    </div>
  );
}
