"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Eye, FileDown, Info, Loader2 } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { Loadable } from "@/components/ui/Loadable";
import { Card } from "@/components/ui/Card";
import { ReportDocument, REPORT_PAGES } from "@/components/report/ReportDocument";
import { buildReport, periodLabel, type ReportPeriod } from "@/lib/report";
import { shiftIso, todayIso, isValidDate } from "@/lib/format";
import { cn } from "@/lib/cn";

type Preset = "7d" | "30d" | "thisMonth" | "lastMonth" | "all" | "custom";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "7d", label: "Últimos 7 dias" },
  { key: "30d", label: "Últimos 30 dias" },
  { key: "thisMonth", label: "Mês atual" },
  { key: "lastMonth", label: "Mês anterior" },
  { key: "all", label: "Todo o período" },
  { key: "custom", label: "Personalizado" },
];

const DRAFT_KEY = "carozzo-report-draft";
const A4_W = 794;

export default function ReportPage() {
  return (
    <Loadable>
      <Report />
    </Loadable>
  );
}

function Report() {
  const { allRows, allGadsRows, googleLoading } = useData();

  // Data bounds. Presets end YESTERDAY like the rest of the dashboard: today is
  // still running, its numbers are partial.
  const yesterday = shiftIso(todayIso(), -1);
  const firstDate = useMemo(() => {
    const ds = [...allRows.map((r) => r.date), ...allGadsRows.map((r) => r.date)].filter(isValidDate).sort();
    return ds[0] ?? yesterday;
  }, [allRows, allGadsRows, yesterday]);

  const [preset, setPreset] = useState<Preset>("30d");
  const [custom, setCustom] = useState<ReportPeriod>({ start: shiftIso(yesterday, -6), end: yesterday });
  const [text, setText] = useState("");
  const [shown, setShown] = useState(false);
  const [printing, setPrinting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(1);
  const go = (d: number) => setPage((p) => Math.min(REPORT_PAGES, Math.max(1, p + d)));

  // ← → flip pages while the preview is open (not while typing the analysis).
  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "TEXTAREA" || t.tagName === "INPUT") return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown]);

  // Unsent analysis survives a reload (per-browser convenience only).
  useEffect(() => {
    try {
      const d = localStorage.getItem(DRAFT_KEY);
      if (d) setText(d);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, text);
    } catch {}
  }, [text]);

  const period: ReportPeriod = useMemo(() => {
    const clamp = (p: ReportPeriod) => ({ start: p.start < firstDate ? firstDate : p.start, end: p.end });
    const [y, mo] = yesterday.split("-").map(Number);
    const monthStart = `${y}-${String(mo).padStart(2, "0")}-01`;
    switch (preset) {
      case "7d": return clamp({ start: shiftIso(yesterday, -6), end: yesterday });
      case "30d": return clamp({ start: shiftIso(yesterday, -29), end: yesterday });
      case "thisMonth": return clamp({ start: monthStart, end: yesterday });
      case "lastMonth": {
        const lastEnd = shiftIso(monthStart, -1);
        return clamp({ start: `${lastEnd.slice(0, 7)}-01`, end: lastEnd });
      }
      case "all": return { start: firstDate, end: yesterday };
      default: {
        const [a, b] = custom.start <= custom.end ? [custom.start, custom.end] : [custom.end, custom.start];
        return { start: a, end: b };
      }
    }
  }, [preset, custom, yesterday, firstDate]);

  const deferredText = useDeferredValue(text);
  const model = useMemo(() => buildReport(allRows, allGadsRows, period), [allRows, allGadsRows, period]);

  // Fit the A4 preview into whatever width the column has.
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setZoom(Math.min(1, (e.contentRect.width - 2) / A4_W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [shown]);

  const visualize = () => {
    setShown(true);
    setPage(1);
    requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const generatePdf = async () => {
    setShown(true);
    setPrinting(true);
    // Let the print copy mount, then wait for creative thumbnails so none prints blank.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const imgs = [...document.querySelectorAll<HTMLImageElement>("#report-print img")];
    await Promise.race([
      Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })))),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
    // The document title becomes the suggested file name in "Salvar como PDF".
    const prevTitle = document.title;
    document.title = `Report Carozzo Wellness - ${periodLabel(period).replace(/\//g, "-")}`;
    const done = () => {
      document.title = prevTitle;
      setPrinting(false);
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    window.print();
  };

  const invalidCustom = preset === "custom" && (!isValidDate(custom.start) || !isValidDate(custom.end));

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      {/* Form */}
      <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <Card className="p-5">
          <Step n={1} title="Período" />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                  preset === p.key
                    ? "border-[#324420] bg-[#324420] text-[#f3f1e7]"
                    : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["start", "end"] as const).map((k) => (
                <label key={k} className="text-[11px] text-[var(--text-muted)]">
                  {k === "start" ? "De" : "Até"}
                  <input
                    type="date"
                    value={custom[k]}
                    min={firstDate}
                    max={todayIso()}
                    onChange={(e) => setCustom((c) => ({ ...c, [k]: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[12.5px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
                  />
                </label>
              ))}
            </div>
          )}
          <div className="mt-3 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-[12px] text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">{periodLabel(period)}</span> · {model.days} {model.days === 1 ? "dia" : "dias"}
            {model.prev && <span className="block text-[11px] text-[var(--text-muted)]">comparado com {periodLabel(model.prev)}</span>}
          </div>
        </Card>

        <Card className="p-5">
          <Step n={2} title="Análise qualitativa" optional />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={9}
            placeholder="Contexto, aprendizados, próximos passos… Separe parágrafos com uma linha em branco."
            className="mt-3 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]"
          />
          <p className="mt-2 flex gap-1.5 text-[11.5px] leading-snug text-[var(--text-muted)]">
            <Info size={13} className="mt-[1px] shrink-0" />
            {text.trim()
              ? "Sua análise abre a seção de análise, seguida dos destaques e da leitura dos dados do período."
              : "Em branco, o report traz uma análise escrita a partir dos números do período."}
          </p>
        </Card>

        <Card className="p-5">
          <Step n={3} title="Gerar" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={visualize}
              disabled={invalidCustom}
              className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5 text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50"
            >
              <Eye size={15} /> Visualizar
            </button>
            <button
              onClick={generatePdf}
              disabled={invalidCustom || printing}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#324420] px-3 py-2.5 text-[13px] font-semibold text-[#f3f1e7] transition-colors hover:bg-[#465907] disabled:opacity-60"
            >
              {printing ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />} Gerar PDF
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-[var(--text-muted)]">
            Na janela de impressão, escolha <span className="font-medium text-[var(--text-secondary)]">Salvar como PDF</span>. O arquivo já vem nomeado com o período.
          </p>
          {googleLoading && <p className="mt-2 text-[11px] text-[#b08a3e]">Carregando Google e YouTube… aguarde para incluí-los.</p>}
        </Card>
      </div>

      {/* Preview */}
      <div ref={previewRef} className="min-w-0 scroll-mt-24">
        {shown ? (
          <div>
            <div className="mb-3 flex items-center justify-center gap-3">
              <PageButton onClick={() => go(-1)} disabled={page === 1} label="Página anterior"><ChevronLeft size={18} /></PageButton>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: REPORT_PAGES }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    aria-label={`Página ${n}`}
                    className={cn("h-2 rounded-full transition-all", n === page ? "w-6 bg-[#324420]" : "w-2 bg-[var(--axis)] hover:bg-[var(--text-muted)]")}
                  />
                ))}
              </div>
              <span className="min-w-[92px] text-center text-[12.5px] font-medium tnum text-[var(--text-secondary)]">
                Página {page} de {REPORT_PAGES}
              </span>
              <PageButton onClick={() => go(1)} disabled={page === REPORT_PAGES} label="Próxima página"><ChevronRight size={18} /></PageButton>
            </div>
            <div style={{ zoom }}>
              <ReportDocument model={model} analysis={deferredText} page={page} />
            </div>
          </div>
        ) : (
          <div className="flex h-[520px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] text-center">
            <div className="font-display text-lg text-[var(--text-primary)]">Pré-visualização do report</div>
            <p className="mt-1 max-w-sm text-[13px] text-[var(--text-secondary)]">
              Escolha o período, escreva a análise se quiser e clique em <span className="font-medium">Visualizar</span>.
            </p>
          </div>
        )}
      </div>

      {/* Print copy: lives on <body>, outside the app shell, at true A4 size. */}
      {shown && typeof document !== "undefined" &&
        createPortal(
          <div id="report-print">
            <ReportDocument model={model} analysis={text} />
          </div>,
          document.body
        )}
    </div>
  );
}

function PageButton({ children, onClick, disabled, label }: { children: React.ReactNode; onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] shadow-sm transition-colors hover:bg-[var(--surface-2)] disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function Step({ n, title, optional }: { n: number; title: string; optional?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#324420] text-[11px] font-semibold text-[#f3f1e7]">{n}</span>
      <span className="font-display text-[16px] font-semibold text-[var(--text-primary)]">{title}</span>
      {optional && <span className="text-[11px] text-[var(--text-muted)]">opcional</span>}
    </div>
  );
}
