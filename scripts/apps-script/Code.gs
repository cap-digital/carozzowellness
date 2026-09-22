/**
 * Carozzo Wellness — fonte de dados do dashboard (Google Apps Script).
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * O doGet antigo refazia tudo a cada chamada: lia ~430 mil células, montava
 * 17 mil objetos e devolvia ~26 MB de JSON. Isso levava de 30s a 150s — e o
 * Supabase (que só repassa esta resposta) corta em ~150s.
 *
 * COMO FUNCIONA AGORA
 *  - atualizarCache() roda num gatilho de tempo (a cada 15 min), monta os dados
 *    já no formato COMPACTO (~1 MB) e guarda no CacheService.
 *  - doGet() só devolve o que está guardado → responde em ~1s.
 *  - Se o cache estiver vazio (ex.: primeira vez), doGet monta na hora e guarda.
 *
 * FORMATO
 *  Padrão: compacto (format "compact-v1") — o que o dashboard consome.
 *  ?format=full devolve o JSON antigo (linhas completas), para qualquer outro
 *  consumidor que ainda dependa dele.
 *
 * INSTALAÇÃO (uma vez): cole este arquivo, salve e rode instalarGatilho().
 */

const CACHE_PREFIX = "carozzo:compact:v1:";
const CACHE_TTL_S = 6 * 60 * 60; // máximo do CacheService (6h); o gatilho renova bem antes
const CHUNK = 90 * 1000; // CacheService aceita até 100 KB por chave
const INTERVALO_MIN = 15;

// Ordem das colunas numéricas no formato compacto. Precisa bater com
// METRIC_FIELDS em lib/compact.ts no dashboard.
const METRIC_FIELDS = [
  "spend",
  "clicks",
  "actions_link_click",
  "impressions",
  "reach",
  "actions_post_engagement",
  "actions_video_view",
  "video_thruplay_watched_actions_video_view",
  "video_p25_watched_actions_video_view",
  "video_p50_watched_actions_video_view",
  "video_p75_watched_actions_video_view",
  "video_p100_watched_actions_video_view",
  "conversions_offsite_conversion_fb_pixel_custom_clique_botao_whatsapp",
  "actions_onsite_conversion_messaging_conversation_started_7d",
  "actions_onsite_conversion_lead_grouped",
  "actions_offsite_conversion_fb_pixel_lead",
  "actions_lead",
];

// ---- entrada HTTP ------------------------------------------------------------
function doGet(e) {
  if (e && e.parameter && e.parameter.format === "full") return json_(montarCompleto_());

  let body = lerCache_();
  if (!body) {
    body = JSON.stringify(montarCompacto_());
    gravarCache_(body);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

// ---- gatilho -----------------------------------------------------------------
function atualizarCache() {
  gravarCache_(JSON.stringify(montarCompacto_()));
}

// Rode UMA vez pelo editor (Executar → instalarGatilho). Remove gatilhos
// antigos desta função antes de criar, então pode rodar de novo sem duplicar.
function instalarGatilho() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === "atualizarCache"; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("atualizarCache").timeBased().everyMinutes(INTERVALO_MIN).create();
  atualizarCache(); // já deixa o cache pronto
}

// ---- montagem ----------------------------------------------------------------
function montarCompacto_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone();
  const tabela = lerAba_(ss, "Meta");
  const prog = lerAba_(ss, "Programática");

  const col = {};
  tabela.headers.forEach(function (h, i) { col[String(h).trim()] = i; });
  const pega = function (row, nome) { return col[nome] === undefined ? "" : row[col[nome]]; };

  const dict = { dates: [], campaigns: [], adsets: [], ads: [], ages: [], genders: [] };
  const idx = {};
  const intern = function (bucket, tag, v) {
    const k = tag + "\u0000" + v;
    if (idx[k] === undefined) { idx[k] = dict[bucket].length; dict[bucket].push(v); }
    return idx[k];
  };
  // Um thumb/permalink por anúncio: o CDN do Facebook reassina a URL a cada
  // linha (eram 11 MB só disso), a imagem é a mesma.
  const adIdx = {};
  const internAd = function (nome) {
    if (adIdx[nome] === undefined) { adIdx[nome] = dict.ads.length; dict.ads.push({ n: nome, t: "", p: "" }); }
    return adIdx[nome];
  };

  const rows = [];
  tabela.rows.forEach(function (r) {
    const ad = String(pega(r, "ad_name") || "");
    const ai = internAd(ad);
    const creative = dict.ads[ai];
    if (!creative.t && pega(r, "thumbnail_url")) creative.t = String(pega(r, "thumbnail_url"));
    if (!creative.p && pega(r, "instagram_permalink_url")) creative.p = String(pega(r, "instagram_permalink_url"));

    const out = [
      intern("dates", "d", dataIso_(pega(r, "date"), tz)),
      intern("campaigns", "c", String(pega(r, "campaign") || "")),
      intern("adsets", "s", String(pega(r, "adset_name") || "")),
      ai,
      intern("ages", "g", String(pega(r, "age") || "Unknown")),
      intern("genders", "n", String(pega(r, "gender") || "unknown")),
    ];
    METRIC_FIELDS.forEach(function (f) {
      const n = numero_(pega(r, f));
      out.push(n === 0 ? 0 : Math.round(n * 1e4) / 1e4);
    });
    rows.push(out);
  });

  return {
    success: true,
    format: "compact-v1",
    dict: dict,
    rows: rows,
    programatica: objetos_(prog), // ainda vazia; vai crua (é pequena)
    timestamp: new Date().toISOString(),
  };
}

// Formato antigo, só para ?format=full.
function montarCompleto_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    success: true,
    meta: objetos_(lerAba_(ss, "Meta")),
    programatica: objetos_(lerAba_(ss, "Programática")),
    timestamp: new Date().toISOString(),
  };
}

// ---- utilitários -------------------------------------------------------------
function lerAba_(ss, nome) {
  const sheet = ss.getSheetByName(nome);
  if (!sheet) return { headers: [], rows: [] };
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return { headers: [], rows: [] };
  return {
    headers: data[0],
    rows: data.slice(1).filter(function (row) {
      return row.some(function (c) { return c !== "" && c !== null; });
    }),
  };
}

function objetos_(tabela) {
  return tabela.rows.map(function (row) {
    const o = {};
    tabela.headers.forEach(function (h, i) { o[h] = row[i]; });
    return o;
  });
}

// Aceita data como Date (célula de data), "2026-07-11", "2026-07-11T03:00:00Z"
// ou "11/07/2026" — a planilha já teve os dois formatos.
function dataIso_(v, tz) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, tz, "yyyy-MM-dd");
  const s = String(v == null ? "" : v).trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const br = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (br) return br[3] + "-" + ("0" + br[2]).slice(-2) + "-" + ("0" + br[1]).slice(-2);
  const t = Date.parse(s);
  return isNaN(t) ? "" : Utilities.formatDate(new Date(t), tz, "yyyy-MM-dd");
}

function numero_(v) {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// O CacheService limita 100 KB por chave: fatia o JSON e guarda as partes
// junto com a contagem, tudo num putAll só.
function gravarCache_(body) {
  const cache = CacheService.getScriptCache();
  const partes = {};
  let n = 0;
  for (let i = 0; i < body.length; i += CHUNK) partes[CACHE_PREFIX + n++] = body.slice(i, i + CHUNK);
  partes[CACHE_PREFIX + "n"] = String(n);
  cache.putAll(partes, CACHE_TTL_S);
}

function lerCache_() {
  const cache = CacheService.getScriptCache();
  const n = parseInt(cache.get(CACHE_PREFIX + "n") || "0", 10);
  if (!n) return null;
  const chaves = [];
  for (let i = 0; i < n; i++) chaves.push(CACHE_PREFIX + i);
  const partes = cache.getAll(chaves);
  let body = "";
  for (let i = 0; i < n; i++) {
    const p = partes[CACHE_PREFIX + i];
    if (p === undefined || p === null) return null; // alguma parte expirou → remonta
    body += p;
  }
  return body;
}
