import React from "react";
import { cn } from "@/lib/cn";

export function Badge({
  children,
  color,
  className,
  dot,
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium",
        className
      )}
      style={
        color
          ? { background: `${color}18`, color: color }
          : { background: "var(--surface-2)", color: "var(--text-secondary)" }
      }
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: color || "currentColor" }}
        />
      )}
      {children}
    </span>
  );
}

// Small colored key/swatch used beside labels so identity is never color-alone text.
export function Swatch({ color, shape = "dot" }: { color: string; shape?: "dot" | "line" }) {
  if (shape === "line")
    return (
      <span
        className="inline-block h-[3px] w-3.5 rounded-full align-middle"
        style={{ background: color }}
      />
    );
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-[3px] align-middle"
      style={{ background: color }}
    />
  );
}
