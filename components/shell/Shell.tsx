"use client";

import { useState } from "react";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { DataProvider } from "@/components/providers/DataProvider";

export function Shell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <DataProvider>
      <div className="min-h-screen page-grain">
        <Sidebar />
        <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="lg:pl-[264px]">
          <Topbar onMenu={() => setMenuOpen(true)} />
          <main className="mx-auto max-w-[1360px] px-4 py-5 sm:px-6 lg:px-7 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </DataProvider>
  );
}
