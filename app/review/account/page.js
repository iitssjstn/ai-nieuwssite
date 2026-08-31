"use client";

import { useEffect, useState } from "react";

export default function MyAccountPage() {
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [saved, setSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState(null);
  const [pwSaved, setPwSaved] = useState(false);

  async function load() {
    setLoadError(null);
    try {
      const res = await fetch("/api/account");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setProfile(data);
      setFullName(data.full_name || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setAddress(data.address || "");
    } catch (err) {
      // Zonder dit bleef de pagina voor altijd leeg staan zodra het laden
      // om wat voor reden dan ook mislukte (bijv. een verlopen sessie).
      setLoadError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName, email, phone, address }),
    });
    setBusy(false);
    if (res.ok) {
      setProfile(await res.json());
      setSaved(true);
    } else {
      const data = await res.json();
      setError(data.error || "Save failed");
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError(null);
    setPwSaved(false);
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match");
      return;
    }
    setPwBusy(true);
    const res = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setPwBusy(false);
    if (res.ok) {
      setPwSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      const data = await res.json();
      setPwError(data.error || "Change failed");
    }
  }

  if (loadError) {
    return (
      <div className="container">
        <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>My Account</h1>
        <p style={{ color: "var(--danger-text)", fontSize: 13 }}>Could not load your account: {loadError}</p>
        <button onClick={load} style={{ width: "auto", padding: "6px 12px", fontSize: 13, marginTop: 8 }}>
          Retry
        </button>
      </div>
    );
  }
  if (!profile) return null;

  return (
    <div className="container">
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>My Account</h1>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Username: <strong>{profile.username}</strong> · Role: {profile.role === "admin" ? "Admin" : "Editor"}
      </p>

      <form onSubmit={handleSaveProfile} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginBottom: 16, maxWidth: 420 }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>Profile Information</p>

        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Full name</p>
        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ marginBottom: 10 }} />

        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Email address</p>
        <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginBottom: 10 }} />

        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Phone number</p>
        <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ marginBottom: 10 }} />

        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Address</p>
        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} style={{ marginBottom: 10 }} />

        {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
        {saved && <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 8 }}>Saved.</p>}
        <button type="submit" className="primary" disabled={busy} style={{ width: "auto", padding: "8px 16px" }}>
          Save
        </button>
      </form>

      <form onSubmit={handleChangePassword} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, maxWidth: 420 }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>Change Password</p>

        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Current password</p>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          style={{ marginBottom: 10 }}
        />

        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>New password (min. 8 characters)</p>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={{ marginBottom: 10 }}
        />

        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Repeat new password</p>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={{ marginBottom: 10 }}
        />

        {pwError && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{pwError}</p>}
        {pwSaved && <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 8 }}>Password changed.</p>}
        <button type="submit" className="primary" disabled={pwBusy} style={{ width: "auto", padding: "8px 16px" }}>
          Change Password
        </button>
      </form>
    </div>
  );
}
