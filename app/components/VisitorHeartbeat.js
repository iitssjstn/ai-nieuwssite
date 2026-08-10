"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL_MS = 45 * 1000;

function getOrCreateVisitorId() {
  // sessionStorage i.p.v. localStorage: het ID verdwijnt zodra het
  // tabblad/venster sluit — er wordt bewust niets bewaard dat een bezoeker
  // over meerdere bezoeken heen zou kunnen herkennen.
  let id = sessionStorage.getItem("visitor_session_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("visitor_session_id", id);
  }
  return id;
}

export default function VisitorHeartbeat() {
  useEffect(() => {
    const visitorId = getOrCreateVisitorId();

    function sendHeartbeat() {
      fetch("/api/track-visitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId }),
      }).catch(() => {});
    }

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return null;
}
