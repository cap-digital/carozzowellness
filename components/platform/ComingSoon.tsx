import React from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Clock, PlugZap, CheckCircle2, Circle } from "lucide-react";

interface Metric {
  label: string;
  desc: string;
}

// Shared "em breve" scaffold. Each platform passes distinct copy, metrics and a
// bespoke preview node so no two coming-soon pages look alike.
export function ComingSoon({
  name,
  color,
  icon,
  tagline,
  description,
  metrics,
  preview,
  channels,
}: {
  name: string;
  color: string;
  icon: React.ReactNode;
  tagline: string;
  description: string;
  metrics: Metric[];
  preview: React.ReactNode;
  channels: string[];
}) {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="relative overflow-hidden">
        <div className="h-1 w-full" style={{ background: color }} />
        <div
          className="absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-[0.12] blur-2xl"
          style={{ background: color }}
        />
        <div className="relative flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white"
              style={{ background: color }}
            >
              {icon}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl text-[var(--text-primary)]">{name}</h2>
                <Badge color={color}>
                  <Clock size={12} /> Em breve
                </Badge>
              </div>
              <p className="mt-1 text-[14px] font-medium" style={{ color }}>
                {tagline}
              </p>
              <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
                {description}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {channels.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11.5px] text-[var(--text-secondary)]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Integration steps */}
          <div className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Status da integração
            </div>
            <ol className="space-y-2 text-[12.5px]">
              <li className="flex items-center gap-2 text-[var(--text-secondary)]">
                <CheckCircle2 size={15} className="text-[#0ca30c]" /> Fonte de dados mapeada
              </li>
              <li className="flex items-center gap-2 font-medium" style={{ color }}>
                <PlugZap size={15} /> Sincronização em configuração
              </li>
              <li className="flex items-center gap-2 text-[var(--text-muted)]">
                <Circle size={15} /> Dados ativos no painel
              </li>
            </ol>
          </div>
        </div>
      </Card>

      {/* What we'll track */}
      <div>
        <div className="mb-3 flex items-baseline gap-3">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            O que vamos acompanhar
          </h3>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <Card key={m.label} className="p-4">
              <div className="text-[13.5px] font-semibold text-[var(--text-primary)]">{m.label}</div>
              <div className="mt-1 text-[12px] leading-snug text-[var(--text-secondary)]">{m.desc}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Bespoke preview */}
      <div>
        <div className="mb-3 flex items-baseline gap-3">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            Prévia do painel
          </h3>
          <span className="text-[12px] text-[var(--text-muted)]">layout ilustrativo · aguardando dados</span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <Card className="relative overflow-hidden p-5">
          <div className="pointer-events-none select-none opacity-[0.55] grayscale-[0.3]">{preview}</div>
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-[var(--surface-1)] via-[var(--surface-1)]/40 to-transparent">
            <div className="translate-y-6 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2 text-[12.5px] font-medium text-[var(--text-secondary)] shadow-card">
              Assim que a conta for conectada, os dados aparecem aqui
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---- lightweight placeholder viz used inside previews (no fake numbers) -----
export function GhostBars({ n = 7, color, horizontal }: { n?: number; color: string; horizontal?: boolean }) {
  const heights = [55, 80, 40, 95, 65, 48, 72, 60, 35, 88];
  if (horizontal) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: n }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2.5 w-14 rounded bg-[var(--surface-2)]" />
            <div className="h-3.5 rounded" style={{ width: `${heights[i % heights.length]}%`, background: `${color}66` }} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex h-40 items-end gap-2">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex-1 rounded-t" style={{ height: `${heights[i % heights.length]}%`, background: `${color}66` }} />
      ))}
    </div>
  );
}

export function GhostDonut({ color }: { color: string }) {
  return (
    <div className="relative mx-auto h-40 w-40">
      <div
        className="h-full w-full rounded-full"
        style={{ background: `conic-gradient(${color}aa 0 40%, ${color}66 40% 68%, ${color}33 68% 100%)` }}
      />
      <div className="absolute inset-[22%] rounded-full bg-[var(--surface-1)]" />
    </div>
  );
}
