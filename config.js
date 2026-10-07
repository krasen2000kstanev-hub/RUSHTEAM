// Настройки на сайта. Тези стойности са публични – тайните стоят само в Cloudflare.
window.TEAM_HUB_CONFIG = {
  // Адресът на Cloudflare Worker-а (без наклонена черта накрая).
  apiBase: "https://team-hub-api.krasen2000-k-stanev.workers.dev",
  // OAuth Client ID от Google Cloud Console (тип „Web application“).
  googleClientId: "REPLACE_WITH_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
  // На колко секунди страницата проверява за промени от колегите.
  pollSeconds: 15,
  // Google таблиците на раздел „Подбор“. Същите ID-та трябва да са и в backend/wrangler.toml (HR_SHEET_IDS).
  sheets: {
    track: "1OcLHccAgxivh4O5Gc1GS0fYRACNpMzCtGUqqrV0HkdE",
    req: "1nXn7EePnzUPL764WlCxyxsBzdKwLMGvXqDvCJ3QveEw",
    ads: "1JbyKGFEa464j_HtxiBa743FfyfcWUaVnC5nphMl-Q6U",
    tasks: "10taVLzhPT7eLJwgaOZjp4e3rK-BoXF_IiciFd8sJ6WU"
  }
};
