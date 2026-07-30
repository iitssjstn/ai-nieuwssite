"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import RichEditor from "../../components/RichEditor";
import ArticleBody from "../../components/ArticleBody";
import { plainTextToHtml } from "@/lib/content";

export default function ReviewDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [article, setArticle] = useState(null);
  const [me, setMe] = useState(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [featuredImage, setFeaturedImage] = useState(null);
  const [tagsInput, setTagsInput] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadingFeatured, setUploadingFeatured] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState(null);
  const [showRevisions, setShowRevisions] = useState(false);
  const [titleVariants, setTitleVariants] = useState(null);
  const [loadingTitles, setLoadingTitles] = useState(false);

  const lastSaved = useRef({ title: "", body: "", featuredImage: null });
  const autosaveTimer = useRef(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then(setMe).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then((r) => r.json())
      .then((a) => {
        setArticle(a);
        setTitle(a.title);
        setBody(plainTextToHtml(a.body));
        setFeaturedImage(a.featured_image || null);
        setTagsInput((a.tags || []).join(", "));
        lastSaved.current = { title: a.title, body: plainTextToHtml(a.body), featuredImage: a.featured_image || null };
      });
  }, [id]);

  useEffect(() => {
    if (!editing) return;
    clearTimeout(autosaveTimer.current);
    const changed =
      title !== lastSaved.current.title ||
      body !== lastSaved.current.body ||
      featuredImage !== lastSaved.current.featuredImage;
    if (!changed) return;

    autosaveTimer.current = setTimeout(async () => {
      setAutosaveStatus("Opslaan...");
      const res = await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit", title, articleBody: body, featuredImage }),
      });
      if (res.ok) {
        lastSaved.current = { title, body, featuredImage };
        setAutosaveStatus("Automatisch opgeslagen · " + new Date().toLocaleTimeString("nl-NL"));
      } else {
        setAutosaveStatus("Automatisch opslaan mislukt");
      }
    }, 4000);

    return () => clearTimeout(autosaveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, featuredImage, editing]);

  async function act(action, extra = {}) {
    setBusy(true);
    const res = await fetch(`/api/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setBusy(false);
      alert(data.error || "Actie mislukt");
      return;
    }
    const updated = await res.json();
    setBusy(false);
    if (["reject", "unpublish", "schedule", "unschedule", "archive"].includes(action)) {
      router.push("/review");
    } else {
      setArticle(updated);
      setEditing(false);
    }
  }

  async function remove() {
    if (!confirm("Dit artikel definitief verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;
    setBusy(true);
    const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Verwijderen mislukt");
      return;
    }
    router.push("/review/published");
  }

  async function saveEdit() {
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    await act("edit", { title, articleBody: body, featuredImage, tags });
  }

  function handleSchedule() {
    if (!scheduledAt) {
      alert("Kies eerst een datum en tijd.");
      return;
    }
    act("schedule", { scheduledAt: new Date(scheduledAt).toISOString() });
  }

  function restoreRevision(rev) {
    if (!confirm("Deze oudere versie terugzetten? Je huidige concept wordt bewaard in de geschiedenis.")) return;
    setTitle(rev.title);
    setBody(plainTextToHtml(rev.body));
    setFeaturedImage(rev.featured_image);
    setEditing(true);
    setShowRevisions(false);
  }

  async function handleFeaturedUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingFeatured(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload mislukt");
      setFeaturedImage(data.url);
    } catch (err) {
      alert("Uitgelichte afbeelding uploaden mislukt: " + err.message);
    } finally {
      setUploadingFeatured(false);
    }
  }

  async function handleGenerateTitles() {
    setLoadingTitles(true);
    setTitleVariants(null);
    try {
      const res = await fetch("/api/generate/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTitleVariants(data.titles);
    } catch (err) {
      alert("Titelvarianten genereren mislukt: " + err.message);
    } finally {
      setLoadingTitles(false);
    }
  }

  if (!article) return <div className="container">Laden...</div>;
  const isAdmin = me?.role === "admin";

  const backHref = article.status === "published" || article.status === "archived" ? "/review/published" : "/review";
  const backLabel = article.status === "published" || article.status === "archived" ? "← Terug naar gepubliceerd" : "← Terug naar wachtrij";

  return (
    <div className="container">
      <Link href={backHref} style={{ fontSize: 13, color: "var(--text-secondary)" }}>{backLabel}</Link>

      {article.possible_duplicate && (
        <div style={{ background: "#412402", color: "#f0b154", borderRadius: 8, padding: "10px 14px", margin: "16px 0", fontSize: 13 }}>
          ⚠ Mogelijk duplicaat ({article.possible_duplicate.score}% gelijkenis) van{" "}
          <Link href={`/review/${article.possible_duplicate.id}`} style={{ color: "inherit", textDecoration: "underline" }}>
            "{article.possible_duplicate.title}"
          </Link>
        </div>
      )}

      {article.consistency_notes?.length > 0 && (
        <div style={{ background: "#412402", color: "#f0b154", borderRadius: 8, padding: "10px 14px", margin: "16px 0", fontSize: 13 }}>
          <p style={{ margin: "0 0 6px", fontWeight: 500 }}>⚠ Bronnen spreken elkaar mogelijk tegen:</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {article.consistency_notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="review-columns" style={{ marginTop: 20 }}>
        <div className="review-col source">
          <p className="label">Bron — {article.source_id}</p>
          {article.source_url && (
            <p style={{ marginBottom: 8 }}>
              <a href={article.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "var(--accent-text)" }}>
                🔗 Origineel bronartikel openen
              </a>
            </p>
          )}
          <p className="body-text">{article.source_raw_text}</p>
          {article.additional_sources?.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Extra bronnen (fact-check):</p>
              {article.additional_sources.map((s, i) => (
                <p key={i} style={{ fontSize: 13, margin: "2px 0" }}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-text)" }}>
                      🔗 {s.name || `Bron ${i + 2}`}
                    </a>
                  ) : (
                    <span>{s.name || `Bron ${i + 2}`} (geen link opgegeven)</span>
                  )}
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="review-col draft">
          <p className="label">AI-concept</p>
          {editing ? (
            <>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ marginBottom: 8, fontWeight: 500 }}
              />

              <div style={{ marginBottom: 10 }}>
                <button type="button" onClick={handleGenerateTitles} disabled={loadingTitles} style={{ width: "auto", padding: "5px 10px", fontSize: 12 }}>
                  {loadingTitles ? "Bezig..." : "AI-titelvarianten voorstellen"}
                </button>
                {titleVariants && (
                  <div style={{ marginTop: 8 }}>
                    {titleVariants.map((t, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => { setTitle(t); setTitleVariants(null); }}
                        style={{ display: "block", width: "100%", textAlign: "left", fontSize: 12, padding: "6px 8px", marginBottom: 4 }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Uitgelichte afbeelding</p>
                {featuredImage && (
                  <img src={featuredImage} alt="" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 6, display: "block" }} />
                )}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFeaturedUpload} disabled={uploadingFeatured} />
              </div>

              <RichEditor value={body} onChange={setBody} />

              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Tags (komma-gescheiden)</p>
                <input
                  type="text"
                  placeholder="bijv. verkiezingen, klimaat, provincie"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </div>

              {autosaveStatus && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>{autosaveStatus}</p>
              )}
            </>
          ) : (
            <>
              <p style={{ fontWeight: 500, fontSize: 15, margin: "0 0 6px" }}>{article.title}</p>
              {article.featured_image && (
                <img src={article.featured_image} alt="" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 8, display: "block" }} />
              )}
              <div className="body-text">
                <ArticleBody body={article.body} />
              </div>
              {article.tags?.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  {article.tags.map((t) => (
                    <span key={t} className="badge badge-muted">#{t}</span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flags">
        <span className="badge badge-muted">{statusLabel(article.status)}</span>
        {article.status === "scheduled" && article.scheduled_at && (
          <span className="badge badge-muted">
            Gepland: {new Date(article.scheduled_at).toLocaleString("nl-NL")}
          </span>
        )}
        {article.breaking && <span className="flag flag-warn">🔴 Breaking</span>}
        {(article.status === "published" || article.status === "archived") && (
          <span className="badge badge-muted">{article.views || 0} weergaven</span>
        )}
        <span className={`flag ${article.flags?.figures_verified === false ? "flag-warn" : "flag-ok"}`}>
          {article.flags?.figures_verified === false ? "Cijfer wijkt af van bron" : "Cijfer matcht bron"}
        </span>
        <span className={`flag ${article.flags?.quote_unverified ? "flag-warn" : "flag-ok"}`}>
          {article.flags?.quote_unverified ? "Citaat niet in bron gevonden" : "Geen ongeverifieerde citaten"}
        </span>
        <span className="flag flag-ok">
          Confidence: {article.confidence_score != null ? Math.round(article.confidence_score * 100) + "%" : "-"}
        </span>
        {article.generated_by && (
          <span className="badge badge-muted">via {article.generated_by}</span>
        )}
      </div>

      {isAdmin && (
        <div className="actions" style={{ marginBottom: 10 }}>
          <button disabled={busy} onClick={() => act("toggle_breaking")}>
            {article.breaking ? "Breaking-status verwijderen" : "Als breaking news markeren"}
          </button>
          {article.revisions?.length > 0 && (
            <button disabled={busy} onClick={() => setShowRevisions((s) => !s)}>
              Revisiegeschiedenis ({article.revisions.length})
            </button>
          )}
        </div>
      )}

      {showRevisions && (
        <div style={{ background: "var(--surface-1)", borderRadius: 10, padding: 12, marginBottom: 16 }}>
          {article.revisions.map((rev, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{rev.title}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>
                  {new Date(rev.edited_at).toLocaleString("nl-NL")}
                </p>
              </div>
              <button onClick={() => restoreRevision(rev)} style={{ width: "auto", padding: "4px 10px", fontSize: 12, flexShrink: 0 }}>
                Terugzetten
              </button>
            </div>
          ))}
        </div>
      )}

      {isAdmin && !editing && article.status === "pending_review" && (
        <div className="actions" style={{ marginBottom: 10, alignItems: "center" }}>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            style={{ flex: "none", width: "auto" }}
          />
          <button disabled={busy} onClick={handleSchedule}>Inplannen</button>
        </div>
      )}

      {isAdmin && !editing && article.status === "scheduled" && (
        <div className="actions" style={{ marginBottom: 10 }}>
          <button disabled={busy} onClick={() => act("unschedule")}>Planning annuleren</button>
        </div>
      )}

      <div className="actions">
        {editing ? (
          <button className="primary" disabled={busy} onClick={saveEdit}>
            Wijzigingen opslaan
          </button>
        ) : article.status === "published" ? (
          <>
            <button disabled={busy} onClick={() => setEditing(true)}>Bewerken</button>
            {isAdmin && <button disabled={busy} onClick={() => act("unpublish")}>Depubliceren</button>}
            {isAdmin && <button disabled={busy} onClick={() => act("archive")}>Archiveren</button>}
            {isAdmin && <button className="danger" disabled={busy} onClick={remove}>Verwijderen</button>}
          </>
        ) : article.status === "archived" ? (
          <>
            {isAdmin && <button className="primary" disabled={busy} onClick={() => act("unarchive")}>Terug naar gepubliceerd</button>}
            {isAdmin && <button className="danger" disabled={busy} onClick={remove}>Verwijderen</button>}
          </>
        ) : article.status === "approved" ? (
          <>
            <button disabled={busy} onClick={() => setEditing(true)}>Bewerken</button>
            {isAdmin && <button className="primary" disabled={busy} onClick={() => act("publish")}>Publiceren</button>}
          </>
        ) : (
          <>
            <button disabled={busy} onClick={() => setEditing(true)}>Bewerken</button>
            {isAdmin && <button className="danger" disabled={busy} onClick={() => act("reject")}>Afkeuren</button>}
            {isAdmin && <button className="primary" disabled={busy} onClick={() => act("approve")}>Goedkeuren</button>}
          </>
        )}
      </div>
    </div>
  );
}

function statusLabel(status) {
  return {
    published: "Gepubliceerd",
    pending_review: "Te reviewen",
    approved: "Goedgekeurd",
    rejected: "Afgekeurd",
    scheduled: "Gepland",
    archived: "Gearchiveerd",
  }[status] || status;
}
