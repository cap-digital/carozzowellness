"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  ComposedChart,
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
import { makeTooltip } from "@/components/charts/ChartTooltip";
import { sum, derive, computeCosts } from "@/lib/metrics";
import { dailySeries } from "@/lib/aggregate";
import { brl, int, pct, compactBRL, shortDate } from "@/lib/format";
import { CHART } from "@/lib/theme";
import { Info } from "lucide-react";

export default function CustosPage() {
  return (
    <Loadable>
      <Custos />
    </Loadable>
  );
}

function Custos() {
  const { rows } = useData();
  const [feePct, setFeePct] = useState(15);
  const [taxPct, setTaxPct] = useState(0);

  const t = useMemo(() => sum(rows), [rows]);
  const d = useMemo(() => derive(t), [t]);
  const cost = useMemo(() => computeCosts(t, { feePct, taxPct }), [t, feePct, taxPct]);
  const daily = useMemo(() => dailySeries(rows), [rows]);

  const totalFactor = (1 + feePct / 100) * (1 + taxPct / 100);

  // Waterfall: Mídia -> +Gestão -> +Impostos -> Total
  const waterfall = [
    { name: "Mídia", base: 0, delta: cost.media, color: "#465907", label: cost.media },
    { name: "+ Gestão", base: cost.media, delta: cost.fee, color: "#b08a3e", label: cost.fee },
    { name: "+ Impostos", base: cost.media + cost.fee, delta: cost.tax, color: "#8a63d4", label: cost.tax },
    { name: "Total", base: 0, delta: cost.total, color: "#324420", label: cost.total },
  ];

  const conversions = t.whatsapp + t.conversations + t.leads;

  // Raw vs effective cost-per metrics
  const perResult = [
    { name: "CPL (lead)", raw: d.cpl, eff: d.cpl * totalFactor },
    { name: "Custo/conversa", raw: d.cpConversation, eff: d.cpConversation * totalFactor },
    { name: "Custo/WhatsApp", raw: d.cpWhatsapp, eff: d.cpWhatsapp * totalFactor },
    { name: "Custo/conversão", raw: d.costPerConversion, eff: d.costPerConversion * totalFactor },
  ].map((m) => ({ ...m, raw: +m.raw.toFixed(2), eff: +m.eff.toFixed(2) }));

  const dailyCost = daily.map((p) => ({
    date: p.date,
    media: p.spend,
    total: +(p.spend * totalFactor).toFixed(2),
  }));

  return (
    <div className="space-y-6">
      {/* Controls + total */}
      <Reveal>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="font-display text-[17px] text-[var(--text-primary)]">Parâmetros de custo</h3>
              <span className="group relative">
                <Info size={14} className="text-[var(--text-muted)]" />
              </span>
            </div>
            <p className="mb-4 text-[12.5px] text-[var(--text-secondary)]">
              Ajuste a taxa de gestão e os impostos para ver o investimento total e os custos efetivos por resultado.
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Control label="Taxa de gestão / agência" value={feePct} onChange={setFeePct} max={30} color="#b08a3e" />
              <Control label="Impostos sobre a mídia" value={taxPct} onChange={setTaxPct} max={25} color="#8a63d4" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-4 text-center">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Mídia</div>
                <div className="mt-0.5 text-[16px] font-semibold tnum text-[var(--text-primary)]">{brl(cost.media, 0)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Gestão</div>
                <div className="mt-0.5 text-[16px] font-semibold tnum" style={{ color: "#b08a3e" }}>{brl(cost.fee, 0)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Impostos</div>
                <div className="mt-0.5 text-[16px] font-semibold tnum" style={{ color: "#8a63d4" }}>{brl(cost.tax, 0)}</div>
              </div>
            </div>
          </Card>

          <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[#26331a] to-[#161f0d] p-5 text-[#f3f1e7] shadow-card">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#b08a3e]/25 blur-2xl" />
            <div className="relative">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#c9a463]">Investimento total</p>
              <p className="mt-2 font-display text-[38px] font-semibold leading-none">{brl(cost.total)}</p>
              <p className="mt-2 text-[12.5px] text-white/60">
                Mídia {brl(cost.media, 0)} + taxas {brl(cost.total - cost.media, 0)}
              </p>
              <div className="mt-4 space-y-1.5 text-[12.5px]">
                <div className="flex justify-between"><span className="text-white/55">CPM efetivo</span><span className="font-semibold tnum">{brl(cost.effectiveCpm)}</span></div>
                <div className="flex justify-between"><span className="text-white/55">Custo/conversão efetivo</span><span className="font-semibold tnum">{brl(cost.effectiveCpConversion)}</span></div>
                <div className="flex justify-between"><span className="text-white/55">Acréscimo sobre a mídia</span><span className="font-semibold tnum">+{pct((totalFactor - 1) * 100, 1)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Waterfall + composition */}
      <Reveal delay={60}>
        <SectionTitle hint="da mídia ao investimento total">Composição do custo</SectionTitle>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard className="lg:col-span-2" title="Cascata de custos" subtitle="Como a mídia se transforma no investimento total" accent="#465907">
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfall} margin={{ top: 20, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 11.5, fill: CHART.textSecondary }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                  <YAxis tickFormatter={(v) => compactBRL(v)} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={false} width={64} />
                  <Tooltip cursor={{ fill: "rgba(70,89,7,0.06)" }} content={makeTooltip((_n, v) => (v > 0 ? { label: "Valor", value: brl(v) } : null), (l) => String(l))} />
                  {/* invisible base to float the delta */}
                  <Bar isAnimationActive={false} dataKey="base" stackId="w" fill="transparent" />
                  <Bar isAnimationActive={false} dataKey="delta" stackId="w" radius={[4, 4, 0, 0]} maxBarSize={64}>
                    {waterfall.map((w) => (
                      <Cell key={w.name} fill={w.color} />
                    ))}
                    <LabelList dataKey="label" position="top" formatter={(v: any) => brl(v, 0)} style={{ fontSize: 11, fill: CHART.textSecondary, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Distribuição do investimento" subtitle="Participação de cada componente" accent="#b08a3e">
            <div className="flex h-full flex-col justify-center gap-4 py-2">
              {[
                { label: "Mídia", value: cost.media, color: "#465907" },
                { label: "Gestão", value: cost.fee, color: "#b08a3e" },
                { label: "Impostos", value: cost.tax, color: "#8a63d4" },
              ].map((c) => {
                const share = (c.value / (cost.total || 1)) * 100;
                return (
                  <div key={c.label}>
                    <div className="mb-1 flex items-center justify-between text-[12.5px]">
                      <span className="flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c.color }} /> {c.label}
                      </span>
                      <span className="tnum text-[var(--text-secondary)]">{brl(c.value, 0)} · {pct(share, 1)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${share}%`, background: c.color }} />
                    </div>
                  </div>
                );
              })}
              <div className="mt-1 flex items-center justify-between border-t border-[var(--border)] pt-3 text-[13px]">
                <span className="font-semibold text-[var(--text-primary)]">Total</span>
                <span className="font-semibold tnum text-[var(--text-primary)]">{brl(cost.total)}</span>
              </div>
            </div>
          </ChartCard>
        </div>
      </Reveal>

      {/* Cost per result raw vs effective */}
      <Reveal delay={120}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Custo por resultado: mídia vs. efetivo" subtitle={`Efetivo inclui gestão (${feePct}%) e impostos (${taxPct}%)`} accent="#cf3a5f">
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perResult} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} interval={0} angle={-12} textAnchor="end" height={48} />
                  <YAxis tickFormatter={(v) => brl(v, 0)} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip cursor={{ fill: "rgba(70,89,7,0.06)" }} content={makeTooltip((n, v) => ({ label: n === "raw" ? "Só mídia" : "Efetivo", value: brl(v), color: n === "raw" ? "#7c9440" : "#b08a3e" }))} />
                  <Bar isAnimationActive={false} dataKey="raw" fill="#7c9440" radius={[3, 3, 0, 0]} maxBarSize={26} />
                  <Bar isAnimationActive={false} dataKey="eff" fill="#b08a3e" radius={[3, 3, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex gap-4 px-1 text-[11.5px] text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#7c9440]" /> Só mídia</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#b08a3e]" /> Com taxas</span>
            </div>
          </ChartCard>

          <ChartCard title="Custo diário: mídia e investimento total" subtitle="Barras: mídia do dia · Linha: total com taxas" accent="#465907">
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyCost} margin={{ top: 12, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                  <YAxis tickFormatter={(v) => compactBRL(v)} tick={{ fontSize: 11, fill: CHART.textMuted }} tickLine={false} axisLine={false} width={60} />
                  <Tooltip content={makeTooltip((n, v) => ({ label: n === "media" ? "Mídia" : "Total c/ taxas", value: brl(v), color: n === "media" ? "#7c9440" : "#b08a3e" }), (l) => shortDate(String(l)))} cursor={{ fill: "rgba(70,89,7,0.06)" }} />
                  <Bar isAnimationActive={false} dataKey="media" fill="#7c9440" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  <Line isAnimationActive={false} type="monotone" dataKey="total" stroke="#b08a3e" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#b08a3e", stroke: "var(--surface-1)", strokeWidth: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </Reveal>

      {/* Metrics table */}
      <Reveal delay={160}>
        <ChartCard title="Resumo de custos e taxas" subtitle="Indicadores de custo e eficiência do período" accent="#8f6d29">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <tbody>
                {[
                  { l: "Investimento em mídia", v: brl(cost.media) },
                  { l: `Taxa de gestão (${feePct}%)`, v: brl(cost.fee) },
                  { l: `Impostos (${taxPct}%)`, v: brl(cost.tax) },
                  { l: "Investimento total", v: brl(cost.total), strong: true },
                  { l: "CPM (mídia)", v: brl(d.cpm) },
                  { l: "CPM efetivo", v: brl(cost.effectiveCpm) },
                  { l: "CPC no link", v: brl(d.cpcLink) },
                  { l: "Conversões totais", v: int(conversions) },
                  { l: "Custo por conversão (efetivo)", v: brl(cost.effectiveCpConversion), strong: true },
                ].map((r) => (
                  <tr key={r.l} className="border-b border-[var(--border)]/60 last:border-0">
                    <td className={`py-2.5 ${r.strong ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>{r.l}</td>
                    <td className={`py-2.5 text-right tnum ${r.strong ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-primary)]"}`}>{r.v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </Reveal>
    </div>
  );
}

function Control({
  label,
  value,
  onChange,
  max,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-[12.5px] font-medium text-[var(--text-secondary)]">{label}</label>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5">
          <input
            type="number"
            value={value}
            min={0}
            max={max}
            onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
            className="w-10 bg-transparent text-right text-[13px] font-semibold tnum text-[var(--text-primary)] outline-none"
          />
          <span className="text-[12px] text-[var(--text-muted)]">%</span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-[var(--brand)]"
        style={{ accentColor: color }}
      />
    </div>
  );
}
