"use client";

import { useEffect, useState } from "react";
import { useConfirmDialog } from "../../components/ConfirmDialog";
import { AD_SLOT_DEFINITIONS } from "@/lib/ad-slots";

function slotLabel(id) {
  return AD_SLOT_DEFINITIONS.find((s) => s.id === id)?.label || id;
}

export default function AdsPage() {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [submissions, setSubmissions] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    const res = await fetch("/api/ad-submissions");
    setSubmissions(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id, status) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/ad-submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id) {
    if (!(await confirm("Permanently delete this ad submission? This cannot be undone."))) return;
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/ad-submissions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!submissions) return null;

  const pending = submissions.filter((s) => s.status === "pending");
  const approved = submissions.filter((s) => s.status === "approved");
  const other = submissions.filter((s) => s.status === "rejected" || s.status === "replaced");

  return (
    <>
      {ConfirmDialog}
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Ad Center</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Self-serve ad submissions from{" "}
        <a href="/advertise" target="_blank" rel="noopener noreferrer">/advertise</a>. Approving
        one makes it go live on the site immediately, replacing whatever was previously approved
        for that same placement.
      </p>
      {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 16 }}>{error}</p>}

      <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>Pending review ({pending.length})</h3>
      {pending.length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Nothing waiting for review.</p>}
      {pending.map((s) => (
        <AdCard key={s.id} s={s} busy={busyId === s.id} onApprove={() => setStatus(s.id, "approved")} onReject={() => setStatus(s.id, "rejected")} onDelete={() => remove(s.id)} />
      ))}

      {approved.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, fontWeight: 500, margin: "28px 0 10px" }}>Currently live ({approved.length})</h3>
          {approved.map((s) => (
            <AdCard key={s.id} s={s} busy={busyId === s.id} onReject={() => setStatus(s.id, "rejected")} onDelete={() => remove(s.id)} />
          ))}
        </>
      )}

      {other.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, fontWeight: 500, margin: "28px 0 10px" }}>Rejected / replaced ({other.length})</h3>
          {other.map((s) => (
            <AdCard key={s.id} s={s} busy={busyId === s.id} onApprove={() => setStatus(s.id, "approved")} onDelete={() => remove(s.id)} />
          ))}
        </>
      )}
    </>
  );
}

function AdCard({ s, busy, onApprove, onReject, onDelete }) {
  return (
    <div className="pending-item" style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s.image_url} alt={`Banner from ${s.advertiser_name}`} style={{ maxWidth: 200, maxHeight: 120, borderRadius: 6, border: "1px solid var(--border)" }} />
      <div style={{ flex: 1, minWidth: 200 }}>
        <p style={{ fontWeight: 500, margin: 0 }}>{s.advertiser_name}</p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0" }}>{s.advertiser_email}</p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0" }}>
          Placement: <strong>{slotLabel(s.slot)}</strong>
        </p>
        <p style={{ fontSize: 12, margin: "4px 0" }}>
          Links to:{" "}
          <a href={s.destination_url} target="_blank" rel="noopener noreferrer nofollow">{s.destination_url}</a>
        </p>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0" }}>
          Submitted {new Date(s.submitted_at).toLocaleString("en-US")}
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {onApprove && (
          <button onClick={onApprove} disabled={busy} className="primary" style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
            Approve
          </button>
        )}
        {onReject && (
          <button onClick={onReject} disabled={busy} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
            Reject
          </button>
        )}
        <button onClick={onDelete} disabled={busy} className="danger" style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
          Delete
        </button>
      </div>
    </div>
  );
}
