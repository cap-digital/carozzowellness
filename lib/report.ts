// Report model: everything the "Gerar Report" document shows for one period,
// plus a written analysis generated from those same numbers.
//
// The analysis is rule-based on purpose: every sentence is computed from the
// data below (no free text is invented), so it can never contradict the tables
// it sits next to. When the user writes their own qualitative analysis, the
// document shows theirs first and keeps these data highlights alongside it.

import type { Row, Totals } from "./types";
import { sum, derive, CONVERSION_METRICS, type Derived } from "./metrics";
import { objectiveBreakdown, conversionStats, adBreakdown, ageBreakdown, type ConversionStat } from "./aggregate";
import { gaSum, gaDerive, type GAdsRow, type GAdsTotals, type GAdsDerived } from "./googleAds";
import { brl, int, pct, compact, shiftIso, isValidDate } from "./format";

export interface ReportPeriod {
  start: string; // yyyy-mm-dd, inclusive
  end: string; // yyyy-mm-dd, inclusive
}

export interface ReportModel {
  period: ReportPeriod;
  days: number;
  prev: ReportPeriod | null; // same length, immediately before; null if no data there
  meta: Totals;
  metaD: Derived;
  google: GAdsTotals;
  googleD: GAdsDerived;
  youtube: GAdsTotals;
  youtubeD: GAdsDerived;
  spend: { total: number; meta: number; google: number; youtube: number };
  prevSpend: { total: number; meta: number; google: number; youtube: number } | null;
  impressions: number;
  clicks: number; // Meta link clicks + Google/YouTube clicks
  daily: { date: string; meta: number; google: number; youtube: number; total: number }[];
  objectives: ReturnType<typeof objectiveBreakdown>;
  conversions: (ConversionStat & { prevCount: number | null; prevCost: number | null })[];
  creatives: ReturnType<typeof adBreakdown>;
  ages: { age: string; impressions: number; share: number; ctr: number; spend: number }[];
  efficiency: Efficiency | null; // vs the previous period; null without one
  analysis: { paragraphs: string[]; highlights: string[]; efficiency: string | null };
  empty: boolean;
}

/**
 * Results vs investment. The one place the report SUMS conversion actions
 * ("contatos" = WhatsApp + every lead type) — approved for this comparison
 * only, and always shown next to the per-action breakdown.
 */
export interface Efficiency {
  spend: { now: number; prev: number; change: number }; // change in %
  contacts: { now: number; prev: number; change: number };
  costPerContact: { now: number; prev: number; change: number }; // total spend ÷ contacts
  perThousand: { now: number; prev: number }; // contacts per R$ 1.000 invested
  // Same ratio on the conversion campaigns' own spend — separates "the campaigns
  // got better" from "more budget was moved to them".
  convShare: { now: number; prev: number }; // % of total spend in conversion campaigns
  convCostPerContact: { now: number; prev: number; change: number };
  actions: { key: string; label: string; color: string; now: number; prev: number; change: number | null }[];
}

const inP = (p: ReportPeriod) => (d: string) => isValidDate(d) && d >= p.start && d <= p.end;
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5) + 1;
const div = (a: number, b: number) => (b > 0 ? a / b : 0);

// "alta de 12%" / "queda de 8%" / "estável" — used in prose.
function change(cur: number, prev: number) {
  if (prev <= 0) return null;
  const v = ((cur - prev) / prev) * 100;
  if (Math.abs(v) < 1) return { v, text: "estável" };
  return { v, text: `${v > 0 ? "alta" : "queda"} de ${Math.abs(v).toFixed(0)}%` };
}
const arrow = (v: number) => (v > 0 ? "↑" : "↓");

const dateBR = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
export const periodLabel = (p: ReportPeriod) =>
  p.start === p.end ? dateBR(p.start) : `${dateBR(p.start)} a ${dateBR(p.end)}`;

export function buildReport(allRows: Row[], allGads: GAdsRow[], period: ReportPeriod): ReportModel {
  const rows = allRows.filter((r) => inP(period)(r.date));
  const gads = allGads.filter((r) => inP(period)(r.date));
  const search = gads.filter((r) => r.channel === "search");
  const yt = gads.filter((r) => r.channel === "youtube");

  const days = daysBetween(period.start, period.end);
  const prevP: ReportPeriod = { start: shiftIso(period.start, -days), end: shiftIso(period.start, -1) };
  const prevRows = allRows.filter((r) => inP(prevP)(r.date));
  const prevGads = allGads.filter((r) => inP(prevP)(r.date));

  const meta = sum(rows);
  const metaD = derive(meta);
  const google = gaSum(search);
  const googleD = gaDerive(google);
  const youtube = gaSum(yt);
  const youtubeD = gaDerive(youtube);

  const pMeta = sum(prevRows);
  const pGoogle = gaSum(prevGads.filter((r) => r.channel === "search"));
  const pYt = gaSum(prevGads.filter((r) => r.channel === "youtube"));
  const prevTotal = pMeta.spend + pGoogle.spend + pYt.spend;
  const hasPrev = prevTotal > 0;

  const spend = { meta: meta.spend, google: google.spend, youtube: youtube.spend, total: meta.spend + google.spend + youtube.spend };
  const prevSpend = hasPrev ? { meta: pMeta.spend, google: pGoogle.spend, youtube: pYt.spend, total: prevTotal } : null;

  // Daily spend by platform.
  const byDay = new Map<string, { meta: number; google: number; youtube: number }>();
  for (let d = period.start; d <= period.end; d = shiftIso(d, 1)) byDay.set(d, { meta: 0, google: 0, youtube: 0 });
  for (const r of rows) { const e = byDay.get(r.date); if (e) e.meta += r.spend; }
  for (const r of gads) { const e = byDay.get(r.date); if (e) e[r.channel === "search" ? "google" : "youtube"] += r.spend; }
  const daily = [...byDay.entries()].map(([date, v]) => ({ date, ...v, total: v.meta + v.google + v.youtube }));

  const objectives = objectiveBreakdown(rows);
  const prevConv = hasPrev ? conversionStats(prevRows) : null;
  const conversions = conversionStats(rows).map((c) => {
    const p = prevConv?.find((x) => x.key === c.key);
    return { ...c, prevCount: p ? p.count : null, prevCost: p && p.count > 0 ? p.cost : null };
  });
  const creatives = adBreakdown(rows);

  const ageTotalImpr = rows.reduce((a, r) => a + r.impressions, 0);
  const ages = ageBreakdown(rows)
    .filter((g) => g.key !== "Unknown")
    .map((g) => ({
      age: g.key,
      impressions: g.totals.impressions,
      share: div(g.totals.impressions, ageTotalImpr) * 100,
      ctr: div(g.totals.linkClicks, g.totals.impressions) * 100,
      spend: g.totals.spend,
    }));

  const impressions = meta.impressions + google.impressions + youtube.impressions;
  const clicks = meta.linkClicks + google.clicks + youtube.clicks;

  // ---- efficiency (results vs investment) ----
  let efficiency: Efficiency | null = null;
  if (hasPrev) {
    const contactsNow = conversions.reduce((a, c) => a + c.count, 0);
    const contactsPrev = conversions.reduce((a, c) => a + (c.prevCount ?? 0), 0);
    const convSpend = (rs: Row[]) => objectiveBreakdown(rs).filter((o) => o.primary?.isConversion).reduce((a, o) => a + o.totals.spend, 0);
    const csNow = convSpend(rows), csPrev = convSpend(prevRows);
    const pc = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : 0);
    if (contactsPrev > 0 && contactsNow > 0) {
      const cpcNow = spend.total / contactsNow, cpcPrev = prevTotal / contactsPrev;
      const ccNow = csNow / contactsNow, ccPrev = csPrev / contactsPrev;
      efficiency = {
        spend: { now: spend.total, prev: prevTotal, change: pc(spend.total, prevTotal) },
        contacts: { now: contactsNow, prev: contactsPrev, change: pc(contactsNow, contactsPrev) },
        costPerContact: { now: cpcNow, prev: cpcPrev, change: pc(cpcNow, cpcPrev) },
        perThousand: { now: (contactsNow / spend.total) * 1000, prev: (contactsPrev / prevTotal) * 1000 },
        convShare: { now: div(csNow, spend.total) * 100, prev: div(csPrev, prevTotal) * 100 },
        convCostPerContact: { now: ccNow, prev: ccPrev, change: pc(ccNow, ccPrev) },
        actions: conversions
          .filter((c) => c.count > 0 || (c.prevCount ?? 0) > 0)
          .map((c) => ({ key: c.key, label: c.label, color: c.color, now: c.count, prev: c.prevCount ?? 0, change: c.prevCount ? pc(c.count, c.prevCount) : null })),
      };
    }
  }

  const model: ReportModel = {
    period, days, prev: hasPrev ? prevP : null,
    meta, metaD, google, googleD, youtube, youtubeD,
    spend, prevSpend, impressions, clicks, daily, objectives, conversions, creatives, ages,
    efficiency,
    analysis: { paragraphs: [], highlights: [], efficiency: null },
    empty: spend.total === 0 && impressions === 0,
  };
  model.analysis = writeAnalysis(model, { meta: pMeta, google: pGoogle, youtube: pYt });
  return model;
}

// ---- written analysis --------------------------------------------------------
function writeAnalysis(m: ReportModel, prev: { meta: Totals; google: GAdsTotals; youtube: GAdsTotals }) {
  const paragraphs: string[] = [];
  const highlights: string[] = [];
  if (m.empty) return { paragraphs: ["Não houve veiculação no período selecionado."], highlights, efficiency: null };

  const share = (v: number) => pct(div(v, m.spend.total) * 100, 0);
  const prevLabel = m.prev ? `os ${m.days} dias anteriores (${periodLabel(m.prev)})` : "";

  // 1. Investment
  const split = [
    m.spend.meta > 0 && `${share(m.spend.meta)} em Meta Ads`,
    m.spend.google > 0 && `${share(m.spend.google)} em Google Pesquisa`,
    m.spend.youtube > 0 && `${share(m.spend.youtube)} no YouTube`,
  ].filter(Boolean) as string[];
  let p1 = `Entre ${periodLabel(m.period)} (${m.days} ${m.days === 1 ? "dia" : "dias"}), foram investidos ${brl(m.spend.total)} em mídia`;
  p1 += split.length > 1 ? ` — ${split.slice(0, -1).join(", ")} e ${split[split.length - 1]}.` : ".";
  const cs = m.prevSpend ? change(m.spend.total, m.prevSpend.total) : null;
  if (cs) p1 += ` Em relação a ${prevLabel}, o investimento ficou ${cs.text === "estável" ? "estável" : `com ${cs.text}`}.`;
  p1 = p1.replace("Em relação a os ", "Em relação aos ");
  paragraphs.push(p1);

  // 2. Delivery (Meta carries most of the volume and the conversion tracking)
  if (m.meta.impressions > 0) {
    let p2 = `No Meta Ads, as campanhas somaram ${compact(m.meta.impressions)} impressões, alcançaram ${compact(m.meta.reach)} pessoas (frequência de ${m.metaD.frequency.toFixed(2).replace(".", ",")}) e geraram ${int(m.meta.linkClicks)} cliques no link, com CPM de ${brl(m.metaD.cpm)}, CTR de ${pct(m.metaD.ctrLink)} e CPC de ${brl(m.metaD.cpcLink)}.`;
    const pd = derive(prev.meta);
    if (m.prev && prev.meta.impressions > 0) {
      const cpm = change(m.metaD.cpm, pd.cpm), ctr = change(m.metaD.ctrLink, pd.ctrLink), cpc = change(m.metaD.cpcLink, pd.cpcLink);
      const parts = [cpm && `CPM ${cpm.text}`, ctr && `CTR ${ctr.text}`, cpc && `CPC ${cpc.text}`].filter(Boolean);
      if (parts.length) p2 += ` Na comparação com o período anterior: ${parts.join(", ")}.`;
      if (cpm && Math.abs(cpm.v) >= 10) highlights.push(`CPM do Meta ${arrow(cpm.v)} ${Math.abs(cpm.v).toFixed(0)}% (${brl(pd.cpm)} → ${brl(m.metaD.cpm)})`);
      if (ctr && Math.abs(ctr.v) >= 10) highlights.push(`CTR do Meta ${arrow(ctr.v)} ${Math.abs(ctr.v).toFixed(0)}% (${pct(pd.ctrLink)} → ${pct(m.metaD.ctrLink)})`);
    }
    paragraphs.push(p2);
  }

  // 3. Conversions — each action on its own, never summed
  const conv = m.conversions.filter((c) => c.count > 0);
  if (conv.length) {
    const list = conv.map((c) => `${int(c.count)} ${c.label} (${brl(c.cost)} cada)`);
    let p3 = `Em resultados, o período registrou ${list.length > 1 ? `${list.slice(0, -1).join(", ")} e ${list[list.length - 1]}` : list[0]}.`;
    const best = [...conv].sort((a, b) => a.cost - b.cost)[0];
    if (conv.length > 1) p3 += ` A ação de menor custo foi ${best.label}, a ${brl(best.cost)} por resultado.`;
    paragraphs.push(p3);
    for (const c of conv) {
      if (c.prevCount == null) continue;
      const ch = change(c.count, c.prevCount);
      if (ch && Math.abs(ch.v) >= 10) highlights.push(`${c.label}: ${int(c.prevCount)} → ${int(c.count)} (${arrow(ch.v)} ${Math.abs(ch.v).toFixed(0)}%)`);
      if (c.prevCost != null) {
        const cc = change(c.cost, c.prevCost);
        if (cc && Math.abs(cc.v) >= 10) highlights.push(`Custo por ${c.label} ${arrow(cc.v)} ${Math.abs(cc.v).toFixed(0)}% (${brl(c.prevCost)} → ${brl(c.cost)})`);
      }
    }
  } else if (m.meta.spend > 0) {
    paragraphs.push("Não houve conversões registradas no Meta Ads neste período.");
  }

  // 4. Campaigns
  const objs = m.objectives.filter((o) => o.totals.spend > 0);
  if (objs.length) {
    const top = objs[0];
    let p4 = `A campanha com maior investimento foi ${top.key}, com ${brl(top.totals.spend)} (${pct(div(top.totals.spend, m.meta.spend) * 100, 0)} do Meta)`;
    p4 += top.primary ? ` e ${int(top.primaryValue)} ${top.primary.label.toLowerCase().replace("whatsapp", "WhatsApp").replace("leads lp", "Leads LP")}.` : ".";
    const conversionObjs = objs.filter((o) => o.primary?.isConversion && o.primaryValue > 0);
    if (conversionObjs.length > 1) {
      const cheapest = [...conversionObjs].sort((a, b) => a.costPerResult - b.costPerResult)[0];
      const cost = `${brl(cheapest.costPerResult)} por ${cheapest.primary!.label}`;
      p4 += cheapest.key === top.key
        ? ` Ela também teve o menor custo por resultado entre as campanhas de conversão (${cost}).`
        : ` Entre as campanhas de conversão, ${cheapest.key} teve o menor custo por resultado (${cost}).`;
    }
    paragraphs.push(p4);
  }

  // 5. Creatives
  const cr = m.creatives.filter((c) => c.totals.spend > 0);
  if (cr.length) {
    const top = cr[0];
    let p5 = `O criativo com maior investimento foi “${shortAd(top.ad)}” (${top.format}), com CTR de ${pct(top.derived.ctrLink)}.`;
    const relevant = cr.filter((c) => c.totals.spend >= m.meta.spend * 0.05 && c.totals.impressions > 0);
    const bestCtr = [...relevant].sort((a, b) => b.derived.ctrLink - a.derived.ctrLink)[0];
    if (bestCtr && bestCtr.ad !== top.ad) p5 += ` Entre os criativos com investimento relevante, o melhor CTR foi de “${shortAd(bestCtr.ad)}” (${pct(bestCtr.derived.ctrLink)}).`;
    paragraphs.push(p5);
    if (bestCtr) highlights.push(`Melhor CTR entre criativos relevantes: “${shortAd(bestCtr.ad)}” (${pct(bestCtr.derived.ctrLink)})`);
  }

  // 6. Audience
  if (m.ages.length) {
    const byImpr = [...m.ages].sort((a, b) => b.impressions - a.impressions)[0];
    const byCtr = [...m.ages].filter((a) => a.share >= 5).sort((a, b) => b.ctr - a.ctr)[0];
    let p6 = `No público, a faixa de ${byImpr.age} anos concentrou ${pct(byImpr.share, 0)} das impressões do Meta`;
    p6 += byCtr && byCtr.age !== byImpr.age ? `, enquanto ${byCtr.age} teve o maior CTR (${pct(byCtr.ctr)}).` : ".";
    paragraphs.push(p6);
  }

  // 7. Google & YouTube
  const g: string[] = [];
  if (m.google.impressions > 0)
    g.push(`No Google Pesquisa, foram ${int(m.google.clicks)} cliques com CTR de ${pct(m.googleD.ctr)} e CPC de ${brl(m.googleD.cpc)}`);
  if (m.youtube.impressions > 0)
    g.push(`no YouTube, ${compact(m.youtube.views)} visualizações, com taxa de visualização de ${pct(m.youtubeD.vtr)} e custo por view de ${brl(m.youtubeD.cpv, 3)}`);
  if (g.length) {
    paragraphs.push(g.join("; ") + ".");
    if (m.prev && prev.google.clicks > 0) {
      const ch = change(m.google.clicks, prev.google.clicks);
      if (ch && Math.abs(ch.v) >= 10) highlights.push(`Cliques no Google ${arrow(ch.v)} ${Math.abs(ch.v).toFixed(0)}% (${int(prev.google.clicks)} → ${int(m.google.clicks)})`);
    }
  }

  if (cs && Math.abs(cs.v) >= 10) highlights.unshift(`Investimento total ${arrow(cs.v)} ${Math.abs(cs.v).toFixed(0)}% (${brl(m.prevSpend!.total)} → ${brl(m.spend.total)})`);
  if (!m.prev) highlights.push("Sem período anterior com veiculação para comparação.");
  return { paragraphs, highlights, efficiency: m.efficiency ? writeEfficiency(m.efficiency) : null };
}

// One tight paragraph: what happened, how much better/worse per real, and WHY
// (campaigns got cheaper vs. budget moved to them). Each clause is conditional
// on the numbers, so it reads right whether the period improved or not.
function writeEfficiency(e: Efficiency): string {
  const p = (v: number) => `${Math.abs(v).toFixed(0)}%`;
  const dir = (v: number) => (v >= 0 ? "alta" : "queda");
  const k = (v: number) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(1).replace(".", ",")} mil` : brl(v));
  const s: string[] = [];

  // 1. The headline relation between the two variables.
  const spendTxt = Math.abs(e.spend.change) < 1 ? "com investimento estável" : `com ${dir(e.spend.change)} de ${p(e.spend.change)} no investimento (${k(e.spend.prev)} → ${k(e.spend.now)})`;
  const contactsTxt = Math.abs(e.contacts.change) < 1
    ? `o volume de contatos (WhatsApp + leads) se manteve em ${int(e.contacts.now)}`
    : `o volume de contatos (WhatsApp + leads) teve ${dir(e.contacts.change)} de ${p(e.contacts.change)} (${int(e.contacts.prev)} → ${int(e.contacts.now)})`;
  let head = `${spendTxt[0].toUpperCase()}${spendTxt.slice(1)}, ${contactsTxt}`;
  if (e.spend.change > 1 && e.contacts.change > e.spend.change * 1.2) head += ` — os resultados cresceram ${(e.contacts.change / e.spend.change).toFixed(1).replace(".", ",")} vezes mais rápido que a verba`;
  else if (e.spend.change < -1 && e.contacts.change > 1) head += " — mais resultados com menos verba";
  s.push(head + ".");

  // 2. What that means per real invested.
  s.push(
    `Cada R$ 1.000 investidos passou a gerar ${e.perThousand.now.toFixed(0)} contatos, contra ${e.perThousand.prev.toFixed(0)} no período anterior, e o custo por contato foi de ${brl(e.costPerContact.prev)} para ${brl(e.costPerContact.now)} (${e.costPerContact.change <= 0 ? "−" : "+"}${p(e.costPerContact.change)}).`
  );

  // 3. Where the gain came from: mix shift vs. the campaigns themselves.
  const shareMoved = e.convShare.now - e.convShare.prev;
  const mix = Math.abs(shareMoved) >= 3
    ? `A fatia do investimento nas campanhas de conversão foi de ${pct(e.convShare.prev, 0)} para ${pct(e.convShare.now, 0)}`
    : `A fatia do investimento nas campanhas de conversão ficou estável (${pct(e.convShare.now, 0)})`;
  const moved = Math.abs(shareMoved) >= 3;
  const own = e.convCostPerContact.change <= -5
    ? `${moved ? "mas, mesmo olhando só o gasto delas," : "e, olhando só o gasto delas,"} o custo por contato caiu ${p(e.convCostPerContact.change)} (${brl(e.convCostPerContact.prev)} → ${brl(e.convCostPerContact.now)}) — o ganho vem da eficiência das próprias campanhas${moved ? ", não só da redistribuição de verba" : ""}`
    : e.convCostPerContact.change >= 5
    ? `e, olhando só o gasto delas, o custo por contato subiu ${p(e.convCostPerContact.change)} (${brl(e.convCostPerContact.prev)} → ${brl(e.convCostPerContact.now)}) — ${moved ? "o resultado geral se explica pela realocação de verba, não por campanhas mais baratas" : "as campanhas de conversão ficaram mais caras no período"}`
    : `e, olhando só o gasto delas, o custo por contato ficou praticamente igual (${brl(e.convCostPerContact.now)})${moved ? " — o movimento vem sobretudo da realocação de verba" : ""}`;
  s.push(`${mix}, ${own}.`);
  return s.join(" ");
}

// "AD 03 - Carozzo Wellness - Animação 15\"" → "AD 03 · Animação 15\""
export function shortAd(name: string) {
  const parts = name.split(" - ").map((s) => s.trim()).filter((s) => !/carozzo wellness/i.test(s));
  return parts.join(" · ") || name;
}

export const CONVERSION_ORDER = CONVERSION_METRICS.map((m) => m.key);
