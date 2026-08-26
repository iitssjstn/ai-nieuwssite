import { getIndexNowKey } from "./db.js";

// Meldt één of meerdere URL's direct bij IndexNow — een protocol dat Bing,
// Yandex en Seznam laat weten "deze pagina is net gepubliceerd/gewijzigd"
// in plaats van te wachten tot hun volgende geplande crawl. Google
// ondersteunt IndexNow zelf niet, maar leest hetzelfde signaal indirect af
// uit onze sitemap's lastmod-datum (zie app/sitemap.js) — deze ping is dus
// een aanvulling op, geen vervanging van, de sitemap.
//
// Eén gedeeld eindpunt (api.indexnow.org) stuurt automatisch door naar alle
// aangesloten zoekmachines. Net als triggerWebhooks() mag een falende ping
// (bijv. geen internet, endpoint tijdelijk down) de rest van de request
// nooit blokkeren of laten falen.
export async function pingIndexNow(baseUrl, urls) {
  const urlList = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
  if (urlList.length === 0) return;

  try {
    const key = getIndexNowKey();
    const host = new URL(baseUrl).host;

    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${baseUrl}/${key}.txt`,
        urlList,
      }),
    });
  } catch {
    // Best-effort — een gemiste ping is geen reden om het publiceren van
    // het artikel zelf te laten mislukken.
  }
}
