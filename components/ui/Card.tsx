import React from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  style,
}: {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-card",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  right,
  children,
  className,
  bodyClassName,
  accent,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  accent?: string;
}) {
  return (
    <Card className={cn("overflow-hidden flex flex-col", className)}>
      {accent && <div className="h-1 w-full" style={{ background: accent }} />}
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
        <div className="min-w-0">
          <h3 className="font-display text-[17px] leading-tight text-[var(--text-primary)] tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-[12.5px] text-[var(--text-secondary)]">{subtitle}</p>
          )}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      <div className={cn("px-4 pb-4 pt-1 flex-1 min-h-0", bodyClassName)}>{children}</div>
    </Card>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline gap-3 mb-3 mt-1">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
        {children}
      </h2>
      {hint && <span className="text-[12px] text-[var(--text-muted)]">{hint}</span>}
      <div className="flex-1 h-px bg-[var(--border)]" />
    </div>
  );
}
