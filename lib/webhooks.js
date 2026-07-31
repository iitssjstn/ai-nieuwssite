import crypto from "crypto";
import { getWebhooks } from "./db.js";

// Stuurt een event naar alle actieve webhooks die erop geabonneerd zijn.
// Elke aanroep krijgt een HMAC-SHA256-handtekening (met de eigen secret van
// die webhook) mee in de header, zodat de ontvanger kan verifiëren dat het
// verzoek echt van ons komt. Faalt een individuele webhook (bijv. de URL is
// niet meer bereikbaar), dan mag dat de rest nooit blokkeren.
export async function triggerWebhooks(event, payload) {
  const webhooks = getWebhooks().filter((w) => w.active && w.events.includes(event));
  const body = JSON.stringify({ event, data: payload, sent_at: new Date().toISOString() });

  await Promise.allSettled(
    webhooks.map((webhook) => {
      const signature = crypto.createHmac("sha256", webhook.secret).update(body).digest("hex");
      return fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": event,
        },
        body,
      });
    })
  );
}
