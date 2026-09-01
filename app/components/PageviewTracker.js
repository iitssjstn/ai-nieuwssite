"use client";

import { useEffect } from "react";

// Telt óók de artikel-view (voor Most Read/Categories) als articleId is
// meegegeven — bewust op dezelfde manier als de gewone paginaweergave:
// pas als een echte browser dit daadwerkelijk uitvoert, niet meer
// server-side bij het genereren van de pagina zelf. Dat laatste liet
// crawlers/bots die geen JavaScript uitvoeren (bijv. zoekmachines die
// sneller langskomen dankzij IndexNow/Bing) wél meetellen in Categories/
// Most Read, terwijl diezelfde bezoeken nooit in "Page views" verschenen
// — vandaar de scheve, niet meer met elkaar kloppende cijfers.
export default function PageviewTracker({ articleId }) {
  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: articleId ? { "Content-Type": "application/json" } : undefined,
      body: articleId ? JSON.stringify({ articleId }) : undefined,
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
