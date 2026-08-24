"use client";

import { useEffect, useState } from "react";

const FREQUENCY_OPTIONS = [1, 3, 6, 12, 24, 48, 168];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMoment(iso) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "Europe/Amsterdam", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatFrequencyLabel(hours) {
  if (hours === 168) return "Every week";
  if (hours === 24) return "Every day";
  if (hours === 48) return "Every 2 days";
  return `Every ${hours} hours`;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState(null);
  const [settings, setSettings] = useState(null);
  const [remote, setRemote] = useState(null);
  const [remoteUrlDraft, setRemoteUrlDraft] = useState("");
  const [remoteKeyDraft, setRemoteKeyDraft] = useState("");
  const [remoteBusy, setRemoteBusy] = useState(false);
  const [remoteSaved, setRemoteSaved] = useState(false);
  const [remotePushStatus, setRemotePushStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [freqBusy, setFreqBusy] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const res = await fetch("/api/backups");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to fetch backups");
        setBackups([]);
        return;
      }
      setBackups(data.backups || []);
    } catch {
      setError("Could not connect to fetch backups. Refresh the page to try again.");
      setBackups([]);
    }
  }

  async function loadSettings() {
    const res = await fetch("/api/settings/automation");
    if (res.ok) setSettings(await res.json());
  }

  async function loadRemote() {
    const res = await fetch("/api/settings/remote-backup");
    if (res.ok) {
      const data = await res.json();
      setRemote(data);
      setRemoteUrlDraft(data.url || "");
      // Deliberately NOT pre-filled — the key no longer comes back
      // from the server anyway (see API route), but even if it did:
      // a password field with the actual value in it can still be
      // read via "Inspect Element", even with type="password".
    }
  }

  useEffect(() => {
    load();
    loadSettings();
    loadRemote();
  }, []);

  async function handleSaveRemote(e) {
    e.preventDefault();
    setRemoteBusy(true);
    setRemoteSaved(false);
    const res = await fetch("/api/settings/remote-backup", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: remoteUrlDraft, key: remoteKeyDraft }),
    });
    setRemoteBusy(false);
    if (res.ok) {
      setRemote(await res.json());
      setRemoteKeyDraft(""); // don't leave the just-typed value hanging in the DOM after saving
      setRemoteSaved(true);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save remote backup settings");
    }
  }

  async function handleBackupNow() {
    setError(null);
    setRemotePushStatus(null);
    setBusy(true);
    try {
      const res = await fetch("/api/backups", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setBackups(data.backups || []);
        if (data.remote && !data.remote.skipped) setRemotePushStatus(data.remote);
      } else {
        setError(data.error || "Backup failed");
      }
    } catch {
      setError("Could not connect to the server to back up. Try again, and check the server logs if needed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFrequencyChange(hours) {
    setFreqBusy(true);
    const res = await fetch("/api/settings/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backup_frequency_hours: hours }),
    });
    setFreqBusy(false);
    if (res.ok) setSettings(await res.json());
  }

  if (!backups || !settings || !remote) return null;

  const newest = backups[0];

  return (
    <>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Backups</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        A copy of the database file (articles, settings,
        users — everything) is automatically made, at the frequency you set below. About
        14 days of history is always kept, regardless of how often you back up; older backups are
        automatically cleaned up. Download a copy to your own computer regularly for extra
        peace of mind — these backups live on the same server as the site itself, unless
        you configure a remote receiver below.
      </p>

      <div className="admin-glass-card" style={{ padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>How often</p>
        <select
          value={settings.backup_frequency_hours}
          onChange={(e) => handleFrequencyChange(parseInt(e.target.value, 10))}
          disabled={freqBusy}
          style={{ padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
        >
          {FREQUENCY_OPTIONS.map((h) => (
            <option key={h} value={h}>{formatFrequencyLabel(h)}</option>
          ))}
        </select>
      </div>

      <form onSubmit={handleSaveRemote} className="admin-glass-card" style={{ padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px" }}>Remote backup receiver (optional)</p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
          Every new backup is automatically sent here too — intended for a
          separate "backup-receiver" application on a second server, so your backups aren't only
          stored here.
        </p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Receiver URL</p>
        <input
          type="text"
          placeholder="https://backup.yourdomain.com"
          value={remoteUrlDraft}
          onChange={(e) => setRemoteUrlDraft(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
          Password {remote?.hasKey && <span style={{ color: "var(--success-text)" }}>— already set</span>}
        </p>
        <input
          type="password"
          placeholder={remote?.hasKey ? "Leave blank to keep, or type a new password" : "The password you set on the receiver itself"}
          value={remoteKeyDraft}
          onChange={(e) => setRemoteKeyDraft(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        {remoteSaved && <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 8 }}>Saved.</p>}
        <button type="submit" className="primary" disabled={remoteBusy} style={{ width: "auto", padding: "8px 16px" }}>
          Save
        </button>
      </form>

      <div className="admin-glass-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>
              {newest ? `Last backup: ${formatMoment(newest.createdAt)}` : "No backup made yet"}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
              {backups.length} backup(s) available
            </p>
          </div>
          <button onClick={handleBackupNow} disabled={busy} className="primary" style={{ width: "auto", padding: "8px 16px" }}>
            {busy ? "Working..." : "Backup Now"}
          </button>
        </div>
        {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginTop: 10 }}>{error}</p>}
        {remotePushStatus && (
          <p style={{ color: remotePushStatus.success ? "var(--success-text)" : "var(--danger-text)", fontSize: 13, marginTop: 10 }}>
            {remotePushStatus.success
              ? "✓ Also sent to the remote receiver."
              : `⚠ Failed to send to the remote receiver: ${remotePushStatus.error}`}
          </p>
        )}
      </div>

      {backups.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          No backups yet — the first one is created automatically within a quarter of an hour, or click
          "Backup Now" above.
        </p>
      ) : (
        <div className="admin-glass-card" style={{ padding: 0, overflow: "hidden" }}>
          {backups.map((b, i) => (
            <div
              key={b.filename}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 16px", borderTop: i > 0 ? "1px solid var(--border)" : "none",
              }}
            >
              <span style={{ fontSize: 13 }}>{formatMoment(b.createdAt)}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatBytes(b.sizeBytes)}</span>
                <a href={`/api/backups/download/${b.filename}`} style={{ fontSize: 13, color: "var(--accent-text)" }}>
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
