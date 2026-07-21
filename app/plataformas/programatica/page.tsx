import { ComingSoon, GhostBars, GhostDonut } from "@/components/platform/ComingSoon";
import { RadioTower } from "lucide-react";

export default function ProgramaticaPage() {
  return (
    <ComingSoon
      name="Mídia Programática"
      color="#8a63d4"
      icon={<RadioTower size={26} />}
      tagline="Escala e recompra de audiência em display e vídeo"
      description="Display, native e vídeo out-stream via DSP, com segmentação por geolocalização (Salvador e região metropolitana) e retargeting de quem visitou a landing page do empreendimento."
      channels={["Display", "Native", "Vídeo out-stream", "Retargeting", "Geo"]}
      metrics={[
        { label: "Inventário & domínios", desc: "Onde a marca é exibida" },
        { label: "Viewability", desc: "% de impressões efetivamente vistas" },
        { label: "Cobertura geográfica", desc: "Bairros e regiões de maior resposta" },
        { label: "vCPM", desc: "Custo por mil impressões visíveis" },
      ]}
      preview={
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div>
            <div className="mb-3 h-3 w-28 rounded bg-[var(--surface-2)]" />
            <GhostDonut color="#8a63d4" />
          </div>
          <div className="lg:col-span-2">
            <div className="mb-3 h-3 w-44 rounded bg-[var(--surface-2)]" />
            {/* Geo grid ghost (heatmap-like) */}
            <div className="grid grid-cols-8 gap-1.5">
              {Array.from({ length: 32 }).map((_, i) => {
                const op = [0.15, 0.3, 0.5, 0.7, 0.9][i % 5];
                return <div key={i} className="aspect-square rounded" style={{ background: `rgba(138,99,212,${op})` }} />;
              })}
            </div>
            <div className="mt-4">
              <GhostBars n={6} color="#8a63d4" horizontal />
            </div>
          </div>
        </div>
      }
    />
  );
}
