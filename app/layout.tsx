import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/shell/Shell";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Carozzo Wellness · Media Dashboard",
  description:
    "Painel de performance de mídia digital do empreendimento Carozzo Wellness — Frente-mar de Salvador.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${fraunces.variable} antialiased`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
