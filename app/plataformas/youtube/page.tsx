import { ComingSoon, GhostBars } from "@/components/platform/ComingSoon";
import { MonitorPlay } from "lucide-react";

export default function YoutubePage() {
  return (
    <ComingSoon
      name="YouTube"
      color="#cf3a5f"
      icon={<MonitorPlay size={26} />}
      tagline="A experiência do empreendimento em vídeo"
      description="Anúncios in-stream e Shorts apresentando o conceito Wellness Premium, os rooftops e a vista frente-mar. Métricas de atenção e retenção de audiência para medir o impacto da marca."
      channels={["In-stream", "Shorts", "Bumper", "Video views"]}
      metrics={[
        { label: "Taxa de visualização", desc: "% que assiste após o skip" },
        { label: "Retenção por quartil", desc: "25% · 50% · 75% · 100%" },
        { label: "CPV", desc: "Custo por visualização qualificada" },
        { label: "Alcance incremental", desc: "Público novo além do Meta" },
      ]}
      preview={
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="mb-3 h-3 w-40 rounded bg-[var(--surface-2)]" />
            {/* Retention curve ghost */}
            <div className="relative h-40">
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full">
                <path d="M0,4 C20,6 30,14 50,20 S80,32 100,36 L100,40 L0,40 Z" fill="#cf3a5f33" />
                <path d="M0,4 C20,6 30,14 50,20 S80,32 100,36" fill="none" stroke="#cf3a5f88" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="mb-3 h-3 w-32 rounded bg-[var(--surface-2)]" />
            <GhostBars n={4} color="#cf3a5f" />
          </div>
        </div>
      }
    />
  );
}
