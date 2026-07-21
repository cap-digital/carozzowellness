# Carozzo Wellness · Media Dashboard

Painel de performance de mídia digital do empreendimento **Carozzo Wellness** —
o primeiro frente-mar de Salvador com conceito Wellness Premium (Jardim Armação).

Construído em **Next.js 14 (App Router)** + **Tailwind** + **Recharts**, com
identidade visual extraída do site oficial (verde-oliva, creme, vinho, dourado;
tipografia Fraunces + IBM Plex Sans).

## Rodar

```bash
npm install
npm run dev      # http://localhost:3000
```

Build de produção:

```bash
npm run build && npm run start
```

Todas as rotas são reais (App Router), então F5 em qualquer página funciona sem 404.

## Estrutura

- `app/` — rotas (uma pasta por página)
  - `/` Visão geral · `/plataformas/{meta,google,youtube,programatica}` ·
    `/criativos` · `/publico` · `/campanhas` · `/custos`
  - `app/api/meta/route.ts` — proxy server-side da função Supabase (esconde a key,
    cacheia a resposta). Único ponto que fala com a fonte de dados.
- `lib/` — `metrics.ts` (parsing + cálculo de custos e taxas), `aggregate.ts`
  (agregações por objetivo/formato/placement/dia/demografia), `theme.ts`
  (paleta de gráficos validada), `format.ts` (formatação pt-BR).
- `components/` — `shell/` (sidebar, topbar, layout responsivo), `ui/` (cards,
  KPI, tabela, filtros), `charts/` (funil, heatmap, pirâmide, donut, tooltip).

## Fonte de dados

Função Supabase `CarozzoWellness` (POST). Retorna `meta[]` (1.272 linhas,
Facebook/Instagram) e arrays vazios para `google`, `youtube`, `programatica` —
essas plataformas ainda não têm dados e aparecem como "Em breve".

## Custos e taxas

A página **Custos & Taxas** calcula o investimento total a partir da mídia,
aplicando **taxa de gestão** e **impostos** configuráveis (padrão: gestão 15%,
impostos 0% — ajuste conforme o contrato real). Os cartões e tabelas mostram os
custos por resultado tanto em "só mídia" quanto no valor "efetivo" com taxas.

Métricas derivadas ("taxas") calculadas: CPM, CPC, CTR, frequência, taxa de
engajamento, CPL, custo por conversa, custo por clique de WhatsApp, CPV, VTR,
hook rate, retenção de vídeo e taxa de conversão.
