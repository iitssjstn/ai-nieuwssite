"use client";

import { useEffect, useState } from "react";

function computeLabel(publishedAt) {
  if (!publishedAt) return { text: "", fresh: false };
  const diffMs = Date.now() - new Date(publishedAt).getTime();
  const mins = Math.floor(diffMs / 60000);

  if (mins < 15) return { text: "Net binnen", fresh: true };
  if (mins < 60) return { text: `${mins} min. ago`, fresh: false };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { text: `${hours} hour${hours === 1 ? "" : "s"} ago`, fresh: false };
  return { text: `${Math.floor(hours / 24)} day(s) ago`, fresh: false };
}

export default function LiveTimeLabel({ publishedAt, category, children }) {
  const [label, setLabel] = useState(() => computeLabel(publishedAt));

  useEffect(() => {
    // Elke 30 seconden herberekenen — genoeg om "Net binnen" op tijd te
    // laten omslaan naar een minutenaanduiding, zonder overbodig vaak te
    // updaten voor iets dat toch maar op de minuut nauwkeurig hoeft te zijn.
    const interval = setInterval(() => setLabel(computeLabel(publishedAt)), 30000);
    return () => clearInterval(interval);
  }, [publishedAt]);

  return (
    <>
      <span className={`latest-news-dot${label.fresh ? " fresh" : ""}`} />
      <div>
        <span className="latest-news-time">{label.text} · {category}</span>
        {children}
      </div>
    </>
  );
}
