"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./nav";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";

function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-3 px-1">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#5a7020] to-[#324420] shadow-inner ring-1 ring-white/10">
        <span className="font-display text-lg font-semibold text-[#f3f1e7]">C</span>
      </div>
      <div className="leading-tight">
        <div className="font-display text-[15px] font-semibold tracking-tight text-[#f3f1e7]">
          Carozzo Wellness
        </div>
        <div className="text-[10.5px] uppercase tracking-[0.16em] text-[#c9a463]">
          Media Dashboard
        </div>
      </div>
    </Link>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-5 pb-4">
        <BrandMark />
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 pb-4">
        {NAV.map((section) => (
          <div key={section.title} className="mb-5">
            <div className="px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/35">
              {section.title}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors",
                        active
                          ? "bg-white/10 text-white"
                          : "text-white/70 hover:bg-white/[0.06] hover:text-white"
                      )}
                    >
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full"
                          style={{ width: 3, background: item.color }}
                        />
                      )}
                      <Icon
                        size={18}
                        strokeWidth={2}
                        style={{ color: active ? item.color : undefined }}
                        className={active ? "" : "text-white/55 group-hover:text-white/80"}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.status === "soon" && (
                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide text-white/45">
                          em breve
                        </span>
                      )}
                      {item.status === "live" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#7ed957] shadow-[0_0_6px_#7ed957]" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/10 px-5 py-4">
        <p className="text-[11px] leading-relaxed text-white/45">
          Frente-mar de Salvador
          <br />
          <span className="text-[#c9a463]">Wellness Premium · Jardim Armação</span>
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[264px] flex-col bg-gradient-to-b from-[#26331a] via-[#1f2a15] to-[#161f0d] border-r border-black/20">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div className={cn("lg:hidden fixed inset-0 z-50", open ? "" : "pointer-events-none")}>
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-[280px] max-w-[82%] bg-gradient-to-b from-[#26331a] via-[#1f2a15] to-[#161f0d] shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={onClose}
          aria-label="Fechar menu"
          className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X size={20} />
        </button>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}
