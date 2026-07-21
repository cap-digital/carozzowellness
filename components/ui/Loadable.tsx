"use client";

import React from "react";
import { useData } from "@/components/providers/DataProvider";
import { PageSkeleton } from "./Skeleton";
import { AlertTriangle } from "lucide-react";

export function Loadable({ children }: { children: React.ReactNode }) {
  const { loading, error, allRows } = useData();

  if (loading && allRows.length === 0) return <PageSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] px-6 py-16 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d03b3b]/12 text-[#d03b3b]">
          <AlertTriangle size={22} />
        </div>
        <h3 className="font-display text-lg text-[var(--text-primary)]">
          Não foi possível carregar os dados
        </h3>
        <p className="mt-1.5 max-w-sm text-[13px] text-[var(--text-secondary)]">{error}</p>
      </div>
    );
  }

  return <>{children}</>;
}

// Small page-level animated section wrapper for staggered entrance ("movimento").
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div className={className} style={{ animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both", animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
