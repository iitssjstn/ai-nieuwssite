"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export default function NewsMap({ articles }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let map;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      // Leaflet's standaard marker-iconen verwijzen naar bestanden die met
      // Next.js' bundelaar niet automatisch meekomen — dit herstelt ze met
      // de iconen die wél gewoon in het npm-pakket zitten.
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      map = L.map(containerRef.current).setView([52.1, 5.3], 7); // NL-gecentreerd
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      articles.forEach((a) => {
        if (!a.location?.lat || !a.location?.lng) return;
        const marker = L.marker([parseFloat(a.location.lat), parseFloat(a.location.lng)]).addTo(map);
        marker.bindPopup(
          `<a href="/artikel/${a.slug}" style="font-weight:500">${a.title}</a>`
        );
      });
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [articles]);

  return <div ref={containerRef} style={{ width: "100%", height: 500, borderRadius: 12 }} />;
}
