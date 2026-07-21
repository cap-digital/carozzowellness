import React from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  color = "#8a63d4",
  children,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  color?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] px-6 py-12 text-center",
        className
      )}
    >
      {icon && (
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: `${color}16`, color }}
        >
          {icon}
        </div>
      )}
      <h3 className="font-display text-xl text-[var(--text-primary)]">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
          {description}
        </p>
      )}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
