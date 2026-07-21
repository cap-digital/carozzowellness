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
import { Donut } from "@/components/charts/Donut";
import { Heatmap } from "@/components/charts/Heatmap";
import { Pyramid } from "@/components/charts/Pyramid";
import { makeTooltip } from "@/components/charts/ChartTooltip";
import { sum, derive, groupSum } from "@/lib/metrics";
import { ageGenderMatrix, ageBreakdown, genderBreakdown, orderedAges } from "@/lib/aggregate";
import { brl, int, pct, compact } from "@/lib/format";
import { CHART, GENDER_COLOR } from "@/lib/theme";
import type { Row } from "@/lib/types";

export default function PublicoPage() {
  return (
    <Loadable>
      <Publico />
    </Loadable>
  );
}

type MetricKey = "impressions" | "spend" | "clicks" | "conv";

const METRIC_ACCESSOR: Record<MetricKey, { fn: (r: Row) => number; label: string; fmt: (v: number) => string }> = {
  impressions: { fn: (r) => r.impressions, label: "Impressões", fmt: (v) => int(v) },
  spend: { fn: (r) => r.spend, label: "Investimento", fmt: (v) => brl(v, 0) },
  clicks: { fn: (r) => r.linkClicks, label: "Cliques no link", fmt: (v) => int(v) },
  conv: { fn: (r) => r.whatsapp + r.leads + r.conversations, label: "Conversões", fmt: (v) => int(v) },
};

function Publico() {
  const { rows } = useData();
  const [metric, setMetric] = useState<MetricKey>("impressions");

  const t = useMemo(() => sum(rows), [rows]);
  const genders = useMemo(() => genderBreakdown(rows), [rows]);
  const ages = useMemo(() => ageBreakdown(rows), [rows]);

  // Gender split for donut
  const genderDonut = genders
    .map((g) => ({
      name: g.key === "female" ? "Feminino" : g.key === "male" ? "Masculino" : "Não identificado",
      value: g.totals.impressions,
      color: GENDER_COLOR[g.key] ?? "#a8a496",
    }))
    .sort((a, b) => b.value - a.value);

  const female = genders.find((g) => g.key === "female")?.totals.impressions ?? 0;
  const male = genders.find((g) => g.key === "male")?.totals.impressions ?? 0;
  const femalePct = (female / (female + male || 1)) * 100;

  // Pyramid rows (female vs male impressions per age)
  const pyramid = useMemo(() => {
    const ag = orderedAges(rows).filter((a) => a !== "Unknown");
    const acc = (age: string, gender: string) =>
      rows.filter((r) => r.age === age && r.gender === gender).reduce((s, r) => s + r.impressions, 0);
    return ag.map((a) => ({ label: a, left: acc(a, "female"), right: acc(a, "male") }));
  }, [rows]);

  // Heatmap: age × gender for chosen metric
  const genderCols = ["female", "male", "unknown"].filter((g) => genders.some((x) => x.key === g));
  const heat = useMemo(
    () => ageGenderMatrix(rows, genderCols, METRIC_ACCESSOR[metric].fn),
    [rows, genderCols, metric]
  );
  const colLabels = genderCols.map((g) => (g === "female" ? "Feminino" : g === "male" ? "Masculino" : "Outro"));

  // CTR + conversions by age
  const ageStats = useMemo(
    () =>
      groupSum(rows, (r) => r.age)
        .map((g) => ({ age: g.key, d: derive(g.totals), t: g.totals }))
        .filter((x) => x.age !== "Unknown")
        .sort((a, b) => orderedAges(rows).indexOf(a.age) - orderedAges(rows).indexOf(b.age)),
    [rows]
  );

  const dominantAge = [...ages].sort((a, b) => b.totals.impressions - a.totals.impressions).find((a) => a.key !== "Unknown");

  const mAcc = METRIC_ACCESSOR[metric];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Reveal>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="p-4">
            <div className="text-[12px] text-[var(--text-secondary)]">Público feminino</div>
            <div className="mt-1 text-[26px] font-semibold" style={{ color: GENDER_COLOR.female }}>{pct(femalePct, 0)}</div>
            <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">das impressões identificadas</div>
          </Card>
          <Card className="p-4">
            <div className="text-[12px] text-[var(--text-secondary)]">Faixa dominante</div>
            <div className="mt-1 text-[26px] font-semibold text-[var(--text-primary)]">{dominantAge?.key}</div>
            <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">{compact(dominantAge?.totals.impressions ?? 0)} impressões</div>
          </Card>
          <Card className="p-4">
            <div className="text-[12px] text-[var(--text-secondary)]">Faixas etárias</div>
            <div className="mt-1 text-[26px] font-semibold text-[var(--text-primary)]">{ages.filter((a) => a.key !== "Unknown").length}</div>
            <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">segmentos alcançados</div>
          </Card>
          <Card className="p-4">
            <div className="text-[12px] text-[var(--text-secondary)]">Alcance total</div>
            <div className="mt-1 text-[26px] font-semibold text-[var(--text-primary)]">{compact(t.reach)}</div>
            <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">pessoas únicas</div>
          </Card>
        </div>
      </Reveal>

      {/* Pyramid + gender donut */}
      <Reveal delay={60}>
        <SectionTitle hint="composição por gênero e idade">Distribuição demográfica</SectionTitle>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <ChartCard className="lg:col-span-3" title="Pirâmide etária por gênero" subtitle="Impressões — feminino à esquerda, masculino à direita" accent={GENDER_COLOR.female}>
            <div className="pt-2">
              <Pyramid
                rows={pyramid}
                leftColor={GENDER_COLOR.female}
                rightColor={GENDER_COLOR.male}
                leftLabel="Feminino"
                rightLabel="Masculino"
                format={(v) => int(v)}
              />
            </div>
          </ChartCard>

          <ChartCard className="lg:col-span-2" title="Divisão por gênero" subtitle="Participação nas impressões" accent={GENDER_COLOR.male}>
            <Donut
              data={genderDonut}
              centerValue={compact(t.impressions)}
              centerLabel="impressões"
              format={(v) => compact(v)}
              height={190}
            />
          </ChartCard>
        </div>
      </Reveal>

      {/* Heatmap */}
      <Reveal delay={120}>
        <ChartCard
          title="Mapa de calor: idade × gênero"
          subtitle={`Intensidade por ${mAcc.label.toLowerCase()}`}
          accent="#5a8f22"
          right={
            <Segmented
              size="sm"
              value={metric}
              onChange={(v) => setMetric(v as MetricKey)}
              options={[
                { value: "impressions", label: "Impressões" },
                { value: "spend", label: "Investido" },
                { value: "clicks", label: "Cliques" },
                { value: "conv", label: "Conversões" },
              ]}
            />
          }
        >
          <div className="pt-2">
            <Heatmap
              rows={heat.ages}
              cols={colLabels}
              matrix={heat.matrix}
              format={mAcc.fmt}
              cellLabel={(v) => (mAcc === METRIC_ACCESSOR.spend ? brl(v, 0) : compact(v))}
            />
          </div>
        </ChartCard>
      </Reveal>

      {/* CTR + conversions by age */}
      <Reveal delay={160}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="CTR por faixa etária" subtitle="Quais idades mais clicam (%)" accent="#e0a010">
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

          <ChartCard title="Conversões por faixa etária" subtitle="WhatsApp + leads + conversas" accent="#cf3a5f">
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={ageStats.map((a) => ({ name: a.age, v: a.t.whatsapp + a.t.leads + a.t.conversations }))} margin={{ top: 4, right: 40, left: 4, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke={CHART.grid} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: CHART.textSecondary }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip cursor={{ fill: "rgba(70,89,7,0.06)" }} content={makeTooltip((_n, v) => ({ label: "Conversões", value: int(v), color: "#cf3a5f" }))} />
                  <Bar isAnimationActive={false} dataKey="v" fill="#cf3a5f" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    <LabelList dataKey="v" position="right" formatter={(v: any) => int(v)} style={{ fontSize: 11, fill: CHART.textSecondary, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </Reveal>
    </div>
  );
}
