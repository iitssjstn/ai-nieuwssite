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
          setInviteError(data.error || "Ongeldige link");
        } else {
          setInvite(await r.json());
        }
        setChecking(false);
      })
      .catch(() => {
        setInviteError("Er ging iets mis bij het controleren van deze link.");
        setChecking(false);
      });
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Wachtwoorden komen niet overeen");
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
      setError(data.error || "Instellen mislukt");
    }
  }

  if (checking) {
    return <div className="container" style={{ maxWidth: 360, paddingTop: 80 }} />;
  }

  if (inviteError) {
    return (
      <div className="container" style={{ maxWidth: 360, paddingTop: 80 }}>
        <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Uitnodiging niet geldig</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{inviteError}</p>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>
          Vraag de beheerder om een nieuwe uitnodigingslink.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="container" style={{ maxWidth: 360, paddingTop: 80 }}>
        <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Wachtwoord ingesteld</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Je wordt doorgestuurd naar de inlogpagina...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 360, paddingTop: 80 }}>
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
        Welkom{invite.full_name ? `, ${invite.full_name}` : ""}
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Je bent uitgenodigd als redacteur (gebruikersnaam: <strong>{invite.username}</strong>). Kies
        hieronder je eigen wachtwoord om je account te activeren.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Nieuw wachtwoord (min. 8 tekens)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 8 }}
          autoFocus
        />
        <input
          type="password"
          placeholder="Herhaal wachtwoord"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button type="submit" className="primary" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Bezig..." : "Wachtwoord instellen"}
        </button>
      </form>
    </div>
  );
}
