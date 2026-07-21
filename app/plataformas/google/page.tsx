import { ComingSoon, GhostBars, GhostDonut } from "@/components/platform/ComingSoon";
import { Search } from "lucide-react";

export default function GooglePage() {
  return (
    <ComingSoon
      name="Google Rede de Pesquisa"
      color="#e0a010"
      icon={<Search size={26} />}
      tagline="Intenção de compra no momento certo"
      description="Captura de demanda ativa por termos como 'apartamento frente-mar Salvador' e 'investimento imobiliário Armação'. Foco em palavras-chave de alta intenção e extensões de anúncio."
      channels={["Search", "Palavras-chave", "Extensões", "Lances inteligentes"]}
      metrics={[
        { label: "Termos de pesquisa", desc: "Quais buscas trazem os melhores leads" },
        { label: "Índice de qualidade", desc: "Relevância de anúncio e página" },
        { label: "Parcela de impressões", desc: "Presença frente à concorrência" },
        { label: "CPA e CPL", desc: "Custo por lead qualificado" },
      ]}
      preview={
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-3 h-3 w-48 rounded bg-[var(--surface-2)]" />
            <GhostBars n={8} color="#e0a010" horizontal />
          </div>
          <div>
            <div className="mb-3 h-3 w-32 rounded bg-[var(--surface-2)]" />
            <GhostDonut color="#e0a010" />
          </div>
        </div>
      }
    />
  );
}
