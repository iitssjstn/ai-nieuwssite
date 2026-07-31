"use client";

import { useEffect, useState } from "react";

export default function PollWidget({ pollId }) {
  const [poll, setPoll] = useState(null);
  const [voted, setVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    const res = await fetch(`/api/public/polls/${pollId}`);
    if (res.ok) setPoll(await res.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId]);

  async function handleVote(optionId) {
    setVoting(true);
    setError(null);
    const res = await fetch(`/api/public/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId }),
    });
    setVoting(false);
    if (res.ok) {
      setPoll(await res.json());
      setVoted(true);
    } else {
      const data = await res.json();
      if (res.status === 409) {
        setVoted(true);
        await load();
      } else {
        setError(data.error);
      }
    }
  }

  if (!poll || !poll.active) return null;

  const total = poll.options.reduce((s, o) => s + o.votes, 0);

  return (
    <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 18, margin: "24px 0" }}>
      <p style={{ fontWeight: 500, fontSize: 15, marginBottom: 12 }}>{poll.question}</p>
      {poll.options.map((o) => {
        const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
        return voted ? (
          <div key={o.id} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
              <span>{o.text}</span>
              <span>{pct}%</span>
            </div>
            <div style={{ background: "var(--border)", borderRadius: 4, height: 8 }}>
              <div style={{ width: `${pct}%`, background: "var(--accent-text)", height: 8, borderRadius: 4 }} />
            </div>
          </div>
        ) : (
          <button
            key={o.id}
            onClick={() => handleVote(o.id)}
            disabled={voting}
            style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 6, padding: "8px 12px" }}
          >
            {o.text}
          </button>
        );
      })}
      {error && <p style={{ color: "var(--danger-text)", fontSize: 12, marginTop: 6 }}>{error}</p>}
      {voted && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>{total} stemmen totaal</p>}
    </div>
  );
}
