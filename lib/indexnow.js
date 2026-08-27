import { getIndexNowKey, getBingWebmasterApiKey } from "./db.js";

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

// Bing's eigen URL Submission API (onderdeel van Bing Webmaster Tools) —
// een apart, rechtstreeks kanaal naar Bing zelf, los van de gedeelde
// IndexNow-ping hierboven (die via api.indexnow.org loopt en ook Yandex/
// Seznam bereikt). Vereist een eigen API-sleutel uit Bing Webmaster Tools
// (Settings → API access), naast de site zelf die daar al geverifieerd
// moet zijn — zie het "bing_site_verification"-veld in de SEO-instellingen.
// Optioneel: als er geen sleutel is ingesteld, gebeurt er simpelweg niets
// (IndexNow blijft dan het enige, al voldoende, kanaal richting Bing).
export async function submitUrlToBing(baseUrl, urls) {
  const apiKey = getBingWebmasterApiKey();
  if (!apiKey) return;

  const urlList = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
  if (urlList.length === 0) return;

  try {
    await fetch(`https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlBatch?apikey=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ siteUrl: baseUrl, urlList }),
    });
  } catch {
    // Best-effort, zelfde reden als bij pingIndexNow hierboven.
  }
}
