"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
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
import { Segmented } from "@/components/ui/Segmented";
import { Badge } from "@/components/ui/Badge";
import { PlatformFilter, type FilterKey } from "@/components/ui/PlatformFilter";
import { Funnel } from "@/components/charts/Funnel";
import { gaSum, gaDerive, type GAdsCreative } from "@/lib/googleAds";
import { makeTooltip, TipShell } from "@/components/charts/ChartTooltip";
import { sum } from "@/lib/metrics";
import { adBreakdown, formatBreakdown } from "@/lib/aggregate";
import { brl, int, pct, compact, resultNum } from "@/lib/format";
import { CHART, FORMAT_COLOR, OBJECTIVE_COLOR } from "@/lib/theme";
import { CreativeThumb } from "@/components/ui/CreativeThumb";
import { ExternalLink, Film, Images as ImagesIcon, ImageIcon, LayoutGrid } from "lucide-react";

function fmtIcon(format: string, size = 16) {
  if (format === "Carrossel") return <LayoutGrid size={size} />;
  if (format.startsWith("Animação")) return <Film size={size} />;
  if (format === "Estático") return <ImageIcon size={size} />;
  return <ImagesIcon size={size} />;
}

export default function CriativosPage() {
  return (
    <Loadable>
      <Criativos />
    </Loadable>
  );
}

type SortKey = "spend" | "ctr" | "impressions" | "conv";

function Criativos() {
  const { rows, youtubeCreatives, youtubeRows, videoRetention } = useData();
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [platform, setPlatform] = useState<FilterKey>("all");

  const t = useMemo(() => sum(rows), [rows]);
  const creatives = useMemo(() => adBreakdown(rows), [rows]);
  const formats = useMemo(() => formatBreakdown(rows), [rows]);

  // YouTube (video) creative analysis — counted here whenever it's video, not static.
  const yt = useMemo(() => gaSum(youtubeRows), [youtubeRows]);
  const yd = useMemo(() => gaDerive(yt), [yt]);
  const ytFunnel = [
    { label: "Impressões", value: yt.impressions, color: "#cf3a5f" },
    { label: "Views (TrueView)", value: yt.views, color: "#14a58c" },
    { label: "Cliques", value: yt.clicks, color: "#e0a010" },
  ];
  const ytRetention = videoRetention
    ? [
        { depth: "Início", value: 100 },
        { depth: "25%", value: videoRetention.p25 },
        { depth: "50%", value: videoRetention.p50 },
        { depth: "75%", value: videoRetention.p75 },
        { depth: "100%", value: videoRetention.p100 },
      ]
    : [];

  // Only platforms with creative data. Google Search has none; YouTube has video ads.
  const filterOptions = [
    { key: "all" as FilterKey, label: "Todas" },
    { key: "meta" as FilterKey, label: "Meta Ads" },
    ...(youtubeCreatives.length ? [{ key: "youtube" as FilterKey, label: "YouTube" }] : []),
  ];
  const showMeta = platform !== "youtube";
  const showYoutube = platform !== "meta" && youtubeCreatives.length > 0;

  // Video retention curve (share of video-views retained at each depth)
  const retention = useMemo(() => {
    const base = t.videoViews || t.p25 || 1;
    return [
      { depth: "Início", value: 100 },
      { depth: "25%", value: +((t.p25 / base) * 100).toFixed(1) },
      { depth: "50%", value: +((t.p50 / base) * 100).toFixed(1) },
      { depth: "75%", value: +((t.p75 / base) * 100).toFixed(1) },
      { depth: "100%", value: +((t.p100 / base) * 100).toFixed(1) },
    ];
  }, [t]);

  const scatter = useMemo(
    () =>
      creatives
        .filter((c) => c.totals.spend > 0 && c.totals.impressions > 0)
        .map((c) => ({
          x: +c.totals.spend.toFixed(2),
          y: +c.derived.ctrLink.toFixed(3),
          z: c.totals.impressions,
          name: c.ad,
          format: c.format,
          color: FORMAT_COLOR[c.format] ?? "#888",
        })),
    [creatives]
  );

  const sorted = useMemo(() => {
    const arr = [...creatives];
    arr.sort((a, b) => {
      if (sortKey === "spend") return b.totals.spend - a.totals.spend;
      if (sortKey === "impressions") return b.totals.impressions - a.totals.impressions;
      if (sortKey === "ctr") return b.derived.ctrLink - a.derived.ctrLink;
      return b.primaryValue - a.primaryValue;
    });
    return arr;
  }, [creatives, sortKey]);

  const bestCtr = [...creatives].sort((a, b) => b.derived.ctrLink - a.derived.ctrLink)[0];

  // When sorting by "Resultado", split the gallery into sections per objective so
  // it's clear which result (métrica mãe) each creative is measured by.
  const groups = useMemo(() => {
    const map = new Map<string, Creative[]>();
    for (const c of creatives) {
      const arr = map.get(c.objective);
      if (arr) arr.push(c);
      else map.set(c.objective, [c]);
    }
    return [...map.entries()]
      .map(([objective, items]) => ({
        objective,
        color: OBJECTIVE_COLOR[objective] ?? "#888",
        primary: items[0]?.primary,
        items: [...items].sort((a, b) => b.primaryValue - a.primaryValue),
        totalResult: items.reduce((s, c) => s + c.primaryValue, 0),
        totalSpend: items.reduce((s, c) => s + c.totals.spend, 0),
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend);
  }, [creatives]);

  return (
    <div className="space-y-6">
      {/* Platform filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Criativos por plataforma</h2>
        <PlatformFilter options={filterOptions} value={platform} onChange={setPlatform} />
      </div>

      {showMeta && (
      <>
      {/* Summary ribbon */}
      <Reveal>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="p-4">
            <div className="text-[12px] text-[var(--text-secondary)]">Criativos ativos</div>
            <div className="mt-1 text-[26px] font-semibold text-[var(--text-primary)]">{creatives.length}</div>
            <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">{formats.length} formatos diferentes</div>
          </Card>
          <Card className="p-4">
            <div className="text-[12px] text-[var(--text-secondary)]">Formato líder</div>
            <div className="mt-1 flex items-center gap-1.5 text-[18px] font-semibold text-[var(--text-primary)]">
              <span style={{ color: formats[0]?.color }}>{fmtIcon(formats[0]?.key ?? "", 18)}</span>
              {formats[0]?.key}
            </div>
            <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">{brl(formats[0]?.totals.spend ?? 0, 0)} investidos</div>
          </Card>
          <Card className="p-4">
            <div className="text-[12px] text-[var(--text-secondary)]">Melhor CTR</div>
            <div className="mt-1 text-[26px] font-semibold text-[var(--text-primary)]">{pct(bestCtr?.derived.ctrLink ?? 0)}</div>
            <div className="mt-1 truncate text-[11.5px] text-[var(--text-muted)]">{bestCtr?.ad}</div>
          </Card>
          <Card className="p-4">
            <div className="text-[12px] text-[var(--text-secondary)]">Retenção 100%</div>
            <div className="mt-1 text-[26px] font-semibold text-[var(--text-primary)]">{pct(retention[4].value, 1)}</div>
            <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">assiste o vídeo até o fim</div>
          </Card>
        </div>
      </Reveal>

      {/* Paired format charts + retention */}
      <Reveal delay={60}>
        <SectionTitle hint="comparativo entre formatos e retenção de vídeo">Desempenho por formato</SectionTitle>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title="CTR por formato" subtitle="Taxa de cliques no link (%)" accent="#14a58c">
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formats.map((f) => ({ name: f.key, v: +f.derived.ctrLink.toFixed(2), color: f.color }))} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} interval={0} angle={-12} textAnchor="end" height={44} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={false} width={38} />
                  <Tooltip cursor={{ fill: "rgba(70,89,7,0.06)" }} content={makeTooltip((_n, v) => ({ label: "CTR", value: pct(v), color: "#14a58c" }))} />
                  <Bar isAnimationActive={false} dataKey="v" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {formats.map((f) => <Cell key={f.key} fill={f.color} />)}
                    <LabelList dataKey="v" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: 10.5, fill: CHART.textSecondary, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="CPC por formato" subtitle="Custo por clique no link (R$)" accent="#e0a010">
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formats.map((f) => ({ name: f.key, v: +f.derived.cpcLink.toFixed(2), color: f.color }))} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} interval={0} angle={-12} textAnchor="end" height={44} />
                  <YAxis tickFormatter={(v) => brl(v, 1)} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip cursor={{ fill: "rgba(70,89,7,0.06)" }} content={makeTooltip((_n, v) => ({ label: "CPC", value: brl(v), color: "#e0a010" }))} />
                  <Bar isAnimationActive={false} dataKey="v" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {formats.map((f) => <Cell key={f.key} fill={f.color} />)}
                    <LabelList dataKey="v" position="top" formatter={(v: any) => brl(v)} style={{ fontSize: 10, fill: CHART.textSecondary, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Curva de retenção de vídeo" subtitle="% de espectadores por profundidade assistida" accent="#cf3a5f">
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={retention} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ret" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#cf3a5f" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#cf3a5f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="depth" tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={false} width={38} domain={[0, 100]} />
                  <Tooltip content={makeTooltip((_n, v) => ({ label: "Retenção", value: pct(v, 1), color: "#cf3a5f" }))} />
                  <Area isAnimationActive={false} type="monotone" dataKey="value" stroke="#cf3a5f" strokeWidth={2.5} fill="url(#ret)" dot={{ r: 3, fill: "#cf3a5f", stroke: "var(--surface-1)", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </Reveal>

      {/* Efficiency bubble */}
      <Reveal delay={120}>
        <ChartCard
          title="Mapa de eficiência dos criativos"
          subtitle="Investimento × CTR · tamanho da bolha = impressões · cor = formato"
          accent="#8a63d4"
        >
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid stroke={CHART.grid} />
                <XAxis type="number" dataKey="x" name="Investimento" tickFormatter={(v) => brl(v, 0)} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                <YAxis type="number" dataKey="y" name="CTR" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={false} width={40} />
                <ZAxis type="number" dataKey="z" range={[80, 900]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3", stroke: CHART.axis }}
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload;
                    return (
                      <TipShell
                        title={p.name}
                        rows={[
                          { label: "Formato", value: p.format, color: p.color },
                          { label: "Investido", value: brl(p.x) },
                          { label: "CTR", value: pct(p.y) },
                          { label: "Impressões", value: int(p.z) },
                        ]}
                      />
                    );
                  }}
                />
                <Scatter isAnimationActive={false} data={scatter}>
                  {scatter.map((s, i) => (
                    <Cell key={i} fill={s.color} fillOpacity={0.72} stroke={s.color} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11.5px] text-[var(--text-secondary)]">
            {formats.map((f) => (
              <span key={f.key} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: f.color }} />
                {f.key}
              </span>
            ))}
          </div>
        </ChartCard>
      </Reveal>

      </>
      )}

      {/* YouTube (video) analysis — shows in "Todas" and "YouTube" */}
      {showYoutube && (
        <>
          <Reveal delay={40}>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Card className="p-4">
                <div className="text-[12px] text-[var(--text-secondary)]">Criativos de vídeo</div>
                <div className="mt-1 text-[26px] font-semibold text-[var(--text-primary)]">{youtubeCreatives.length}</div>
                <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">anúncios no YouTube</div>
              </Card>
              <Card className="p-4">
                <div className="text-[12px] text-[var(--text-secondary)]">Views</div>
                <div className="mt-1 text-[26px] font-semibold" style={{ color: "#14a58c" }}>{compact(yt.views)}</div>
                <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">de {compact(yt.impressions)} impressões</div>
              </Card>
              <Card className="p-4">
                <div className="text-[12px] text-[var(--text-secondary)]">VTR</div>
                <div className="mt-1 text-[26px] font-semibold text-[var(--text-primary)]">{pct(yd.vtr)}</div>
                <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">taxa de visualização</div>
              </Card>
              <Card className="p-4">
                <div className="text-[12px] text-[var(--text-secondary)]">Retenção 100%</div>
                <div className="mt-1 text-[26px] font-semibold text-[var(--text-primary)]">{videoRetention ? pct(videoRetention.p100, 1) : "—"}</div>
                <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">assiste o vídeo até o fim</div>
              </Card>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <SectionTitle hint="funil e retenção dos anúncios de vídeo">Desempenho de vídeo · YouTube</SectionTitle>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartCard title="Funil de vídeo" subtitle="Da impressão à view e ao clique" accent="#cf3a5f">
                <div className="pt-1">
                  <Funnel stages={ytFunnel} />
                </div>
              </ChartCard>
              <ChartCard title="Curva de retenção" subtitle="% das reproduções que chega a cada ponto do vídeo" accent="#14a58c">
                {ytRetention.length ? (
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={ytRetention} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="crRet" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#14a58c" stopOpacity={0.28} />
                            <stop offset="100%" stopColor="#14a58c" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke={CHART.grid} />
                        <XAxis dataKey="depth" tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                        <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={false} width={38} domain={[0, 100]} />
                        <Tooltip content={makeTooltip((_n, v) => ({ label: "Retenção", value: pct(v, 1), color: "#14a58c" }))} />
                        <Area isAnimationActive={false} type="monotone" dataKey="value" stroke="#14a58c" strokeWidth={2.5} fill="url(#crRet)" dot={{ r: 3, fill: "#14a58c", stroke: "var(--surface-1)", strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-[220px] items-center justify-center text-[12.5px] text-[var(--text-muted)]">Sem dados de retenção no período</div>
                )}
              </ChartCard>
            </div>
          </Reveal>
        </>
      )}

      {/* Gallery */}
      <Reveal delay={160}>
        <SectionTitle>Galeria de criativos</SectionTitle>

        {showMeta && (
          <>
            <div className="mb-4 flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
              <span>Ordenar por</span>
              <Segmented
                size="sm"
                value={sortKey}
                onChange={(v) => setSortKey(v as SortKey)}
                options={[
                  { value: "spend", label: "Investimento" },
                  { value: "ctr", label: "CTR" },
                  { value: "impressions", label: "Impressões" },
                  { value: "conv", label: "Resultado" },
                ]}
              />
            </div>
            {sortKey === "conv" ? (
              <div className="space-y-7">
                {groups.map((g) => (
                  <div key={g.objective}>
                    <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-2">
                      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: g.color }} />
                      <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">{g.objective}</h3>
                      <span className="text-[12px] text-[var(--text-muted)]">
                        resultado medido por {g.primary?.label ?? "—"} · {g.items.length} criativo{g.items.length > 1 ? "s" : ""}
                      </span>
                      <span className="ml-auto text-[13px] font-semibold tnum" style={{ color: g.color }}>
                        {resultNum(g.totalResult)} {g.primary?.short ?? ""}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {g.items.map((c, i) => (
                        <CreativeCard key={c.ad} c={c} index={i} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sorted.map((c, i) => (
                  <CreativeCard key={c.ad} c={c} index={i} />
                ))}
              </div>
            )}
          </>
        )}

        {showYoutube && (
          <div className={showMeta ? "mt-7" : ""}>
            <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-2">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "#cf3a5f" }} />
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">YouTube</h3>
              <span className="text-[12px] text-[var(--text-muted)]">
                anúncios de vídeo · {youtubeCreatives.length} criativo{youtubeCreatives.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {youtubeCreatives.map((c, i) => (
                <YoutubeCard key={c.videoId || c.ad} c={c} index={i} />
              ))}
            </div>
          </div>
        )}
      </Reveal>
    </div>
  );
}

function YoutubeCard({ c, index }: { c: GAdsCreative; index: number }) {
  const vtr = c.impressions > 0 ? (c.views / c.impressions) * 100 : 0;
  const cpv = c.views > 0 ? c.spend / c.views : 0;
  return (
    <Card className="group overflow-hidden">
      <div className="relative">
        <CreativeThumb thumb={c.thumb} format="Vídeo" color="#cf3a5f" className="h-36 w-full" iconSize={20} alt={c.ad} href={c.permalink || undefined} />
        <span className="absolute left-3 top-3">
          <Badge color="#cf3a5f">YouTube</Badge>
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-[var(--surface-1)]/85 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] backdrop-blur-sm">
          #{index + 1}
        </span>
      </div>
      <div className="p-3.5">
        <div className="truncate text-[13px] font-semibold text-[var(--text-primary)]" title={c.ad}>
          {c.ad}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
          <Metric label="Investido" value={brl(c.spend, 0)} />
          <Metric label="Views" value={compact(c.views)} accent="#cf3a5f" />
          <Metric label="Impressões" value={compact(c.impressions)} />
          <Metric label="VTR" value={pct(vtr)} />
          <Metric label="CPV" value={brl(cpv, 3)} />
          <Metric label="Cliques" value={int(c.clicks)} />
        </div>
        {c.permalink && (
          <a
            href={c.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ExternalLink size={13} /> Ver no YouTube
          </a>
        )}
      </div>
    </Card>
  );
}

type Creative = ReturnType<typeof adBreakdown>[number];

function CreativeCard({ c, index }: { c: Creative; index: number }) {
  const color = FORMAT_COLOR[c.format] ?? "#888";
  return (
    <Card className="group overflow-hidden">
      <div className="relative">
        <CreativeThumb thumb={c.thumb} format={c.format} color={color} className="h-36 w-full" iconSize={20} alt={c.ad} href={c.permalink || undefined} />
        <span className="absolute left-3 top-3 flex items-center gap-1.5">
          <Badge color="#2f80c4">Meta</Badge>
          <Badge color={color}>{c.format}</Badge>
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-[var(--surface-1)]/85 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] backdrop-blur-sm">
          #{index + 1}
        </span>
      </div>
      <div className="p-3.5">
        <div className="truncate text-[13px] font-semibold text-[var(--text-primary)]" title={c.ad}>
          {c.ad.replace(/ - Carozzo Wellness/i, "")}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
          <Metric label="Investido" value={brl(c.totals.spend, 0)} />
          <Metric label="CTR" value={pct(c.derived.ctrLink)} />
          <Metric label="Impressões" value={compact(c.totals.impressions)} />
          <Metric label="Cliques link" value={int(c.totals.linkClicks)} />
          <Metric label="CPC" value={brl(c.derived.cpcLink)} />
          <Metric label={c.primary?.short ?? "Resultado"} value={resultNum(c.primaryValue)} accent={color} />
        </div>
        {c.permalink && (
          <a
            href={c.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ExternalLink size={13} /> Ver no Instagram
          </a>
        )}
      </div>
    </Card>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className="mt-0.5 font-semibold tnum" style={{ color: accent ?? "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}
