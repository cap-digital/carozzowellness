// Raw row shape returned by the Supabase CarozzoWellness function (meta[]).
export interface MetaRow {
  date: string;
  campaign: string;
  adset_name: string;
  ad_name: string;
  age: string;
  gender: string;
  thumbnail_url: string;
  instagram_permalink_url: string;
  spend: number | string;
  clicks: number | string;
  actions_link_click: number | string;
  impressions: number | string;
  reach: number | string;
  actions_post_engagement: number | string;
  video_thruplay_watched_actions_video_view: number | string;
  actions_video_view: number | string;
  video_p25_watched_actions_video_view: number | string;
  video_p50_watched_actions_video_view: number | string;
  video_p75_watched_actions_video_view: number | string;
  video_p100_watched_actions_video_view: number | string;
  conversions_offsite_conversion_fb_pixel_custom_clique_botao_whatsapp: number | string;
  actions_onsite_conversion_messaging_conversation_started_7d: number | string;
  actions_offsite_conversion_fb_pixel_lead: number | string;
  actions_onsite_conversion_lead_grouped: number | string;
  actions_lead: number | string;
}

export interface ApiResponse {
  success: boolean;
  meta: MetaRow[];
  google: unknown[];
  youtube: unknown[];
  programatica: unknown[];
  timestamp: string;
}

// Normalized numeric row used everywhere downstream.
export interface Row {
  date: string; // yyyy-mm-dd
  campaign: string; // raw
  objective: string; // parsed: ALCANCE | VIDEOVIEW | ...
  adset: string;
  placement: string; // parsed from adset (Feed / Vertical / Auto...)
  ad: string;
  format: string; // Estático / Carrossel / Animação 15" ...
  thumb: string;
  permalink: string;
  age: string;
  gender: string;
  spend: number;
  clicks: number;
  linkClicks: number;
  impressions: number;
  reach: number;
  engagement: number;
  videoViews: number;
  thruplays: number;
  p25: number;
  p50: number;
  p75: number;
  p100: number;
  whatsapp: number;
  conversations: number;
  leads: number;
}

export interface Totals {
  spend: number;
  clicks: number;
  linkClicks: number;
  impressions: number;
  reach: number;
  engagement: number;
  videoViews: number;
  thruplays: number;
  p25: number;
  p50: number;
  p75: number;
  p100: number;
  whatsapp: number;
  conversations: number;
  leads: number;
  rows: number;
}
