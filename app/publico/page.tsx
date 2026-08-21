"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
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
import { Segmented } from "@/components/ui/Segmented";
import { PlatformFilter, type FilterKey } from "@/components/ui/PlatformFilter";
import { Donut } from "@/components/charts/Donut";
import { Heatmap } from "@/components/charts/Heatmap";
import { Pyramid } from "@/components/charts/Pyramid";
import { makeTooltip } from "@/components/charts/ChartTooltip";
import { derive, groupSum, CONVERSION_METRICS } from "@/lib/metrics";
import { ageGenderMatrix, orderedAges, AGE_ORDER } from "@/lib/aggregate";
import { brl, int, pct, compact } from "@/lib/format";
import { CHART, GENDER_COLOR } from "@/lib/theme";
import { PLATFORM_COLOR } from "@/lib/combined";
import type { Row } from "@/lib/types";
import type { GAdsChannelDemo } from "@/lib/googleAds";

const convByKey = Object.fromEntries(CONVERSION_METRICS.map((m) => [m.key, m]));

// ---- unified demographics (age + gender) across platforms --------------------
interface DemoBucket { key: string; impressions: number; clicks: number }
interface Demo { age: DemoBucket[]; gender: DemoBucket[] }

function metaDemo(rows: Row[]): Demo {
  return {
    age: groupSum(rows, (r) => r.age).map((g) => ({ key: g.key, impressions: g.totals.impressions, clicks: g.totals.linkClicks })),
    gender: groupSum(rows, (r) => r.gender).map((g) => ({ key: g.key, impressions: g.totals.impressions, clicks: g.totals.linkClicks })),
  };
}
const adsDemo = (d?: GAdsChannelDemo): Demo => ({ age: d?.age ?? [], gender: d?.gender ?? [] });

function combineDemos(...demos: Demo[]): Demo {
  const acc = (lists: DemoBucket[][]) => {
    const m = new Map<string, DemoBucket>();
    for (const arr of lists) for (const b of arr) {
      const x = m.get(b.key) ?? { key: b.key, impressions: 0, clicks: 0 };
      x.impressions += b.impressions; x.clicks += b.clicks;
      m.set(b.key, x);
    }
    return [...m.values()];
  };
  return { age: acc(demos.map((d) => d.age)), gender: acc(demos.map((d) => d.gender)) };
}

const GENDER_LABEL: Record<string, string> = { female: "Feminino", male: "Masculino", unknown: "Não identificado" };
const orderAge = (buckets: DemoBucket[]) => [...buckets].sort((a, b) => AGE_ORDER.indexOf(a.key) - AGE_ORDER.indexOf(b.key));

export default function PublicoPage() {
  return (
    <Loadable>
      <Publico />
    </Loadable>
  );
}

type MetricKey = "impressions" | "spend" | "clicks" | "conversations" | "whatsapp" | "leadGrouped";

const METRIC_ACCESSOR: Record<MetricKey, { fn: (r: Row) => number; label: string; fmt: (v: number) => string }> = {
  impressions: { fn: (r) => r.impressions, label: "Impressões", fmt: (v) => int(v) },
  spend: { fn: (r) => r.spend, label: "Investimento", fmt: (v) => brl(v, 0) },
  clicks: { fn: (r) => r.linkClicks, label: "Cliques no link", fmt: (v) => int(v) },
  conversations: { fn: (r) => r.conversations, label: "WhatsApp", fmt: (v) => int(v) },
  whatsapp: { fn: (r) => r.whatsapp, label: "Leads LP", fmt: (v) => int(v) },
  leadGrouped: { fn: (r) => r.leadGrouped, label: "Leads Formulário", fmt: (v) => int(v) },
};

function Publico() {
  const { rows, demographics, googleLoading } = useData();
  const [metric, setMetric] = useState<MetricKey>("impressions");
  const [platform, setPlatform] = useState<FilterKey>("all");

  // Per-platform demographics + the one selected (combined for "Todas").
  const metaD = useMemo(() => metaDemo(rows), [rows]);
  const googleD = adsDemo(demographics?.search);
  const youtubeD = adsDemo(demographics?.youtube);
  const hasGoogle = googleD.age.length > 0 || googleD.gender.length > 0;
  const hasYoutube = youtubeD.age.length > 0 || youtubeD.gender.length > 0;
  const options = [
    { key: "all" as FilterKey, label: "Todas" },
    { key: "meta" as FilterKey, label: "Meta Ads" },
    ...(hasGoogle ? [{ key: "google" as FilterKey, label: "Google" }] : []),
    ...(hasYoutube ? [{ key: "youtube" as FilterKey, label: "YouTube" }] : []),
  ];
  const demo =
    platform === "meta" ? metaD :
    platform === "google" ? googleD :
    platform === "youtube" ? youtubeD :
    combineDemos(metaD, googleD, youtubeD);
  const showMetaDetail = platform === "meta" || platform === "all";
  const accent = platform === "all" ? "#465907" : PLATFORM_COLOR[platform];

  // ---- universal charts (all platforms) ----
  const genderDonut = demo.gender
    .filter((g) => g.impressions > 0)
    .map((g) => ({ name: GENDER_LABEL[g.key] ?? g.key, value: g.impressions, color: GENDER_COLOR[g.key] ?? "#a8a496" }))
    .sort((a, b) => b.value - a.value);
  const female = demo.gender.find((g) => g.key === "female")?.impressions ?? 0;
  const male = demo.gender.find((g) => g.key === "male")?.impressions ?? 0;
  const femalePct = (female / (female + male || 1)) * 100;
  const ageChart = orderAge(demo.age.filter((a) => a.key !== "Unknown"));
  const totalImpr = demo.age.reduce((s, a) => s + a.impressions, 0);
  const totalClicks = demo.age.reduce((s, a) => s + a.clicks, 0);
  const dominantAge = [...demo.age].filter((a) => a.key !== "Unknown").sort((a, b) => b.impressions - a.impressions)[0];

  const loadingDemo = demo.age.length === 0 && demo.gender.length === 0 && googleLoading;

  // ---- Meta crossed detail (age × gender) — Meta-only data ----
  const genders = useMemo(() => groupSum(rows, (r) => r.gender).map((g) => ({ key: g.key, totals: g.totals })), [rows]);
  const pyramid = useMemo(() => {
    const ag = orderedAges(rows).filter((a) => a !== "Unknown");
    const acc = (age: string, gender: string) =>
      rows.filter((r) => r.age === age && r.gender === gender).reduce((s, r) => s + r.impressions, 0);
    return ag.map((a) => ({ label: a, left: acc(a, "female"), right: acc(a, "male") }));
  }, [rows]);
  const genderCols = ["female", "male", "unknown"].filter((g) => genders.some((x) => x.key === g));
  const heat = useMemo(() => ageGenderMatrix(rows, genderCols, METRIC_ACCESSOR[metric].fn), [rows, genderCols, metric]);
  const colLabels = genderCols.map((g) => (g === "female" ? "Feminino" : g === "male" ? "Masculino" : "Outro"));
  const ageStats = useMemo(
    () =>
      groupSum(rows, (r) => r.age)
        .map((g) => ({ age: g.key, d: derive(g.totals), t: g.totals }))
        .filter((x) => x.age !== "Unknown")
        .sort((a, b) => orderedAges(rows).indexOf(a.age) - orderedAges(rows).indexOf(b.age)),
    [rows]
  );
  const mAcc = METRIC_ACCESSOR[metric];

  return (
    <div className="space-y-6">
      {/* Platform filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Público por plataforma</h2>
        <PlatformFilter options={options} value={platform} onChange={setPlatform} />
      </div>

      {loadingDemo ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-[var(--border)] text-[12.5px] text-[var(--text-muted)]">
          Carregando dados demográficos…
        </div>
      ) : (
        <>
          {/* Summary (universal) */}
          <Reveal>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Card className="p-4">
                <div className="text-[12px] text-[var(--text-secondary)]">Público feminino</div>
                <div className="mt-1 text-[26px] font-semibold" style={{ color: GENDER_COLOR.female }}>{pct(femalePct, 0)}</div>
                <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">das impressões identificadas</div>
              </Card>
              <Card className="p-4">
                <div className="text-[12px] text-[var(--text-secondary)]">Faixa dominante</div>
                <div className="mt-1 text-[26px] font-semibold text-[var(--text-primary)]">{dominantAge?.key ?? "—"}</div>
                <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">{compact(dominantAge?.impressions ?? 0)} impressões</div>
              </Card>
              <Card className="p-4">
                <div className="text-[12px] text-[var(--text-secondary)]">Impressões</div>
                <div className="mt-1 text-[26px] font-semibold text-[var(--text-primary)]">{compact(totalImpr)}</div>
                <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">com dados demográficos</div>
              </Card>
              <Card className="p-4">
                <div className="text-[12px] text-[var(--text-secondary)]">Cliques</div>
                <div className="mt-1 text-[26px] font-semibold text-[var(--text-primary)]">{int(totalClicks)}</div>
                <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">no período</div>
              </Card>
            </div>
          </Reveal>

          {/* Gender split + age distribution (universal) */}
          <Reveal delay={60}>
            <SectionTitle hint="composição por gênero e faixa etária">Distribuição demográfica</SectionTitle>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <ChartCard className="lg:col-span-3" title="Distribuição por faixa etária" subtitle="Impressões por idade" accent={accent}>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageChart} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={CHART.grid} />
                      <XAxis dataKey="key" tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                      <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={false} width={44} />
                      <Tooltip cursor={{ fill: "rgba(70,89,7,0.06)" }} content={makeTooltip((_n, v) => ({ label: "Impressões", value: int(v), color: accent }))} />
                      <Bar isAnimationActive={false} dataKey="impressions" fill={accent} radius={[4, 4, 0, 0]} maxBarSize={44}>
                        <LabelList dataKey="impressions" position="top" formatter={(v: any) => compact(v)} style={{ fontSize: 10.5, fill: CHART.textSecondary, fontWeight: 600 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard className="lg:col-span-2" title="Divisão por gênero" subtitle="Participação nas impressões" accent={GENDER_COLOR.male}>
                <Donut
                  data={genderDonut}
                  centerValue={compact(totalImpr)}
                  centerLabel="impressões"
                  format={(v) => compact(v)}
                  height={190}
                />
              </ChartCard>
            </div>
          </Reveal>

          {showMetaDetail && (
            <>
              {/* Meta crossed detail: pyramid + heatmap */}
              <Reveal delay={120}>
                <SectionTitle hint="Meta Ads · cruzamento idade × gênero">Detalhe cruzado · Meta</SectionTitle>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                  <ChartCard className="lg:col-span-3" title="Pirâmide etária por gênero" subtitle="Impressões — feminino à esquerda, masculino à direita" accent={GENDER_COLOR.female}>
                    <div className="pt-2">
                      <Pyramid rows={pyramid} leftColor={GENDER_COLOR.female} rightColor={GENDER_COLOR.male} leftLabel="Feminino" rightLabel="Masculino" format={(v) => int(v)} />
                    </div>
                  </ChartCard>

                  <ChartCard
                    className="lg:col-span-2"
                    title="Mapa de calor: idade × gênero"
                    subtitle={`Intensidade por ${mAcc.label.toLowerCase()}`}
                    accent="#5a8f22"
                    right={
                      <Segmented
                        size="sm"
                        value={metric}
                        onChange={(v) => setMetric(v as MetricKey)}
                        options={[
                          { value: "impressions", label: "Impr." },
                          { value: "spend", label: "Investido" },
                          { value: "clicks", label: "Cliques" },
                        ]}
                      />
                    }
                  >
                    <div className="pt-2">
                      <Heatmap rows={heat.ages} cols={colLabels} matrix={heat.matrix} format={mAcc.fmt} cellLabel={(v) => (mAcc === METRIC_ACCESSOR.spend ? brl(v, 0) : compact(v))} />
                    </div>
                  </ChartCard>
                </div>
              </Reveal>

              {/* CTR + conversions by age (Meta) */}
              <Reveal delay={160}>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <ChartCard title="CTR por faixa etária" subtitle="Meta · quais idades mais clicam (%)" accent="#e0a010">
                    <div style={{ height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ageStats.map((a) => ({ name: a.age, v: +a.d.ctrLink.toFixed(2) }))} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid vertical={false} stroke={CHART.grid} />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                          <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={false} width={40} />
                          <Tooltip cursor={{ fill: "rgba(70,89,7,0.06)" }} content={makeTooltip((_n, v) => ({ label: "CTR", value: pct(v), color: "#e0a010" }))} />
                          <Bar isAnimationActive={false} dataKey="v" fill="#e0a010" radius={[4, 4, 0, 0]} maxBarSize={34}>
                            <LabelList dataKey="v" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: 10.5, fill: CHART.textSecondary, fontWeight: 600 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  <ChartCard title="Conversões por faixa etária" subtitle="Meta · WhatsApp, Leads LP e Leads Formulário" accent="#cf3a5f">
                    <div style={{ height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={ageStats.map((a) => ({ name: a.age, conversations: a.t.conversations, whatsapp: a.t.whatsapp, leadGrouped: a.t.leadGrouped, leadSite: a.t.leadSite }))}
                          margin={{ top: 4, right: 24, left: 4, bottom: 0 }}
                          barCategoryGap="22%"
                        >
                          <CartesianGrid horizontal={false} stroke={CHART.grid} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: CHART.textSecondary }} tickLine={false} axisLine={false} width={44} />
                          <Tooltip cursor={{ fill: "rgba(70,89,7,0.06)" }} content={makeTooltip((n, v) => { const m = convByKey[n]; return m ? { label: m.label, value: int(v), color: m.color } : null; })} />
                          {CONVERSION_METRICS.map((m) => (
                            <Bar key={m.key} isAnimationActive={false} dataKey={m.key} fill={m.color} radius={[0, 3, 3, 0]} maxBarSize={9} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11.5px] text-[var(--text-secondary)]">
                      {CONVERSION_METRICS.map((m) => (
                        <span key={m.key} className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: m.color }} />
                          {m.label}
                        </span>
                      ))}
                    </div>
                  </ChartCard>
                </div>
              </Reveal>
            </>
          )}
        </>
      )}
    </div>
  );
}
