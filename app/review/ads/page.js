"use client";

import { useEffect, useState } from "react";
import { useConfirmDialog } from "../../components/ConfirmDialog";
import { AD_SLOT_DEFINITIONS } from "@/lib/ad-slots";

function slotLabel(id) {
  return AD_SLOT_DEFINITIONS.find((s) => s.id === id)?.label || id;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// "active" = binnen zijn periode vandaag, "scheduled" = start pas later,
// "ended" = einddatum al voorbij. Puur op basis van de datums berekend —
// geen aparte status nodig die uit de pas kan lopen met de werkelijkheid.
function adPhase(s) {
  const today = todayStr();
  if (s.start_date && s.start_date > today) return "scheduled";
  if (s.end_date && s.end_date < today) return "ended";
  return "active";
}

const PHASE_LABEL = { active: "Active now", scheduled: "Scheduled", ended: "Ended" };
const PHASE_COLOR = { active: "var(--success-text)", scheduled: "var(--accent-text)", ended: "var(--text-muted)" };

function formatRange(s) {
  const start = s.start_date || "immediately";
  const end = s.end_date || "indefinitely";
  return `${start} → ${end}`;
}

export default function AdsPage() {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [submissions, setSubmissions] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  // Welke aanmelding momenteel zijn inplan-formulier open heeft staan
  // (null = geen enkele) — zowel voor een nieuwe goedkeuring als voor het
  // aanpassen van de periode van een al goedgekeurde advertentie.
  const [schedulingId, setSchedulingId] = useState(null);

  async function load() {
    setLoadError(null);
    try {
      const res = await fetch("/api/ad-submissions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      if (!Array.isArray(data)) throw new Error("Unexpected response from the server");
      setSubmissions(data);
    } catch (err) {
      // Zonder dit bleef het scherm voor altijd op "niets" staan zodra de
      // eerste ophaal-actie om wat voor reden dan ook faalde (bijv. geen
      // geldige sessie meer) — nu krijg je in elk geval een duidelijke
      // melding i.p.v. een leeg scherm.
      setLoadError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function patchSubmission(id, body) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/ad-submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setSchedulingId(null);
      await load();
    } catch (err) {
      // Een overlap-conflict (409) blijft zichtbaar op het open
      // formulier i.p.v. het te sluiten — zo kan de datum meteen
      // aangepast worden zonder opnieuw op "Approve" te moeten klikken.
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

  if (loadError) {
    return (
      <>
        <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Ad Center</h2>
        <p style={{ color: "var(--danger-text)", fontSize: 13 }}>Could not load ad submissions: {loadError}</p>
        <button onClick={load} style={{ width: "auto", padding: "6px 12px", fontSize: 13, marginTop: 8 }}>
          Retry
        </button>
      </>
    );
  }
  if (!submissions) return null;

  const pending = submissions.filter((s) => s.status === "pending");
  const approved = submissions.filter((s) => s.status === "approved");
  const other = submissions.filter((s) => s.status === "rejected");

  // Voor het overzicht "per plek": alleen zinvol te groeperen op plekken
  // waar daadwerkelijk iets goedgekeurds voor is.
  const slotsWithApproved = AD_SLOT_DEFINITIONS.filter((slot) => approved.some((s) => s.slot === slot.id));

  return (
    <>
      {ConfirmDialog}
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Ad Center</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Self-serve ad submissions from{" "}
        <a href="/advertise" target="_blank" rel="noopener noreferrer">/advertise</a>. Approving
        one requires a start date (and optionally an end date, e.g. "paid for 4 weeks") —
        the system automatically blocks overlapping bookings for the same placement, so you can
        schedule ads before or after each other without checking for conflicts yourself.
      </p>
      {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 16 }}>{error}</p>}

      <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>Pending review ({pending.length})</h3>
      {pending.length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Nothing waiting for review.</p>}
      {pending.map((s) => (
        <AdCard
          key={s.id}
          s={s}
          busy={busyId === s.id}
          scheduling={schedulingId === s.id}
          onStartScheduling={() => setSchedulingId(s.id)}
          onCancelScheduling={() => { setSchedulingId(null); setError(null); }}
          onConfirmSchedule={(start, end) => patchSubmission(s.id, { status: "approved", start_date: start, end_date: end || null })}
          onReject={() => patchSubmission(s.id, { status: "rejected" })}
          onDelete={() => remove(s.id)}
        />
      ))}

      {slotsWithApproved.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, fontWeight: 500, margin: "28px 0 6px" }}>Schedule by placement</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
            What's booked for each placement, in order — this is what lets you see at a glance
            where there's room for another ad before or after.
          </p>
          {slotsWithApproved.map((slot) => (
            <div key={slot.id} style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{slot.label}</p>
              {approved
                .filter((s) => s.slot === slot.id)
                .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""))
                .map((s) => (
                  <AdCard
                    key={s.id}
                    s={s}
                    busy={busyId === s.id}
                    scheduling={schedulingId === s.id}
                    phase={adPhase(s)}
                    onStartScheduling={() => setSchedulingId(s.id)}
                    onCancelScheduling={() => { setSchedulingId(null); setError(null); }}
                    onConfirmSchedule={(start, end) => patchSubmission(s.id, { start_date: start, end_date: end || null })}
                    onReject={() => patchSubmission(s.id, { status: "rejected" })}
                    onDelete={() => remove(s.id)}
                  />
                ))}
            </div>
          ))}
        </>
      )}

      {other.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, fontWeight: 500, margin: "28px 0 10px" }}>Rejected ({other.length})</h3>
          {other.map((s) => (
            <AdCard
              key={s.id}
              s={s}
              busy={busyId === s.id}
              scheduling={schedulingId === s.id}
              onStartScheduling={() => setSchedulingId(s.id)}
              onCancelScheduling={() => { setSchedulingId(null); setError(null); }}
              onConfirmSchedule={(start, end) => patchSubmission(s.id, { status: "approved", start_date: start, end_date: end || null })}
              onDelete={() => remove(s.id)}
            />
          ))}
        </>
      )}
    </>
  );
}

function AdCard({ s, busy, scheduling, phase, onStartScheduling, onCancelScheduling, onConfirmSchedule, onReject, onDelete }) {
  const [start, setStart] = useState(s.start_date || todayStr());
  const [weeks, setWeeks] = useState("");

  function computeEnd() {
    if (!weeks) return null;
    const d = new Date(start);
    d.setDate(d.getDate() + Number(weeks) * 7);
    return d.toISOString().slice(0, 10);
  }

  return (
    <div className="pending-item" style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s.image_url} alt={`Banner from ${s.advertiser_name}`} style={{ maxWidth: 200, maxHeight: 120, borderRadius: 6, border: "1px solid var(--border)" }} />
      <div style={{ flex: 1, minWidth: 200 }}>
        <p style={{ fontWeight: 500, margin: 0 }}>
          {s.advertiser_name}
          {phase && (
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: PHASE_COLOR[phase] }}>
              {PHASE_LABEL[phase]}
            </span>
          )}
        </p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0" }}>{s.advertiser_email}</p>
        {!phase && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0" }}>
            Placement: <strong>{slotLabel(s.slot)}</strong>
          </p>
        )}
        {s.status === "approved" && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0" }}>
            Scheduled: <strong>{formatRange(s)}</strong>
          </p>
        )}
        <p style={{ fontSize: 12, margin: "4px 0" }}>
          Links to:{" "}
          <a href={s.destination_url} target="_blank" rel="noopener noreferrer nofollow">{s.destination_url}</a>
        </p>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0" }}>
          Submitted {new Date(s.submitted_at).toLocaleString("en-US")}
        </p>

        {scheduling && (
          <div style={{ background: "var(--surface-1)", borderRadius: 8, padding: 12, marginTop: 10, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Start date</label>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} style={{ padding: 6, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Weeks (blank = indefinite)</label>
              <input type="number" min="1" value={weeks} onChange={(e) => setWeeks(e.target.value)} style={{ padding: 6, fontSize: 13, width: 90 }} />
            </div>
            <button onClick={() => onConfirmSchedule(start, computeEnd())} disabled={busy} className="primary" style={{ width: "auto", padding: "7px 14px", fontSize: 13 }}>
              {busy ? "Saving..." : "Confirm"}
            </button>
            <button onClick={onCancelScheduling} disabled={busy} style={{ width: "auto", padding: "7px 14px", fontSize: 13 }}>
              Cancel
            </button>
          </div>
        )}
      </div>
      {!scheduling && (
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {onConfirmSchedule && (
            <button onClick={onStartScheduling} disabled={busy} className="primary" style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
              {s.status === "approved" ? "Edit dates" : "Approve"}
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
      )}
    </div>
  );
}
