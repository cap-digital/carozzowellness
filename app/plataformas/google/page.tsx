"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { useData } from "@/components/providers/DataProvider";
import { Loadable, Reveal } from "@/components/ui/Loadable";
import { ChartCard, SectionTitle, Card } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { makeTooltip, TipShell } from "@/components/charts/ChartTooltip";
import { gSum, gDerive, gDaily, gTermBreakdown, type TermStat } from "@/lib/google";
import { brl, int, pct, compact, shortDate } from "@/lib/format";
import { CHART } from "@/lib/theme";
import { Search, Clock } from "lucide-react";

const GOLD = "#e0a010";
const BLUE = "#2f80c4";

export default function GooglePage() {
  return (
    <Loadable>
      <Google />
    </Loadable>
  );
}

function Google() {
  const { googleRows: rows } = useData();

  const t = useMemo(() => gSum(rows), [rows]);
  const d = useMemo(() => gDerive(t), [t]);
  const daily = useMemo(() => gDaily(rows), [rows]);
  const terms = useMemo(() => gTermBreakdown(rows), [rows]);

  const topByClicks = useMemo(
    () => terms.filter((x) => x.clicks > 0).slice().sort((a, b) => b.clicks - a.clicks).slice(0, 10),
    [terms]
  );
  const tableTerms = useMemo(() => terms.slice(0, 40), [terms]);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Clock size={22} />}
        color={GOLD}
        title="Google Rede de Pesquisa em breve"
        description="Assim que a conta de Google for integrada, as campanhas de Search e seus termos de pesquisa aparecem aqui."
      />
    );
  }

  const dailyTip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
      <TipShell
        title={shortDate(String(label))}
        rows={[
          { label: "Impressões", value: int(p.impressions), color: GOLD },
          { label: "Cliques", value: int(p.clicks), color: BLUE },
          { label: "CTR", value: pct(p.ctr) },
          { label: "Investido", value: brl(p.spend) },
        ]}
      />
    );
  };

  type TRow = TermStat;
  const cols: Column<TRow>[] = [
    {
      key: "term",
      header: "Termo de pesquisa",
      render: (r) => <span className="font-medium text-[var(--text-primary)]">{r.term}</span>,
      sortValue: (r) => r.term,
    },
    { key: "impr", header: "Impressões", align: "right", render: (r) => int(r.impressions), sortValue: (r) => r.impressions },
    { key: "clicks", header: "Cliques", align: "right", render: (r) => int(r.clicks), sortValue: (r) => r.clicks },
    { key: "ctr", header: "CTR", align: "right", render: (r) => pct(r.ctr), sortValue: (r) => r.ctr },
    { key: "spend", header: "Investido", align: "right", render: (r) => brl(r.spend), sortValue: (r) => r.spend },
    { key: "cpc", header: "CPC", align: "right", render: (r) => (r.clicks ? brl(r.cpc) : "—"), sortValue: (r) => r.cpc },
  ];

  return (
    <div className="space-y-6">
      {/* Channel ribbon */}
      <Reveal>
        <Card className="overflow-hidden">
          <div className="h-1 w-full" style={{ background: GOLD }} />
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, ${GOLD}, #8f6d29)` }}>
                <Search size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg text-[var(--text-primary)]">Google Rede de Pesquisa</h2>
                  <Badge color="#0ca30c" dot>
                    Conectado
                  </Badge>
                </div>
                <p className="text-[12.5px] text-[var(--text-secondary)]">
                  Search · {int(t.rows)} registros · {int(terms.length)} termos de pesquisa
                </p>
              </div>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--border)] pt-4 sm:grid-cols-3 md:border-l md:border-t-0 md:pl-6 md:pt-0 lg:grid-cols-5">
              {[
                { l: "Investido", v: brl(t.spend, 0) },
                { l: "Impressões", v: compact(t.impressions) },
                { l: "Cliques", v: int(t.clicks) },
                { l: "CTR", v: pct(d.ctr) },
                { l: "CPC", v: brl(d.cpc) },
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

      {/* Daily delivery */}
      <Reveal delay={60}>
        <SectionTitle hint="impressões e cliques ao longo do período">Entrega diária</SectionTitle>
        <ChartCard title="Impressões e cliques por dia" subtitle="Barras: impressões · Linha: cliques" accent={GOLD}>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={daily} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                <YAxis yAxisId="left" tickFormatter={compact} tick={{ fontSize: 11, fill: GOLD }} tickLine={false} axisLine={false} width={44} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={int} tick={{ fontSize: 11, fill: BLUE }} tickLine={false} axisLine={false} width={40} />
                <Tooltip content={dailyTip} cursor={{ fill: "rgba(70,89,7,0.06)" }} />
                <Bar yAxisId="left" isAnimationActive={false} dataKey="impressions" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={34} />
                <Line yAxisId="right" isAnimationActive={false} type="monotone" dataKey="clicks" stroke={BLUE} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: BLUE, stroke: "var(--surface-1)", strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex items-center gap-4 px-1 text-[11.5px] text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: GOLD }} /> Impressões
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-[3px] w-3.5 rounded-full" style={{ background: BLUE }} /> Cliques
            </span>
          </div>
        </ChartCard>
      </Reveal>

      {/* Top search terms by clicks */}
      <Reveal delay={120}>
        <SectionTitle hint="termos que mais geram cliques">Termos de pesquisa em destaque</SectionTitle>
        <ChartCard title="Top 10 termos por cliques" subtitle="Quais buscas trazem mais visitas ao site" accent={BLUE}>
          <div style={{ height: 40 + topByClicks.length * 34 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={topByClicks} margin={{ top: 4, right: 40, left: 4, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke={CHART.grid} />
                <XAxis type="number" tickFormatter={int} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} allowDecimals={false} />
                <YAxis type="category" dataKey="term" tick={{ fontSize: 11, fill: CHART.textSecondary }} tickLine={false} axisLine={false} width={220} />
                <Tooltip cursor={{ fill: "rgba(70,89,7,0.06)" }} content={makeTooltip((_n, v) => ({ label: "Cliques", value: int(v), color: BLUE }), (_l, p) => String((p as any)?.term))} />
                <Bar isAnimationActive={false} dataKey="clicks" fill={BLUE} radius={[0, 4, 4, 0]} maxBarSize={22}>
                  <LabelList dataKey="clicks" position="right" formatter={(v: any) => int(v)} style={{ fontSize: 11, fill: CHART.textSecondary, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </Reveal>

      {/* Search terms table */}
      <Reveal delay={180}>
        <SectionTitle hint={`principais ${tableTerms.length} termos por impressões · ${int(terms.length)} no total`}>
          Detalhe dos termos de pesquisa
        </SectionTitle>
        <Card className="p-1.5">
          <DataTable columns={cols} data={tableTerms} rowKey={(r) => r.term} initialSort={{ key: "impr", dir: "desc" }} maxHeight={520} />
        </Card>
      </Reveal>
    </div>
  );
}
