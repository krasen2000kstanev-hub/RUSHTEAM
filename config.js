// Настройки на сайта. Тези стойности са публични – тайните стоят само в Cloudflare.
window.TEAM_HUB_CONFIG = {
  // Адресът на AWS API Gateway (без наклонена черта накрая).
  apiBase: "https://4hj7bckbo5.execute-api.eu-central-1.amazonaws.com",
  // OAuth Client ID от Google Cloud Console (тип „Web application“).
  googleClientId: "1091736019816-sj7dgpjger0l1l8avjrd2h14ocjjj12f.apps.googleusercontent.com",
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
