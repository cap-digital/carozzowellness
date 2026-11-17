"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from "recharts";
import type { ReportModel } from "@/lib/report";
import { periodLabel, shortAd } from "@/lib/report";
import { brl, int, pct, compact, shortDate } from "@/lib/format";
import { capLabel } from "@/components/charts/labels";
import { OBJECTIVE_COLOR } from "@/lib/theme";
import { ExternalLink } from "lucide-react";
import type { Efficiency } from "@/lib/report";

// The report as A4 sheets (794 × 1123 px at 96 dpi). The same component is the
// on-screen preview and the print copy, so what you see is what the PDF gets.

const W = 794;
const H = 1123;
const PAD = 56;
const INNER = W - PAD * 2;

const C = {
  forest: "#324420",
  forestMid: "#465907",
  night: "#1b2612",
  cream: "#f1efe4",
  paper: "#fdfcf8",
  gold: "#b08a3e",
  goldLight: "#c9a463",
  wine: "#942143",
  ink: "#232a1c",
  ink2: "#5f5d52",
  muted: "#97958a",
  line: "#e6e3d6",
};
const PLATFORM = { meta: "#2f80c4", google: "#e0a010", youtube: "#cf3a5f" };

/** Number of A4 sheets the document renders (cover included). */
export const reportPageCount = (analysis: string) => (analysis.trim() ? 6 : 5);

// When set, only that sheet renders (paginated preview). The print copy leaves
// it unset and gets every sheet.
const VisiblePage = React.createContext<number | null>(null);

function Mark({ size = 34, light = true }: { size?: number; light?: boolean }) {
  return (
    <div
      style={{ width: size, height: size, borderRadius: size * 0.28, background: light ? "linear-gradient(135deg,#5a7020,#324420)" : C.cream }}
      className="flex shrink-0 items-center justify-center"
    >
      <span className="font-display font-semibold" style={{ fontSize: size * 0.48, color: light ? "#f3f1e7" : C.forest }}>C</span>
    </div>
  );
}

function Sheet({ children, page, total, period, cover }: { children: React.ReactNode; page: number; total: number; period: string; cover?: boolean }) {
  const visible = React.useContext(VisiblePage);
  if (visible != null && visible !== page) return null;
  return (
    <section
      className="report-sheet relative mx-auto overflow-hidden shadow-[0_8px_30px_rgba(35,42,28,0.12)]"
      style={{ width: W, minHeight: H, background: cover ? C.night : C.paper, marginBottom: 28, borderRadius: 4 }}
    >
      {!cover && (
        <header className="flex items-center justify-between" style={{ padding: `28px ${PAD}px 0` }}>
          <div className="flex items-center gap-2.5">
            <Mark size={24} />
            <span className="font-display text-[13px] font-semibold" style={{ color: C.forest }}>Carozzo Wellness</span>
            <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: C.gold }}>Relatório de mídia</span>
          </div>
          <span className="text-[10.5px]" style={{ color: C.muted }}>{period}</span>
        </header>
      )}
      <div style={{ padding: cover ? 0 : `20px ${PAD}px 72px` }}>{children}</div>
      {!cover && (
        <footer className="absolute bottom-0 left-0 right-0 flex items-center justify-between" style={{ padding: `0 ${PAD}px 26px` }}>
          <span className="text-[9.5px] uppercase tracking-[0.16em]" style={{ color: C.muted }}>Frente-mar de Salvador · Wellness Premium · Jardim Armação</span>
          <span className="text-[10px] tnum" style={{ color: C.muted }}>{page} / {total}</span>
        </footer>
      )}
    </section>
  );
}

function H2({ kicker, children }: { kicker: string; children: React.ReactNode }) {
  return (
    <div className="report-avoid mb-4 mt-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: C.gold }}>{kicker}</div>
      <h2 className="font-display text-[24px] font-semibold leading-tight tracking-tight" style={{ color: C.forest }}>{children}</h2>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="report-avoid rounded-lg px-3.5 py-3" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em]" style={{ color: C.muted }}>
        {accent && <span className="h-2 w-2 rounded-[2px]" style={{ background: accent }} />}
        {label}
      </div>
      <div className="mt-1 text-[19px] font-semibold leading-none tnum" style={{ color: C.ink }}>{value}</div>
      {sub && <div className="mt-1.5 text-[10.5px] leading-snug" style={{ color: C.ink2 }}>{sub}</div>}
    </div>
  );
}

const delta = (cur: number, prev: number | null | undefined, lowerIsBetter = false, neutral = false) => {
  if (prev == null || prev <= 0) return null;
  const v = ((cur - prev) / prev) * 100;
  if (Math.abs(v) < 1) return <span style={{ color: C.muted }}>estável</span>;
  const good = lowerIsBetter ? v < 0 : v > 0;
  return <span style={{ color: neutral ? "#e7e3d2" : good ? "#2f7a1f" : C.wine }}>{v > 0 ? "↑" : "↓"} {Math.abs(v).toFixed(0)}%</span>;
};

const th = "px-2.5 py-2 text-left text-[9.5px] font-semibold uppercase tracking-[0.1em]";
const td = "px-2.5 py-2 text-[11.5px] tnum";

export function ReportDocument({ model, analysis, page }: { model: ReportModel; analysis: string; page?: number }) {
  return (
    <VisiblePage.Provider value={page ?? null}>
      <ReportSheets model={model} analysis={analysis} />
    </VisiblePage.Provider>
  );
}

function ReportSheets({ model, analysis }: { model: ReportModel; analysis: string }) {
  const m = model;
  const period = periodLabel(m.period);
  const userText = analysis.trim();
  const userParas = userText ? userText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : [];
  const generatedAt = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  // With the team's text the analysis takes two sheets (it would overflow one);
  // later sheets shift by one and the page count follows.
  const split = userParas.length > 0;
  const total = reportPageCount(analysis);
  const after = split ? 1 : 0;

  const teamBox = (
    <div className="report-avoid mb-6 rounded-xl px-5 py-4" style={{ background: C.cream, borderLeft: `3px solid ${C.gold}` }}>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: C.gold }}>Análise da equipe</div>
      <div className="space-y-3">
        {userParas.map((p, i) => (
          <p key={i} className="whitespace-pre-line text-[12.5px] leading-[1.65]" style={{ color: C.ink }}>{p}</p>
        ))}
      </div>
    </div>
  );
  const highlightsBox = m.analysis.highlights.length > 0 && (
    <div className="report-avoid mb-6">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: C.forestMid }}>Destaques dos dados</div>
      <ul className="grid grid-cols-2 gap-2">
        {m.analysis.highlights.map((h, i) => (
          <li key={i} className="flex gap-2 rounded-lg px-3 py-2 text-[11.5px] leading-snug" style={{ background: "#fff", border: `1px solid ${C.line}`, color: C.ink }}>
            <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: C.gold }} />
            {h}
          </li>
        ))}
      </ul>
    </div>
  );
  const efficiencyBox = m.analysis.efficiency && (
    <div className="report-avoid mb-6 rounded-xl px-5 py-4" style={{ background: "#fff", border: `1px solid ${C.line}`, borderLeft: `3px solid ${C.forestMid}` }}>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: C.forestMid }}>Eficiência do investimento</div>
      <p className="text-[12.5px] leading-[1.7]" style={{ color: C.ink }}>{m.analysis.efficiency}</p>
    </div>
  );
  const paragraphsBox = (
    <div className="space-y-3">
      {m.analysis.paragraphs.map((p, i) => (
        <p key={i} className="report-avoid text-[12.5px] leading-[1.7]" style={{ color: C.ink }}>{p}</p>
      ))}
    </div>
  );

  const platforms = [
    { key: "meta", label: "Meta Ads", v: m.spend.meta, prev: m.prevSpend?.meta, color: PLATFORM.meta },
    { key: "google", label: "Google Pesquisa", v: m.spend.google, prev: m.prevSpend?.google, color: PLATFORM.google },
    { key: "youtube", label: "YouTube", v: m.spend.youtube, prev: m.prevSpend?.youtube, color: PLATFORM.youtube },
  ];

  const dailyData = m.daily.map((d) => ({ ...d, label: shortDate(d.date) }));
  const objs = m.objectives.filter((o) => o.totals.spend > 0);
  const creatives = m.creatives.filter((c) => c.totals.spend > 0).slice(0, 5);
  const div = (a: number, b: number) => (b > 0 ? a / b : 0);

  return (
    <div className="report-doc" style={{ fontFeatureSettings: '"tnum"' }}>
      {/* 1 — Cover */}
      <Sheet page={1} total={total} period={period} cover>
        <div className="relative flex flex-col justify-between" style={{ height: H, padding: `${PAD + 8}px ${PAD}px`, background: "radial-gradient(120% 80% at 85% 0%, #3d5418 0%, #1b2612 60%)" }}>
          <div className="flex items-center gap-3">
            <Mark size={46} />
            <div>
              <div className="font-display text-[19px] font-semibold" style={{ color: "#f3f1e7" }}>Carozzo Wellness</div>
              <div className="text-[10.5px] uppercase tracking-[0.2em]" style={{ color: C.goldLight }}>Media Dashboard</div>
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.26em]" style={{ color: C.goldLight }}>Relatório de performance</div>
            <h1 className="mt-3 font-display text-[54px] font-semibold leading-[1.02] tracking-tight" style={{ color: "#f3f1e7" }}>
              Mídia digital
            </h1>
            <div className="mt-5 h-px w-24" style={{ background: C.goldLight }} />
            <div className="mt-5 text-[17px]" style={{ color: "#e7e3d2" }}>{period}</div>
            <div className="mt-1 text-[12.5px]" style={{ color: "#a9a78f" }}>{m.days} {m.days === 1 ? "dia" : "dias"} · Meta Ads, Google Pesquisa e YouTube</div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-[11px] leading-relaxed" style={{ color: "#a9a78f" }}>
              Frente-mar de Salvador<br />Wellness Premium · Jardim Armação
            </div>
            <div className="text-right text-[11px]" style={{ color: "#a9a78f" }}>Gerado em {generatedAt}</div>
          </div>
        </div>
      </Sheet>

      {/* 2 — Executive summary */}
      <Sheet page={2} total={total} period={period}>
        <H2 kicker="Resumo executivo">O período em números</H2>
        <div className="report-avoid flex items-stretch gap-4 rounded-xl p-5" style={{ background: `linear-gradient(135deg, ${C.forest}, ${C.night})` }}>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: C.goldLight }}>Investimento total</div>
            <div className="mt-1.5 font-display text-[38px] font-semibold leading-none" style={{ color: "#f3f1e7" }}>{brl(m.spend.total)}</div>
            {m.prevSpend && (
              <div className="mt-2 text-[11px]" style={{ color: "#c9c5b0" }}>
                vs {brl(m.prevSpend.total)} no período anterior · {delta(m.spend.total, m.prevSpend.total, false, true) ?? "—"}
              </div>
            )}
          </div>
          <div className="w-[300px] space-y-2 self-center">
            {platforms.map((p) => (
              <div key={p.key}>
                <div className="flex justify-between text-[10.5px]" style={{ color: "#e7e3d2" }}>
                  <span>{p.label}</span>
                  <span className="tnum">{brl(p.v, 0)} · {pct(div(p.v, m.spend.total) * 100, 0)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${div(p.v, m.spend.total) * 100}%`, background: p.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Impressões" value={compact(m.impressions)} sub="todas as plataformas" />
          <Stat label="Alcance (Meta)" value={compact(m.meta.reach)} sub={`frequência ${m.metaD.frequency.toFixed(2).replace(".", ",")}`} />
          <Stat label="Cliques" value={int(m.clicks)} sub="link (Meta) + Google + YouTube" />
          <Stat label="CPM (Meta)" value={brl(m.metaD.cpm)} sub="custo por mil impressões" />
          <Stat label="CTR (Meta)" value={pct(m.metaD.ctrLink)} sub="cliques no link ÷ impressões" />
          <Stat label="CPC (Meta)" value={brl(m.metaD.cpcLink)} sub="custo por clique no link" />
        </div>

        <h3 className="report-avoid mb-2 mt-7 font-display text-[16px] font-semibold" style={{ color: C.forest }}>Conversões por tipo</h3>
        <table className="report-avoid w-full overflow-hidden rounded-lg" style={{ border: `1px solid ${C.line}`, background: "#fff" }}>
          <thead style={{ background: C.cream, color: C.ink2 }}>
            <tr>
              <th className={th}>Ação</th>
              <th className={th + " text-right"}>Resultados</th>
              <th className={th + " text-right"}>Custo por resultado</th>
              <th className={th + " text-right"}>Taxa</th>
              <th className={th + " text-right"}>vs anterior</th>
            </tr>
          </thead>
          <tbody>
            {m.conversions.map((c) => (
              <tr key={c.key} style={{ borderTop: `1px solid ${C.line}` }}>
                <td className={td} style={{ color: C.ink }}>
                  <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c.color }} />{c.label}</span>
                </td>
                <td className={td + " text-right font-semibold"} style={{ color: C.ink }}>{int(c.count)}</td>
                <td className={td + " text-right"} style={{ color: C.ink }}>{c.count > 0 ? brl(c.cost) : "—"}</td>
                <td className={td + " text-right"} style={{ color: C.ink2 }}>{c.count > 0 ? pct(c.rate) : "—"}</td>
                <td className={td + " text-right"}>{delta(c.count, c.prevCount) ?? <span style={{ color: C.muted }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[9.5px] leading-snug" style={{ color: C.muted }}>
          Cada ação é medida na sua própria campanha (custo = investimento dessa campanha ÷ resultados; taxa = resultados ÷ cliques no link). As ações não são somadas.
          {m.prev && ` Comparação com ${periodLabel(m.prev)}.`}
        </p>

        {m.efficiency && <EfficiencyBlock e={m.efficiency} />}
      </Sheet>

      {/* 3 — Analysis (user's qualitative text merged with the data reading) */}
      {split ? (
        <>
          {/* Team text + efficiency on one sheet; the data reading on the next. */}
          <Sheet page={3} total={total} period={period}>
            <H2 kicker="Análise">Leitura do período</H2>
            {teamBox}
            {efficiencyBox}
          </Sheet>
          <Sheet page={4} total={total} period={period}>
            <H2 kicker="Análise">O que os números mostram</H2>
            {highlightsBox}
            {paragraphsBox}
          </Sheet>
        </>
      ) : (
        <Sheet page={3} total={total} period={period}>
          <H2 kicker="Análise">Leitura dos dados</H2>
          {highlightsBox}
          {efficiencyBox}
          {paragraphsBox}
        </Sheet>
      )}

      {/* 4 — Investment & campaigns */}
      <Sheet page={4 + after} total={total} period={period}>
        <H2 kicker="Investimento">Ritmo de veiculação e campanhas</H2>
        <div className="report-avoid rounded-xl p-3" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
          <div className="mb-1 px-1 text-[11px] font-semibold" style={{ color: C.ink }}>Investimento diário por plataforma</div>
          <BarChart width={INNER - 26} height={230} data={dailyData} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={C.line} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: C.muted }} tickLine={false} axisLine={{ stroke: "#cfccbc" }} interval="preserveStartEnd" minTickGap={14} />
            <XAxis xAxisId="total" dataKey="label" hide />
            <YAxis tickFormatter={(v) => brl(v, 0)} tick={{ fontSize: 9, fill: C.muted }} tickLine={false} axisLine={false} width={58} />
            <Bar isAnimationActive={false} dataKey="meta" stackId="s" fill={PLATFORM.meta} maxBarSize={34} />
            <Bar isAnimationActive={false} dataKey="google" stackId="s" fill={PLATFORM.google} maxBarSize={34} />
            <Bar isAnimationActive={false} dataKey="youtube" stackId="s" fill={PLATFORM.youtube} maxBarSize={34} radius={[3, 3, 0, 0]} />
            {/* Invisible full-height bar: its top is the day's total, whichever
                platforms ran — the label rides on it. */}
            <Bar isAnimationActive={false} xAxisId="total" dataKey="total" fill="transparent" maxBarSize={34}>
              <LabelList dataKey="total" content={capLabel({ count: dailyData.length, format: (v) => brl(v, 0) })} />
            </Bar>
          </BarChart>
          <div className="mt-1 flex gap-4 px-1 text-[10px]" style={{ color: C.ink2 }}>
            {platforms.map((p) => (
              <span key={p.key} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px]" style={{ background: p.color }} />{p.label}</span>
            ))}
          </div>
        </div>

        <h3 className="report-avoid mb-2 mt-6 font-display text-[16px] font-semibold" style={{ color: C.forest }}>Campanhas (Meta Ads)</h3>
        <table className="w-full rounded-lg" style={{ border: `1px solid ${C.line}`, background: "#fff" }}>
          <thead style={{ background: C.cream, color: C.ink2 }}>
            <tr>
              <th className={th}>Campanha</th>
              <th className={th + " text-right"}>Investido</th>
              <th className={th + " text-right"}>% do Meta</th>
              <th className={th + " text-right"}>Resultado principal</th>
              <th className={th + " text-right"}>Custo</th>
            </tr>
          </thead>
          <tbody>
            {objs.map((o) => {
              const cost = o.key === "ALCANCE" ? `${brl(o.derived.cpm)} CPM` : o.key === "VIDEOVIEW" ? `${brl(o.derived.cpv, 3)} CPV` : o.primaryValue > 0 ? brl(o.costPerResult) : "—";
              return (
                <tr key={o.key} className="report-avoid" style={{ borderTop: `1px solid ${C.line}` }}>
                  <td className={td} style={{ color: C.ink }}>
                    <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: OBJECTIVE_COLOR[o.key] ?? o.color }} />{o.key}</span>
                  </td>
                  <td className={td + " text-right"} style={{ color: C.ink }}>{brl(o.totals.spend)}</td>
                  <td className={td + " text-right"} style={{ color: C.ink2 }}>{pct(div(o.totals.spend, m.meta.spend) * 100, 1)}</td>
                  <td className={td + " text-right"} style={{ color: C.ink }}>
                    <span className="font-semibold">{o.primaryValue >= 100000 ? compact(o.primaryValue) : int(o.primaryValue)}</span>{" "}
                    <span className="text-[10px]" style={{ color: C.muted }}>{o.primary?.short ?? ""}</span>
                  </td>
                  <td className={td + " text-right font-semibold"} style={{ color: C.ink }}>{cost}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Sheet>

      {/* 5 — Platforms, creatives, audience */}
      <Sheet page={5 + after} total={total} period={period}>
        <H2 kicker="Canais, criativos e público">Onde e com quem a mídia rendeu</H2>
        <div className="grid grid-cols-2 gap-3">
          <div className="report-avoid rounded-xl p-4" style={{ background: "#fff", border: `1px solid ${C.line}`, borderTop: `3px solid ${PLATFORM.google}` }}>
            <div className="text-[12px] font-semibold" style={{ color: C.ink }}>Google Pesquisa</div>
            {m.google.impressions > 0 ? (
              <div className="mt-2 grid grid-cols-3 gap-y-2.5 text-[10px]" style={{ color: C.muted }}>
                {[["Investido", brl(m.google.spend, 0)], ["Impressões", compact(m.google.impressions)], ["Cliques", int(m.google.clicks)], ["CTR", pct(m.googleD.ctr)], ["CPC", brl(m.googleD.cpc)], ["CPM", brl(m.googleD.cpm)]].map(([l, v]) => (
                  <div key={l}><div className="uppercase tracking-[0.1em]">{l}</div><div className="text-[13px] font-semibold tnum" style={{ color: C.ink }}>{v}</div></div>
                ))}
              </div>
            ) : <div className="mt-2 text-[11px]" style={{ color: C.muted }}>Sem veiculação no período</div>}
          </div>
          <div className="report-avoid rounded-xl p-4" style={{ background: "#fff", border: `1px solid ${C.line}`, borderTop: `3px solid ${PLATFORM.youtube}` }}>
            <div className="text-[12px] font-semibold" style={{ color: C.ink }}>YouTube</div>
            {m.youtube.impressions > 0 ? (
              <div className="mt-2 grid grid-cols-3 gap-y-2.5 text-[10px]" style={{ color: C.muted }}>
                {[["Investido", brl(m.youtube.spend, 0)], ["Impressões", compact(m.youtube.impressions)], ["Views", compact(m.youtube.views)], ["VTR", pct(m.youtubeD.vtr)], ["CPV", brl(m.youtubeD.cpv, 3)], ["Cliques", int(m.youtube.clicks)]].map(([l, v]) => (
                  <div key={l}><div className="uppercase tracking-[0.1em]">{l}</div><div className="text-[13px] font-semibold tnum" style={{ color: C.ink }}>{v}</div></div>
                ))}
              </div>
            ) : <div className="mt-2 text-[11px]" style={{ color: C.muted }}>Sem veiculação no período</div>}
          </div>
        </div>

        <h3 className="report-avoid mb-2 mt-6 font-display text-[16px] font-semibold" style={{ color: C.forest }}>Criativos com maior investimento (Meta)</h3>
        <div className="space-y-2">
          {creatives.map((c, i) => (
            <div key={c.ad} className="report-avoid flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
              <span className="w-4 text-[11px] font-semibold" style={{ color: C.gold }}>{i + 1}</span>
              {c.thumb ? (
                <a href={c.permalink || undefined} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.thumb} alt="" className="h-14 w-14 rounded-md object-cover" referrerPolicy="no-referrer" />
                </a>
              ) : (
                <div className="h-14 w-14 shrink-0 rounded-md" style={{ background: C.cream }} />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[11.5px] font-semibold leading-snug" style={{ color: C.ink }}>{shortAd(c.ad)}</div>
                <div className="text-[10px]" style={{ color: C.muted }}>{c.format} · {c.objective}</div>
              </div>
              {[["Investido", brl(c.totals.spend, 0)], ["CTR", pct(c.derived.ctrLink)], ["Cliques", int(c.totals.linkClicks)], [c.primary?.short ?? "Resultado", c.primaryValue >= 100000 ? compact(c.primaryValue) : int(c.primaryValue)]].map(([l, v]) => (
                <div key={l} className="w-[66px] text-right">
                  <div className="whitespace-nowrap text-[9px] uppercase tracking-[0.06em]" style={{ color: C.muted }}>{l}</div>
                  <div className="text-[12px] font-semibold tnum" style={{ color: C.ink }}>{v}</div>
                </div>
              ))}
              {c.permalink ? (
                <a
                  href={c.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                  style={{ border: `1px solid ${C.line}`, color: C.forest, background: C.cream }}
                >
                  Ver post <ExternalLink size={10} />
                </a>
              ) : (
                <span className="ml-1 w-[68px]" />
              )}
            </div>
          ))}
          {!creatives.length && <div className="text-[11px]" style={{ color: C.muted }}>Sem criativos com veiculação no período.</div>}
        </div>

        {m.ages.length > 0 && (
          <div className="report-avoid mt-6">
            <h3 className="mb-2 font-display text-[16px] font-semibold" style={{ color: C.forest }}>Público por faixa etária (Meta)</h3>
            <div className="rounded-xl px-4 py-3" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
              {m.ages.map((a) => (
                <div key={a.age} className="flex items-center gap-3 py-1">
                  <span className="w-12 text-[11px]" style={{ color: C.ink2 }}>{a.age}</span>
                  <div className="h-2.5 flex-1 rounded-full" style={{ background: C.cream }}>
                    <div className="h-2.5 rounded-full" style={{ width: `${Math.max(a.share, 0.5)}%`, background: C.forestMid }} />
                  </div>
                  <span className="w-[140px] whitespace-nowrap text-right text-[10.5px] tnum" style={{ color: C.ink }}>{pct(a.share, 1)} das impressões</span>
                  <span className="w-[70px] text-right text-[10.5px] tnum" style={{ color: C.ink2 }}>CTR {pct(a.ctr)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

// Investment vs contacts, indexed to the previous period (= 100), plus what that
// means per real. The ONLY place conversion actions are summed — the per-action
// counts sit right beside the total so nothing is hidden by it.
function EfficiencyBlock({ e }: { e: Efficiency }) {
  const idx = (now: number, prev: number) => (prev > 0 ? (now / prev) * 100 : 0);
  const bars = [
    { label: "Investimento", v: idx(e.spend.now, e.spend.prev), color: C.gold, detail: `${brl(e.spend.prev, 0)} → ${brl(e.spend.now, 0)}` },
    { label: "Contatos (WhatsApp + leads)", v: idx(e.contacts.now, e.contacts.prev), color: C.forestMid, detail: `${int(e.contacts.prev)} → ${int(e.contacts.now)}` },
  ];
  const max = Math.max(100, ...bars.map((b) => b.v)) * 1.08;
  const signed = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(0)}%`;
  const stats: [string, string, number | null][] = [
    ["Contatos por R$ 1.000", `${e.perThousand.prev.toFixed(0)} → ${e.perThousand.now.toFixed(0)}`, null],
    ["Custo por contato", `${brl(e.costPerContact.prev)} → ${brl(e.costPerContact.now)}`, e.costPerContact.change],
    ["Só nas campanhas de conversão", `${brl(e.convCostPerContact.prev)} → ${brl(e.convCostPerContact.now)}`, e.convCostPerContact.change],
  ];
  return (
    <div className="report-avoid mt-6">
      <h3 className="mb-2 font-display text-[16px] font-semibold" style={{ color: C.forest }}>Eficiência do investimento</h3>
      <div className="rounded-xl p-4" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
        <div className="text-[10px]" style={{ color: C.muted }}>Variação vs período anterior (traço = período anterior, índice 100)</div>
        <div className="mt-2 space-y-2.5">
          {bars.map((b) => (
            <div key={b.label} className="flex items-center gap-3">
              <span className="w-[170px] whitespace-nowrap text-[11px]" style={{ color: C.ink }}>{b.label}</span>
              <div className="relative h-5 flex-1 rounded" style={{ background: C.cream }}>
                <div className="h-5 rounded" style={{ width: `${(b.v / max) * 100}%`, background: b.color }} />
                <div className="absolute top-[-3px] h-[26px] w-px" style={{ left: `${(100 / max) * 100}%`, background: C.ink2 }} />
              </div>
              <span className="w-[54px] text-right text-[12px] font-semibold tnum" style={{ color: C.ink }}>{signed(b.v - 100)}</span>
              <span className="w-[120px] text-right text-[10px] tnum" style={{ color: C.ink2 }}>{b.detail}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-3" style={{ borderColor: C.line }}>
          {stats.map(([l, v, ch]) => (
            <div key={l}>
              <div className="text-[9.5px] uppercase tracking-[0.1em]" style={{ color: C.muted }}>{l}</div>
              <div className="mt-0.5 text-[12.5px] font-semibold tnum" style={{ color: C.ink }}>
                {v} {ch != null && <span className="text-[10.5px]" style={{ color: ch <= 0 ? "#2f7a1f" : C.wine }}>{signed(ch)}</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px]" style={{ color: C.ink2 }}>
          <span style={{ color: C.muted }}>Por ação:</span>
          {e.actions.map((a) => (
            <span key={a.key} className="inline-flex items-center gap-1.5 tnum">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: a.color }} />
              {a.label} {int(a.prev)} → {int(a.now)}
              {a.change != null && <span style={{ color: a.change >= 0 ? "#2f7a1f" : C.wine }}>({signed(a.change)})</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
