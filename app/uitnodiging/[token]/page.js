"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function InvitePage() {
  const { token } = useParams();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [invite, setInvite] = useState(null);
  const [inviteError, setInviteError] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json();
          setInviteError(data.error || "Invalid link");
        } else {
          setInvite(await r.json());
        }
        setChecking(false);
      })
      .catch(() => {
        setInviteError("Something went wrong while checking this link.");
        setChecking(false);
      });
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/invite/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } else {
      const data = await res.json();
      setError(data.error || "Setup failed");
    }
  }

  if (checking) {
    return <div className="container" style={{ maxWidth: 360, paddingTop: 80 }} />;
  }

  if (inviteError) {
    return (
      <div className="container" style={{ maxWidth: 360, paddingTop: 80 }}>
        <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Invitation Not Valid</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{inviteError}</p>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>
          Ask the administrator for a new invitation link.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="container" style={{ maxWidth: 360, paddingTop: 80 }}>
        <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Password Set</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>You're being redirected to the login page...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 360, paddingTop: 80 }}>
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
        Welcome{invite.full_name ? `, ${invite.full_name}` : ""}
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        You've been invited as an editor (username: <strong>{invite.username}</strong>). Choose
        your own password below to activate your account.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="New password (min. 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 8 }}
          autoFocus
        />
        <input
          type="password"
          placeholder="Repeat password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button type="submit" className="primary" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Working..." : "Set Password"}
        </button>
      </form>
    </div>
  );
}
