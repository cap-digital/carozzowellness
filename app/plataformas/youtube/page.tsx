"use client";

import { useMemo } from "react";
import {
  ComposedChart,
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
import { Badge } from "@/components/ui/Badge";
import { TipShell } from "@/components/charts/ChartTooltip";
import { gaSum, gaDerive, gaDaily } from "@/lib/googleAds";
import { brl, int, pct, compact, shortDate } from "@/lib/format";
import { CHART } from "@/lib/theme";
import { MonitorPlay, Clock } from "lucide-react";

const WINE = "#cf3a5f";
const TEAL = "#14a58c";

export default function YoutubePage() {
  return (
    <Loadable>
      <Youtube />
    </Loadable>
  );
}

function Youtube() {
  const { youtubeRows: rows } = useData();

  const t = useMemo(() => gaSum(rows), [rows]);
  const d = useMemo(() => gaDerive(t), [t]);
  const daily = useMemo(() => gaDaily(rows), [rows]);

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
                <p className="text-[12.5px] text-[var(--text-secondary)]">
                  Vídeo · Google Ads · {int(t.rows)} registros
                </p>
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

      {/* Daily delivery */}
      <Reveal delay={60}>
        <SectionTitle hint="impressões e views ao longo do período">Entrega diária</SectionTitle>
        <ChartCard title="Impressões e views por dia" subtitle="Barras: impressões · Linha: views (TrueView)" accent={WINE}>
          <div style={{ height: 288 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={daily} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                <YAxis yAxisId="left" tickFormatter={compact} tick={{ fontSize: 11, fill: WINE }} tickLine={false} axisLine={false} width={44} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={compact} tick={{ fontSize: 11, fill: TEAL }} tickLine={false} axisLine={false} width={44} />
                <Tooltip content={dailyTip} cursor={{ fill: "rgba(70,89,7,0.06)" }} />
                <Bar yAxisId="left" isAnimationActive={false} dataKey="impressions" fill={WINE} radius={[4, 4, 0, 0]} maxBarSize={34} />
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
      </Reveal>

      {/* Daily investment */}
      <Reveal delay={120}>
        <ChartCard title="Investimento por dia" subtitle="Gasto diário em vídeo (R$)" accent="#465907">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={daily} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                <YAxis tickFormatter={(v) => brl(v, 0)} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={false} width={54} />
                <Tooltip cursor={{ fill: "rgba(70,89,7,0.06)" }} content={({ active, payload, label }: any) => (active && payload?.length ? <TipShell title={shortDate(String(label))} rows={[{ label: "Investido", value: brl(payload[0].value), color: "#465907" }]} /> : null)} />
                <Bar isAnimationActive={false} dataKey="spend" fill="#7c9440" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </Reveal>
    </div>
  );
}
