"use client";

import { useEffect, useState } from "react";

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min. ago`;
  const hours = Math.floor(mins / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

export default function LiveblogTimeline({ articleId, initialUpdates }) {
  const [updates, setUpdates] = useState(initialUpdates || []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/liveblog/${articleId}`);
        if (!res.ok) return;
        const data = await res.json();
        setUpdates(data.updates || []);
      } catch {
        // stil negeren — bij de volgende poll wordt het gewoon opnieuw geprobeerd
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [articleId]);

  if (updates.length === 0) {
    return <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No updates yet.</p>;
  }

  return (
    <div>
      {updates.map((u, i) => (
        <div key={u.id} style={{ display: "flex", gap: 14, marginBottom: 20 }}>
          <div style={{ flexShrink: 0, width: 70, textAlign: "right" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{timeAgo(u.created_at)}</span>
          </div>
          <div style={{ borderLeft: "2px solid var(--border)", paddingLeft: 14, flex: 1 }}>
            <p style={{ fontSize: 15, margin: 0, lineHeight: 1.6 }}>{u.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
