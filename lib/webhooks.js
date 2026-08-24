import crypto from "crypto";
import { getWebhooks } from "./db.js";

// Sends an event to all active webhooks subscribed to it.
// Every call carries an HMAC-SHA256 signature (using that webhook's own
// secret) in the header, so the receiver can verify that the
// request really came from us. If an individual webhook fails (e.g. the URL
// is no longer reachable), that must never block the rest.
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
