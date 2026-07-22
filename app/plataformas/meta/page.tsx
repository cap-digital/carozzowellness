"use client";

import { useMemo } from "react";
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
import { DataTable, Column } from "@/components/ui/DataTable";
import { Sparkline } from "@/components/ui/Sparkline";
import { Badge } from "@/components/ui/Badge";
import { Donut } from "@/components/charts/Donut";
import { CreativeThumb } from "@/components/ui/CreativeThumb";
import { makeTooltip } from "@/components/charts/ChartTooltip";
import { sum, derive, groupSum, byDate } from "@/lib/metrics";
import { objectiveBreakdown, placementBreakdown, adBreakdown, totalConversions } from "@/lib/aggregate";
import { brl, int, pct, compact, compactBRL, resultNum, shortDate } from "@/lib/format";
import { CHART, OBJECTIVE_COLOR, FORMAT_COLOR } from "@/lib/theme";
import { Aperture, ExternalLink } from "lucide-react";

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

  // Top 3 creatives by investment
  const top3 = useMemo(() => adBreakdown(rows).slice(0, 3), [rows]);

  const conversions = useMemo(() => totalConversions(rows), [rows]);

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

      {/* Top 3 creatives — compact ranked list with mini thumbnails */}
      <Reveal delay={130}>
        <SectionTitle hint="maiores investimentos, com miniatura e link para o post">Top 3 criativos</SectionTitle>
        <Card className="px-4 py-1.5">
          <ul className="divide-y divide-[var(--border)]">
            {top3.map((c, i) => {
              const color = FORMAT_COLOR[c.format] ?? "#888";
              return (
                <li key={c.ad} className="flex flex-wrap items-center gap-x-4 gap-y-3 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                      style={{ background: `${color}1f`, color }}
                    >
                      {i + 1}
                    </span>
                    <CreativeThumb
                      thumb={c.thumb}
                      format={c.format}
                      color={color}
                      className="h-14 w-14 shrink-0 rounded-lg"
                      iconSize={16}
                      alt={c.ad}
                      href={c.permalink || undefined}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-semibold text-[var(--text-primary)]" title={c.ad}>
                        {c.ad.replace(/ - Carozzo Wellness/i, "").replace(/^AD /, "AD ")}
                      </div>
                      <div className="text-[11.5px] text-[var(--text-muted)]">{c.format}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 sm:gap-8">
                    <MiniStat label="Investido" value={brl(c.totals.spend, 0)} />
                    <MiniStat label="CTR" value={pct(c.derived.ctrLink)} />
                    <MiniStat label="Cliques" value={int(c.totals.linkClicks)} />
                    <MiniStat label={c.primary?.short ?? "Resultado"} value={resultNum(c.primaryValue)} color={color} />
                  </div>
                  {c.permalink && (
                    <a
                      href={c.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ver no Instagram"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      </Reveal>

      {/* Placements: investment donut + clicks/CTR bars */}
      <Reveal delay={200}>
        <SectionTitle hint="onde os anúncios são exibidos">Colocações (placements)</SectionTitle>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Investimento por colocação" subtitle="Distribuição do orçamento entre placements" accent="#8a63d4">
            <Donut
              data={placements.map((p) => ({ name: p.key, value: p.totals.spend, color: p.color }))}
              centerValue={compactBRL(t.spend)}
              centerLabel="investido"
              format={(v) => brl(v, 0)}
              height={200}
            />
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

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold tnum" style={{ color: color ?? "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}
