"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [checking, setChecking] = useState(true);
  const [hasAccount, setHasAccount] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data) => {
        setHasAccount(data.hasAccount);
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/review");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Inloggen mislukt");
    }
  }

  async function handleSetup(e) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Wachtwoorden komen niet overeen");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, googleApiKey }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/review");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Account aanmaken mislukt");
    }
  }

  if (checking) {
    return <div className="container" style={{ maxWidth: 360, paddingTop: 80 }} />;
  }

  return (
    <div className="container" style={{ maxWidth: 360, paddingTop: 80 }}>
      {hasAccount ? (
        <>
          <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 20 }}>Redactie — inloggen</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Wachtwoord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ marginBottom: 12 }}
              autoFocus
            />
            {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button type="submit" className="primary" disabled={busy} style={{ width: "100%" }}>
              {busy ? "Bezig..." : "Inloggen"}
            </button>
          </form>
        </>
      ) : (
        <>
          <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Admin-account aanmaken</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
            Er bestaat nog geen account. Dit kan maar één keer — kies nu je wachtwoord.
          </p>
          <form onSubmit={handleSetup}>
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
              style={{ marginBottom: 16 }}
            />
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
              Google API-key (optioneel — kun je ook later toevoegen via Instellingen)
            </p>
            <input
              type="text"
              placeholder="AIza..."
              value={googleApiKey}
              onChange={(e) => setGoogleApiKey(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button type="submit" className="primary" disabled={busy} style={{ width: "100%" }}>
              {busy ? "Bezig..." : "Account aanmaken"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
