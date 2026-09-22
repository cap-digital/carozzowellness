"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart,
  AreaChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useData } from "@/components/providers/DataProvider";
import { Loadable, Reveal } from "@/components/ui/Loadable";
import { ChartCard, SectionTitle, Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Funnel } from "@/components/charts/Funnel";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Dropdown } from "@/components/ui/Dropdown";
import { SegmentName } from "@/components/ui/SegmentName";
import { Donut } from "@/components/charts/Donut";
import { makeTooltip, TipShell } from "@/components/charts/ChartTooltip";
import { gaSum, gaDerive, gaDaily, gaByAdGroup, type GAdsAdGroupRow, type GAdsAdGroupStat } from "@/lib/googleAds";
import { brl, int, pct, compact, shortDate } from "@/lib/format";
import { CHART } from "@/lib/theme";
import { MonitorPlay, Clock } from "lucide-react";

const WINE = "#cf3a5f";
const TEAL = "#14a58c";
const GOLD = "#e0a010";

export default function YoutubePage() {
  return (
    <Loadable>
      <Youtube />
    </Loadable>
  );
}

function Youtube() {
  const { youtubeRows: rows, youtubeAdGroups, videoRetention, googleLoading } = useData();

  const t = useMemo(() => gaSum(rows), [rows]);
  const d = useMemo(() => gaDerive(t), [t]);
  const daily = useMemo(() => gaDaily(rows), [rows]);

  if (rows.length === 0 && googleLoading) return <PageSkeleton />;
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Clock size={22} />}
        color={WINE}
        title="Sem dados do YouTube no período"
        description="A integração com a Google Ads API está ativa, mas não há dados de vídeo no período selecionado (ou a API está indisponível no momento)."
      />
    );
  }

  const funnelStages = [
    { label: "Impressões", value: t.impressions, color: WINE },
    { label: "Views (TrueView)", value: t.views, color: TEAL },
    { label: "Cliques", value: t.clicks, color: GOLD },
  ];

  const retention = videoRetention
    ? [
        { depth: "Início", value: 100 },
        { depth: "25%", value: videoRetention.p25 },
        { depth: "50%", value: videoRetention.p50 },
        { depth: "75%", value: videoRetention.p75 },
        { depth: "100%", value: videoRetention.p100 },
      ]
    : [];

  const vtrDonut = [
    { name: "Assistiram (view)", value: t.views, color: TEAL },
    { name: "Sem view", value: Math.max(t.impressions - t.views, 0), color: "#e6e3d6" },
  ];

  const dailyTip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
      <TipShell
        title={shortDate(String(label))}
        rows={[
          { label: "Impressões", value: int(p.impressions), color: WINE },
          { label: "Views", value: int(p.views), color: TEAL },
          { label: "Investido", value: brl(p.spend) },
        ]}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Channel ribbon */}
      <Reveal>
        <Card className="overflow-hidden">
          <div className="h-1 w-full" style={{ background: WINE }} />
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, ${WINE}, #8f1d38)` }}>
                <MonitorPlay size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg text-[var(--text-primary)]">YouTube</h2>
                  <Badge color="#0ca30c" dot>
                    Conectado
                  </Badge>
                </div>
                <p className="text-[12.5px] text-[var(--text-secondary)]">Vídeo · Google Ads · {int(t.rows)} registros</p>
              </div>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--border)] pt-4 sm:grid-cols-3 md:border-l md:border-t-0 md:pl-6 md:pt-0 lg:grid-cols-6">
              {[
                { l: "Investido", v: brl(t.spend, 0) },
                { l: "Impressões", v: compact(t.impressions) },
                { l: "Views", v: compact(t.views) },
                { l: "VTR", v: pct(d.vtr) },
                { l: "CPV", v: brl(d.cpv, 3) },
                { l: "Cliques", v: int(t.clicks) },
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

      {/* Video funnel + retention */}
      <Reveal delay={60}>
        <SectionTitle hint="do impacto à retenção da audiência">Desempenho de vídeo</SectionTitle>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Funil de vídeo" subtitle="Da impressão à view e ao clique" accent={WINE}>
            <div className="pt-1">
              <Funnel stages={funnelStages} />
            </div>
          </ChartCard>

          <ChartCard title="Curva de retenção" subtitle="% das reproduções que chega a cada ponto do vídeo" accent={TEAL}>
            {retention.length ? (
              <div style={{ height: 232 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={retention} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ytRet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={TEAL} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={CHART.grid} />
                    <XAxis dataKey="depth" tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                    <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={false} width={38} domain={[0, 100]} />
                    <Tooltip content={makeTooltip((_n, v) => ({ label: "Retenção", value: pct(v, 1), color: TEAL }))} />
                    <Area isAnimationActive={false} type="monotone" dataKey="value" stroke={TEAL} strokeWidth={2.5} fill="url(#ytRet)" dot={{ r: 3, fill: TEAL, stroke: "var(--surface-1)", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[232px] items-center justify-center text-[12.5px] text-[var(--text-muted)]">Sem dados de retenção no período</div>
            )}
          </ChartCard>
        </div>
      </Reveal>

      {/* Daily delivery + VTR donut */}
      <Reveal delay={120}>
        <SectionTitle hint="entrega diária e taxa de visualização">Entrega</SectionTitle>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard className="lg:col-span-2" title="Impressões e views por dia" subtitle="Barras: impressões · Linha: views (TrueView)" accent={WINE}>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={daily} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                  <YAxis yAxisId="left" tickFormatter={compact} tick={{ fontSize: 11, fill: WINE }} tickLine={false} axisLine={false} width={44} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={compact} tick={{ fontSize: 11, fill: TEAL }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip content={dailyTip} cursor={{ fill: "rgba(70,89,7,0.06)" }} />
                  <Bar yAxisId="left" isAnimationActive={false} dataKey="impressions" fill={WINE} radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Line yAxisId="right" isAnimationActive={false} type="monotone" dataKey="views" stroke={TEAL} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: TEAL, stroke: "var(--surface-1)", strokeWidth: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex items-center gap-4 px-1 text-[11.5px] text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: WINE }} /> Impressões
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-[3px] w-3.5 rounded-full" style={{ background: TEAL }} /> Views
              </span>
            </div>
          </ChartCard>

          <ChartCard title="Taxa de visualização (VTR)" subtitle="Parte das impressões que virou view" accent={TEAL}>
            <Donut
              data={vtrDonut}
              centerValue={pct(d.vtr)}
              centerLabel="VTR"
              format={(v) => int(v)}
              legendBelow
              height={190}
            />
          </ChartCard>
        </div>
      </Reveal>

      {/* Ad group drill-down */}
      <Reveal delay={180}>
        <AdGroupTable rows={youtubeAdGroups} />
      </Reveal>
    </div>
  );
}

// ---- Ad group ("conjunto") table --------------------------------------------
// Same pattern as Meta's ad set table: campaign filter, searchable ad group
// picker, sortable columns, and a totals row for what's on screen.
function AdGroupTable({ rows }: { rows: GAdsAdGroupRow[] }) {
  const groups = useMemo(() => gaByAdGroup(rows), [rows]);
  const [camp, setCamp] = useState("all");
  const [pick, setPick] = useState("all");

  const campaigns = useMemo(() => [...new Set(groups.map((g) => g.campaign))], [groups]);
  const inCamp = camp === "all" ? groups : groups.filter((g) => g.campaign === camp);
  const shown = pick === "all" ? inCamp : inCamp.filter((g) => g.key === pick);

  const campOptions = [
    { value: "all", label: "Todas as campanhas", color: WINE },
    ...campaigns.map((c) => ({ value: c, label: c.replace(/\[(ID3|YOUTUBE|CAROZZO WELLNESS)\]\s*/g, "").trim() || c, color: WINE })),
  ];
  const groupOptions = [
    { value: "all", label: `Todos os grupos (${inCamp.length})` },
    ...inCamp.map((g) => ({ value: g.key, label: g.adGroup, color: WINE })),
  ];

  const shownKeys = new Set(shown.map((g) => g.key));
  const visible = rows.filter((r) => shownKeys.has(`${r.campaign}||${r.adGroup}`));
  const ft = gaSum(visible.map((r) => ({ ...r, channel: "youtube" as const })));
  const fd = gaDerive(ft);
  const fq = (k: "q25" | "q100") => (ft.views > 0 ? (visible.reduce((a, r) => a + r[k], 0) / ft.views) * 100 : 0);

  const cols: Column<GAdsAdGroupStat>[] = [
    {
      key: "group",
      header: "Grupo de anúncios",
      render: (g) => (
        <div className="min-w-[220px] max-w-[320px] py-0.5">
          <SegmentName name={g.adGroup} color={WINE} />
          <div className="mt-1 break-words text-[11px] text-[var(--text-muted)]">{g.campaign}</div>
        </div>
      ),
      sortValue: (g) => g.adGroup,
    },
    { key: "spend", header: "Investido", align: "right", render: (g) => brl(g.spend), sortValue: (g) => g.spend },
    { key: "impr", header: "Impressões", align: "right", render: (g) => int(g.impressions), sortValue: (g) => g.impressions },
    { key: "views", header: "Views", align: "right", render: (g) => int(g.views), sortValue: (g) => g.views },
    { key: "vtr", header: "VTR", align: "right", render: (g) => pct(g.vtr), sortValue: (g) => g.vtr },
    { key: "cpv", header: "CPV", align: "right", render: (g) => brl(g.cpv, 3), sortValue: (g) => g.cpv },
    { key: "cpm", header: "CPM", align: "right", render: (g) => brl(g.cpm), sortValue: (g) => g.cpm },
    { key: "clicks", header: "Cliques", align: "right", render: (g) => int(g.clicks), sortValue: (g) => g.clicks },
    { key: "ctr", header: "CTR", align: "right", render: (g) => pct(g.ctr), sortValue: (g) => g.ctr },
    { key: "cpc", header: "CPC", align: "right", render: (g) => (g.clicks > 0 ? brl(g.cpc) : "—"), sortValue: (g) => g.cpc },
    { key: "p25", header: "Ret. 25%", align: "right", render: (g) => pct(g.p25, 1), sortValue: (g) => g.p25 },
    { key: "p100", header: "Ret. 100%", align: "right", render: (g) => <span style={{ color: TEAL }} className="font-semibold">{pct(g.p100, 1)}</span>, sortValue: (g) => g.p100 },
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            Grupos de anúncios
          </h2>
          <span className="text-[12px] text-[var(--text-muted)]">filtre, busque e ordene por qualquer coluna</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dropdown
            size="sm"
            options={campOptions}
            value={camp}
            onChange={(v) => {
              setCamp(v);
              setPick("all");
            }}
          />
          <Dropdown size="sm" align="right" searchable wide options={groupOptions} value={pick} onChange={setPick} />
        </div>
      </div>
      <Card className="p-1.5">
        {shown.length === 0 ? (
          <div className="px-4 py-10 text-center text-[12.5px] text-[var(--text-muted)]">Sem grupos de anúncios no período</div>
        ) : (
          <DataTable
            columns={cols}
            data={shown}
            rowKey={(g) => g.key}
            initialSort={{ key: "spend", dir: "desc" }}
            maxHeight={620}
            dense
            footer={{
              group: `Total · ${shown.length} ${shown.length === 1 ? "grupo" : "grupos"}`,
              spend: brl(ft.spend),
              impr: int(ft.impressions),
              views: int(ft.views),
              vtr: pct(fd.vtr),
              cpv: brl(fd.cpv, 3),
              cpm: brl(fd.cpm),
              clicks: int(ft.clicks),
              ctr: pct(fd.ctr),
              cpc: ft.clicks > 0 ? brl(fd.cpc) : "—",
              p25: pct(fq("q25"), 1),
              p100: pct(fq("q100"), 1),
            }}
          />
        )}
      </Card>
    </>
  );
}
