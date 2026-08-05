"use client";

import { useState } from "react";

export default function NewsletterWidget() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null); // null | "busy" | "done" | "error"
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("busy");
    setError(null);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Aanmelden mislukt");
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err.message);
    }
  }

  return (
    <div id="nieuwsbrief" className="sidebar-box">
      <h3>📧 Nieuwsbrief</h3>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 10px" }}>
        Ontvang het belangrijkste nieuws in je inbox.
      </p>
      {status === "done" ? (
        <p style={{ fontSize: 13, color: "var(--success-text)" }}>Bedankt! Je bent aangemeld.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            required
            placeholder="Jouw e-mailadres"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ marginBottom: 8, fontSize: 13 }}
          />
          {error && <p style={{ fontSize: 12, color: "var(--danger-text)", marginBottom: 8 }}>{error}</p>}
          <button type="submit" className="primary" disabled={status === "busy"} style={{ width: "100%", fontSize: 13 }}>
            {status === "busy" ? "Bezig..." : "Aanmelden"}
          </button>
        </form>
      )}
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>Je kunt je op elk moment afmelden.</p>
    </div>
  );
}
