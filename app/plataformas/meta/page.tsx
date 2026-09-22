"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import { ConversionStats } from "@/components/ui/ConversionStats";
import { CreativeThumb } from "@/components/ui/CreativeThumb";
import { MultiDropdown } from "@/components/ui/MultiDropdown";
import { SegmentName } from "@/components/ui/SegmentName";
import { makeTooltip } from "@/components/charts/ChartTooltip";
import { sum, derive, groupSum, byDate, CONVERSION_METRICS, CONVERSION_OBJECTIVE } from "@/lib/metrics";
import { objectiveBreakdown, placementBreakdown, adBreakdown, adsetBreakdown } from "@/lib/aggregate";
import { brl, dec, int, pct, compact, compactBRL, resultNum, shortDate } from "@/lib/format";
import { CHART, OBJECTIVE_COLOR, FORMAT_COLOR } from "@/lib/theme";
import { Aperture, ExternalLink } from "lucide-react";
import type { Row } from "@/lib/types";

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

  // Daily series for each conversion action — kept SEPARATE (never summed), and
  // each counted only within its OWN campaign strategy (its métrica mãe).
  const convDaily = useMemo(
    () =>
      byDate(rows).map((g) => {
        const rec: Record<string, number | string> = { date: g.key, conversations: 0, whatsapp: 0, leadGrouped: 0 };
        for (const r of g.rows) {
          for (const m of CONVERSION_METRICS) {
            if (r.objective === CONVERSION_OBJECTIVE[m.key]) rec[m.key] = (rec[m.key] as number) + r[m.key];
          }
        }
        return rec;
      }),
    [rows]
  );

  const stackTip = makeTooltip(
    (name, value) => (value > 0 ? { label: name, value: brl(value), color: OBJECTIVE_COLOR[name] ?? "#888" } : null),
    (label) => shortDate(String(label))
  );

  const convLabel = Object.fromEntries(CONVERSION_METRICS.map((m) => [m.key, m]));
  const convTip = makeTooltip(
    (name, value) => {
      const m = convLabel[name];
      return m ? { label: m.label, value: int(value), color: m.color } : null;
    },
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
            <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--border)] pt-4 sm:grid-cols-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
              {[
                { l: "Investido", v: brl(t.spend, 0) },
                { l: "Impressões", v: compact(t.impressions) },
                { l: "CTR link", v: pct(d.ctrLink) },
                { l: "Cliques no link", v: int(t.linkClicks) },
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

      {/* Conversões separadas — cada ação com sua taxa e custo */}
      <Reveal delay={40}>
        <SectionTitle hint="cada ação de conversão com sua contagem, custo e taxa — nunca somadas">
          Conversões por tipo
        </SectionTitle>
        <ConversionStats rows={rows} />
      </Reveal>

      {/* Line chart: daily evolution of each conversion action */}
      <Reveal delay={80}>
        <ChartCard
          title="Evolução das conversões por tipo"
          subtitle="WhatsApp, Leads LP e Leads Formulário — cada linha é uma ação, dia a dia"
          accent="#5a8f22"
        >
          <div style={{ height: 288 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={convDaily} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tick={{ fontSize: 11, fill: CHART.textMuted }}
                  tickLine={false}
                  axisLine={{ stroke: CHART.axis }}
                />
                <YAxis
                  tickFormatter={(v) => compact(v)}
                  tick={{ fontSize: 11, fill: CHART.textMuted }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  allowDecimals={false}
                />
                <Tooltip content={convTip} cursor={{ stroke: CHART.axis, strokeDasharray: "3 3" }} />
                {CONVERSION_METRICS.map((m) => (
                  <Line
                    key={m.key}
                    isAnimationActive={false}
                    type="monotone"
                    dataKey={m.key}
                    stroke={m.color}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, fill: m.color, stroke: "var(--surface-1)", strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11.5px] text-[var(--text-secondary)]">
            {CONVERSION_METRICS.map((m) => (
              <span key={m.key} className="flex items-center gap-1.5">
                <span className="h-[3px] w-3.5 rounded-full" style={{ background: m.color }} />
                {m.label}
              </span>
            ))}
          </div>
        </ChartCard>
      </Reveal>

      {/* Stacked spend by objective */}
      <Reveal delay={120}>
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
                      <div className="break-words text-[13.5px] font-semibold leading-snug text-[var(--text-primary)]" title={c.ad}>
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

      {/* Ad set drill-down */}
      <Reveal delay={220}>
        <AdsetTable rows={rows} />
      </Reveal>
    </div>
  );
}

// ---- Ad set ("conjunto de anúncios") table ----------------------------------
// Campaign → ad set drill-down. Two multi-select filters narrow a long list
// (campaigns, then a searchable ad set picker scoped to them), every column
// sorts, and the totals row always reflects exactly what's on screen.
// An empty selection means "all".
function AdsetTable({ rows }: { rows: Row[] }) {
  const sets = useMemo(() => adsetBreakdown(rows), [rows]);
  const [camps, setCamps] = useState<string[]>([]);
  const [picks, setPicks] = useState<string[]>([]);

  const objectives = useMemo(() => [...new Set(sets.map((s) => s.objective))], [sets]);
  const inCamp = camps.length ? sets.filter((s) => camps.includes(s.objective)) : sets;
  const shown = picks.length ? inCamp.filter((s) => picks.includes(s.key)) : inCamp;

  const campOptions = objectives.map((o) => ({ value: o, label: o, color: OBJECTIVE_COLOR[o] ?? "#888" }));
  const setOptions = inCamp.map((s) => ({ value: s.key, label: `${s.adset} · ${s.objective}`, color: s.color }));

  // Narrowing the campaigns drops any picked ad sets that fell out of scope,
  // instead of wiping the whole selection.
  const changeCamps = (next: string[]) => {
    setCamps(next);
    if (next.length) setPicks((p) => p.filter((k) => sets.some((s) => s.key === k && next.includes(s.objective))));
  };

  // Footer = the visible sets only. A result total only makes sense when every
  // visible set shares one métrica mãe; otherwise it would sum unlike actions.
  const shownKeys = new Set(shown.map((s) => s.key));
  const ft = sum(rows.filter((r) => shownKeys.has(`${r.campaign}||${r.adset}`)));
  const fd = derive(ft);
  const oneObjective = new Set(shown.map((s) => s.objective)).size === 1 ? shown[0] : null;

  const costInfo = (s: (typeof sets)[number]) => {
    if (s.objective === "ALCANCE") return { label: "CPM", value: brl(s.derived.cpm), num: s.derived.cpm };
    if (s.objective === "VIDEOVIEW") return { label: "CPV", value: brl(s.derived.cpv, 3), num: s.derived.cpv };
    return { label: "por resultado", value: s.primaryValue > 0 ? brl(s.costPerResult) : "—", num: s.costPerResult };
  };

  type SRow = (typeof sets)[number];
  const cols: Column<SRow>[] = [
    {
      key: "adset",
      header: "Conjunto de anúncios",
      render: (s) => (
        <div className="min-w-[230px] max-w-[330px] py-0.5">
          <SegmentName name={s.adset} color={s.color} />
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />
            {s.objective} · {s.ads} {s.ads === 1 ? "anúncio" : "anúncios"}
          </div>
        </div>
      ),
      sortValue: (s) => s.adset,
    },
    { key: "spend", header: "Investido", align: "right", render: (s) => brl(s.totals.spend), sortValue: (s) => s.totals.spend },
    { key: "impr", header: "Impressões", align: "right", render: (s) => int(s.totals.impressions), sortValue: (s) => s.totals.impressions },
    {
      key: "reach",
      header: "Alcance",
      align: "right",
      render: (s) => (
        <>
          <div>{int(s.totals.reach)}</div>
          <div className="text-[10.5px] text-[var(--text-muted)]">freq. {dec(s.derived.frequency)}</div>
        </>
      ),
      sortValue: (s) => s.totals.reach,
    },
    { key: "cpm", header: "CPM", align: "right", render: (s) => brl(s.derived.cpm), sortValue: (s) => s.derived.cpm },
    { key: "clicks", header: "Cliques link", align: "right", render: (s) => int(s.totals.linkClicks), sortValue: (s) => s.totals.linkClicks },
    { key: "ctr", header: "CTR", align: "right", render: (s) => pct(s.derived.ctrLink), sortValue: (s) => s.derived.ctrLink },
    { key: "cpc", header: "CPC", align: "right", render: (s) => brl(s.derived.cpcLink), sortValue: (s) => s.derived.cpcLink },
    {
      key: "result",
      header: "Resultado",
      align: "right",
      render: (s) => (
        <span className="whitespace-nowrap">
          <span className="font-semibold" style={{ color: s.color }}>{resultNum(s.primaryValue)}</span>{" "}
          <span className="text-[10.5px] text-[var(--text-muted)]">{s.primary?.short ?? ""}</span>
        </span>
      ),
      sortValue: (s) => s.primaryValue,
    },
    {
      key: "cost",
      header: "Custo",
      align: "right",
      render: (s) => {
        const ci = costInfo(s);
        return (
          <span className="whitespace-nowrap">
            <span className="font-semibold text-[var(--text-primary)]">{ci.value}</span>{" "}
            <span className="text-[10.5px] text-[var(--text-muted)]">{ci.label}</span>
          </span>
        );
      },
      sortValue: (s) => costInfo(s).num,
    },
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            Conjuntos de anúncios
          </h2>
          <span className="text-[12px] text-[var(--text-muted)]">filtre, busque e ordene por qualquer coluna</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MultiDropdown
            options={campOptions}
            value={camps}
            onChange={changeCamps}
            allLabel="Todas as campanhas"
            unit={["campanha", "campanhas"]}
          />
          <MultiDropdown
            align="right"
            searchable
            wide
            options={setOptions}
            value={picks}
            onChange={setPicks}
            allLabel={`Todos os conjuntos (${inCamp.length})`}
            unit={["conjunto", "conjuntos"]}
          />
        </div>
      </div>
      <Card className="p-1.5">
        <DataTable
          columns={cols}
          data={shown}
          rowKey={(s) => s.key}
          initialSort={{ key: "spend", dir: "desc" }}
          maxHeight={620}
          dense
          footer={{
            adset: `Total · ${shown.length} ${shown.length === 1 ? "conjunto" : "conjuntos"}`,
            spend: brl(ft.spend),
            impr: int(ft.impressions),
            reach: (
              <>
                <div>{int(ft.reach)}</div>
                <div className="text-[10.5px] font-normal text-[var(--text-muted)]">freq. {dec(fd.frequency)}</div>
              </>
            ),
            cpm: brl(fd.cpm),
            clicks: int(ft.linkClicks),
            ctr: pct(fd.ctrLink),
            cpc: brl(fd.cpcLink),
            result: oneObjective ? resultNum(shown.reduce((a, s) => a + s.primaryValue, 0)) : "—",
            cost: "",
          }}
        />
      </Card>
    </>
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
