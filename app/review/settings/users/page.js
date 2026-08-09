"use client";

import { useEffect, useState } from "react";
import { useConfirmDialog } from "../../../components/ConfirmDialog";

export default function UsersPage() {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteMode, setInviteMode] = useState(true);
  const [role, setRole] = useState("editor");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [regeneratingId, setRegeneratingId] = useState(null);

  async function load() {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    setGeneratedInvite(null);
    setBusy(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username, password: inviteMode ? undefined : password,
        role, full_name: fullName, email, phone, address,
      }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      if (data.inviteToken) {
        setGeneratedInvite({ username: data.username, token: data.inviteToken });
      }
      setUsername("");
      setPassword("");
      setFullName("");
      setEmail("");
      setPhone("");
      setAddress("");
      await load();
    } else {
      const data = await res.json();
      setError(data.error || "Aanmaken mislukt");
    }
  }

  async function regenerateInvite(id) {
    setRegeneratingId(id);
    const res = await fetch(`/api/users/${id}/invite`, { method: "POST" });
    setRegeneratingId(null);
    if (res.ok) {
      const data = await res.json();
      const u = users.find((x) => x.id === id);
      setGeneratedInvite({ username: u?.username, token: data.inviteToken });
    } else {
      const data = await res.json();
      alert(data.error || "Genereren mislukt");
    }
  }

  async function remove(id) {
    if (!(await confirm("Deze gebruiker verwijderen?"))) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      await load();
    } else {
      const data = await res.json();
      alert(data.error || "Verwijderen mislukt");
    }
  }

  function startEdit(u) {
    setEditingId(u.id);
    setEditDraft({
      username: u.username,
      full_name: u.full_name || "",
      email: u.email || "",
      phone: u.phone || "",
      address: u.address || "",
      role: u.role,
      newPassword: "",
    });
  }

  async function saveEdit(id) {
    setBusy(true);
    const { newPassword, ...profile } = editDraft;
    const body = { ...profile };
    if (newPassword) body.newPassword = newPassword;
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) {
      setEditingId(null);
      await load();
    } else {
      const data = await res.json();
      alert(data.error || "Opslaan mislukt");
    }
  }

  return (
    <>
      {ConfirmDialog}
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Redacteuren</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Redacteuren kunnen concepten genereren en bewerken, maar niet goedkeuren, publiceren of
        instellingen wijzigen — dat blijft voorbehouden aan admins.
      </p>

      {generatedInvite && (
        <div style={{ background: "var(--accent-bg)", color: "var(--accent-text)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <p style={{ margin: "0 0 8px", fontWeight: 500 }}>
            🔗 Uitnodigingslink voor {generatedInvite.username}
          </p>
          <p style={{ fontSize: 12, marginBottom: 10 }}>
            Stuur deze link zelf naar de redacteur (bijv. via e-mail of WhatsApp) — er wordt geen
            automatische mail verstuurd. Geldig 7 dagen.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              readOnly
              value={typeof window !== "undefined" ? `${window.location.origin}/uitnodiging/${generatedInvite.token}` : ""}
              onClick={(e) => e.target.select()}
              style={{ fontSize: 12 }}
            />
            <button
              onClick={() => {
                const link = `${window.location.origin}/uitnodiging/${generatedInvite.token}`;
                navigator.clipboard.writeText(link);
              }}
              style={{ width: "auto", padding: "8px 16px", fontSize: 13, flexShrink: 0 }}
            >
              Kopiëren
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleAdd} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 10px" }}>Nieuwe gebruiker toevoegen</p>
        <input type="text" placeholder="Volledige naam" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ marginBottom: 8 }} />
        <input type="text" placeholder="Gebruikersnaam (voor inloggen)" value={username} onChange={(e) => setUsername(e.target.value)} style={{ marginBottom: 8 }} />

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={inviteMode} onChange={(e) => setInviteMode(e.target.checked)} style={{ width: "auto" }} />
          Uitnodigen — redacteur stelt zelf zijn wachtwoord in via een link (jij hoeft alleen het e-mailadres te weten)
        </label>

        {!inviteMode && (
          <input type="password" placeholder="Wachtwoord (min. 8 tekens)" value={password} onChange={(e) => setPassword(e.target.value)} style={{ marginBottom: 8 }} />
        )}

        <input type="text" placeholder="E-mailadres" value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginBottom: 8 }} />
        <input type="text" placeholder="Telefoonnummer" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ marginBottom: 8 }} />
        <input type="text" placeholder="Huisadres" value={address} onChange={(e) => setAddress(e.target.value)} style={{ marginBottom: 8 }} />
        <select value={role} onChange={(e) => setRole(e.target.value)} style={{ marginBottom: 10, padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}>
          <option value="editor">Redacteur</option>
          <option value="admin">Admin</option>
        </select>
        {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
        <button type="submit" className="primary" disabled={busy} style={{ width: "auto", padding: "8px 16px" }}>
          {inviteMode ? "Uitnodiging aanmaken" : "Toevoegen"}
        </button>
      </form>

      {users.map((u) => (
        <div key={u.id} className="pending-item">
          {editingId === u.id ? (
            <div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Volledige naam</p>
              <input type="text" value={editDraft.full_name} onChange={(e) => setEditDraft((d) => ({ ...d, full_name: e.target.value }))} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Gebruikersnaam</p>
              <input type="text" value={editDraft.username} onChange={(e) => setEditDraft((d) => ({ ...d, username: e.target.value }))} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>E-mailadres</p>
              <input type="text" value={editDraft.email} onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Telefoonnummer</p>
              <input type="text" value={editDraft.phone} onChange={(e) => setEditDraft((d) => ({ ...d, phone: e.target.value }))} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Huisadres</p>
              <input type="text" value={editDraft.address} onChange={(e) => setEditDraft((d) => ({ ...d, address: e.target.value }))} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Rol</p>
              <select value={editDraft.role} onChange={(e) => setEditDraft((d) => ({ ...d, role: e.target.value }))} style={{ marginBottom: 8, padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}>
                <option value="editor">Redacteur</option>
                <option value="admin">Admin</option>
              </select>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Nieuw wachtwoord (laat leeg om te behouden)</p>
              <input type="password" value={editDraft.newPassword} onChange={(e) => setEditDraft((d) => ({ ...d, newPassword: e.target.value }))} style={{ marginBottom: 10 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => saveEdit(u.id)} className="primary" disabled={busy} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                  Opslaan
                </button>
                <button onClick={() => setEditingId(null)} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                  Annuleren
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontWeight: 500, margin: 0 }}>
                  {u.full_name || u.username}
                  {u.has_pending_invite && (
                    <span className="badge" style={{ marginLeft: 8, background: "var(--accent-bg)", color: "var(--accent-text)", fontSize: 11 }}>
                      🔔 Uitnodiging nog niet geaccepteerd
                    </span>
                  )}
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                  @{u.username} · {u.role === "admin" ? "Admin" : "Redacteur"}
                  {u.email && ` · ${u.email}`}
                  {u.phone && ` · ${u.phone}`}
                </p>
                {u.address && (
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>{u.address}</p>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {u.has_pending_invite && (
                  <button onClick={() => regenerateInvite(u.id)} disabled={regeneratingId === u.id} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                    Nieuwe link
                  </button>
                )}
                <button onClick={() => startEdit(u)} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                  Bewerken
                </button>
                <button onClick={() => remove(u.id)} className="danger" style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
                  Verwijderen
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
