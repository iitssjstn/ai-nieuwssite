"use client";

import { useEffect } from "react";

export default function PageviewTracker() {
  useEffect(() => {
    fetch("/api/track", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
