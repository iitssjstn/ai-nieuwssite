"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import RichEditor from "../../components/RichEditor";
import ArticleBody from "../../components/ArticleBody";
import ShareButtons from "../../components/ShareButtons";
import { useConfirmDialog } from "../../components/ConfirmDialog";
import { plainTextToHtml, formatImageCredit } from "@/lib/content";

export default function ReviewDetail() {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { id } = useParams();
  const router = useRouter();
  const [article, setArticle] = useState(null);
  const [me, setMe] = useState(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("Overig");
  const [body, setBody] = useState("");
  const [featuredImage, setFeaturedImage] = useState(null);
  const [featuredImageCredit, setFeaturedImageCredit] = useState(null);
  const [searchingPhoto, setSearchingPhoto] = useState(false);
  const [photoOptions, setPhotoOptions] = useState(null);
  const [tagsInput, setTagsInput] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingClaimIndex, setEditingClaimIndex] = useState(null);
  const [claimTextDraft, setClaimTextDraft] = useState("");
  const [uploadingFeatured, setUploadingFeatured] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState(null);
  const [showRevisions, setShowRevisions] = useState(false);
  const [titleVariants, setTitleVariants] = useState(null);
  const [loadingTitles, setLoadingTitles] = useState(false);
  const [extraContent, setExtraContent] = useState(null);
  const [extraContentLoading, setExtraContentLoading] = useState(null);
  const [showExtras, setShowExtras] = useState(false);
  const [translateLang, setTranslateLang] = useState("en");
  const [liveblogText, setLiveblogText] = useState("");
  const [postingUpdate, setPostingUpdate] = useState(false);
  const [pollIdInput, setPollIdInput] = useState("");
  const [locationInput, setLocationInput] = useState({ lat: "", lng: "", label: "" });
  const [geocoding, setGeocoding] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewWidth, setPreviewWidth] = useState("desktop");

  const lastSaved = useRef({ title: "", body: "", featuredImage: null });
  const autosaveTimer = useRef(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then(setMe).catch(() => {});
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then((r) => r.json())
      .then((a) => {
        setArticle(a);
        setTitle(a.title);
        setCategory(a.category || "Overig");
        setBody(plainTextToHtml(a.body));
        setFeaturedImage(a.featured_image || null);
        setFeaturedImageCredit(a.featured_image_credit || null);
        setTagsInput((a.tags || []).join(", "));
        setPollIdInput(a.poll_id || "");
        setLocationInput(a.location || { lat: "", lng: "", label: "" });
        lastSaved.current = { title: a.title, body: plainTextToHtml(a.body), featuredImage: a.featured_image || null, category: a.category || "Overig" };
      });
  }, [id]);

  useEffect(() => {
    if (!editing) return;
    clearTimeout(autosaveTimer.current);
    const changed =
      title !== lastSaved.current.title ||
      body !== lastSaved.current.body ||
      featuredImage !== lastSaved.current.featuredImage ||
      category !== lastSaved.current.category;
    if (!changed) return;

    autosaveTimer.current = setTimeout(async () => {
      setAutosaveStatus("Opslaan...");
      const res = await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit", title, articleBody: body, featuredImage, category }),
      });
      if (res.ok) {
        lastSaved.current = { title, body, featuredImage, category };
        setAutosaveStatus("Auto-saved · " + new Date().toLocaleTimeString("en-US"));
      } else {
        setAutosaveStatus("Auto-save failed");
      }
    }, 4000);

    return () => clearTimeout(autosaveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, featuredImage, category, editing]);

  function categoryStyle(name) {
    const c = categories.find((c) => c.name === name);
    return c ? { background: c.color + "22", color: c.color } : undefined;
  }

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
      alert(data.error || "Action failed");
      return;
    }
    const updated = await res.json();
    setBusy(false);
    if (["reject", "unpublish", "schedule", "unschedule", "archive"].includes(action)) {
      router.push("/review/queue");
    } else {
      setArticle(updated);
      setEditing(false);
    }
  }

  async function remove() {
    if (!(await confirm("Permanently delete this article? This cannot be undone."))) return;
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
    const location = locationInput.lat && locationInput.lng ? locationInput : null;
    await act("edit", { title, articleBody: body, featuredImage, featuredImageCredit, tags, pollId: pollIdInput, location, category });
  }

  async function handleGeocode() {
    if (!locationInput.label?.trim()) return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationInput.label)}&format=json&limit=1`,
        { headers: { "Accept-Language": "nl" } }
      );
      const results = await res.json();
      if (!results[0]) throw new Error("Location not found");
      setLocationInput({ label: locationInput.label, lat: results[0].lat, lng: results[0].lon });
    } catch (err) {
      alert("Location lookup failed: " + err.message);
    } finally {
      setGeocoding(false);
    }
  }

  async function handleSearchStockPhoto() {
    setSearchingPhoto(true);
    setPhotoOptions(null);
    try {
      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: title, multiple: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhotoOptions(data.options);
    } catch (err) {
      alert("Stock photo search failed: " + err.message);
    } finally {
      setSearchingPhoto(false);
    }
  }

  function choosePhoto(option) {
    setFeaturedImage(option.url);
    setFeaturedImageCredit({ name: option.credit_name, url: option.credit_url, source: option.source, alt: option.alt || null });
    setPhotoOptions(null);
    if (option.source === "Unsplash" && option.confirmUrl) {
      fetch("/api/generate/image/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmUrl: option.confirmUrl, source: option.source }),
      }).catch(() => {});
    }
  }

  function handleSchedule() {
    if (!scheduledAt) {
      alert("Choose a date and time first.");
      return;
    }
    act("schedule", { scheduledAt: new Date(scheduledAt).toISOString() });
  }

  async function restoreRevision(rev) {
    if (!(await confirm("Restore this older version? Your current draft will be kept in the history.", { danger: false, confirmLabel: "Restore" }))) return;
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
      // A self-uploaded photo has no stock photo source — otherwise the
      // credit of a previously auto-found photo would incorrectly remain.
      setFeaturedImageCredit(null);
    } catch (err) {
      alert("Featured image upload failed: " + err.message);
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

  async function handleExtraContent(kind, extraBody = {}) {
    setExtraContentLoading(kind);
    try {
      const res = await fetch(`/api/generate/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: article.title, body: article.body, ...extraBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setExtraContent({ kind, data });
    } catch (err) {
      alert("Genereren mislukt: " + err.message);
    } finally {
      setExtraContentLoading(null);
    }
  }

  async function handlePostUpdate() {
    if (!liveblogText.trim()) return;
    setPostingUpdate(true);
    const res = await fetch(`/api/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_liveblog_update", liveblogText }),
    });
    setPostingUpdate(false);
    if (res.ok) {
      const updated = await res.json();
      setArticle(updated);
      setLiveblogText("");
    } else {
      alert("Update plaatsen mislukt");
    }
  }

  async function handleDeleteUpdate(updateId) {
    if (!(await confirm("Delete this update?"))) return;
    const res = await fetch(`/api/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_liveblog_update", updateId }),
    });
    if (res.ok) {
      const updated = await res.json();
      setArticle(updated);
    }
  }

  if (!article) return <div className="container">Laden...</div>;
  const isAdmin = me?.role === "admin";

  const backHref = article.status === "published" || article.status === "archived" ? "/review/published" : "/review/queue";
  const backLabel = article.status === "published" || article.status === "archived" ? "← Back to published" : "← Back to queue";

  return (
    <div className="container">
      {ConfirmDialog}
      <Link href={backHref} style={{ fontSize: 13, color: "var(--text-secondary)" }}>{backLabel}</Link>

      {article.possible_duplicate && (
        <div style={{ background: "#412402", color: "#f0b154", borderRadius: 8, padding: "10px 14px", margin: "16px 0", fontSize: 13 }}>
          ⚠ Mogelijk duplicaat ({article.possible_duplicate.score}% gelijkenis) van{" "}
          <Link href={`/review/${article.possible_duplicate.id}`} style={{ color: "inherit", textDecoration: "underline" }}>
            "{article.possible_duplicate.title}"
          </Link>
        </div>
      )}

      {article.pending_update && (
        <div style={{ background: "var(--accent-bg)", color: "var(--accent-text)", borderRadius: 8, padding: "12px 14px", margin: "16px 0", fontSize: 13 }}>
          <p style={{ margin: "0 0 6px", fontWeight: 500 }}>
            🔔 New information found — article can be updated
          </p>
          <p style={{ margin: "0 0 10px" }}>
            {article.pending_update.update_summary} (bron: {article.pending_update.source_name},
            confidence {Math.round(article.pending_update.confidence_score * 100)}%)
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => act("apply_pending_update")} disabled={busy} className="primary" style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
              Apply Update
            </button>
            <button onClick={() => act("dismiss_pending_update")} disabled={busy} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
              Dismiss
            </button>
          </div>
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

      {article.ai_verification_notes?.length > 0 && (
        <div style={{ background: "#412402", color: "#f0b154", borderRadius: 8, padding: "10px 14px", margin: "16px 0", fontSize: 13 }}>
          <p style={{ margin: "0 0 6px", fontWeight: 500 }}>🔎 AI-verificatiestap vond en corrigeerde het volgende:</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {article.ai_verification_notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {article.claims?.length > 0 && (
        <div style={{ background: "var(--surface-1)", borderRadius: 8, padding: "10px 14px", margin: "16px 0", fontSize: 13 }}>
          <p style={{ margin: "0 0 8px", fontWeight: 500 }}>🔍 Claim-verificatie</p>
          <p style={{ margin: "0 0 10px", color: "var(--text-muted)", fontSize: 12 }}>
            Click the icon to manually toggle the status, or the text to correct it.
          </p>
          {article.claims.map((c, i) => (
            <div key={i} style={{ margin: "6px 0", display: "flex", alignItems: "flex-start", gap: 6 }}>
              <button
                onClick={() => act("update_claim", { claimIndex: i, claim: { verified: !c.verified } })}
                disabled={busy}
                title={c.verified ? "Mark as unverified" : "Mark as verified"}
                style={{ width: "auto", padding: "2px 6px", fontSize: 14, flexShrink: 0, background: "transparent", border: "none", cursor: "pointer" }}
              >
                {c.verified ? "✅" : "⚠️"}
              </button>
              {editingClaimIndex === i ? (
                <span style={{ flex: 1, display: "flex", gap: 6 }}>
                  <input
                    type="text"
                    value={claimTextDraft}
                    onChange={(e) => setClaimTextDraft(e.target.value)}
                    style={{ flex: 1, fontSize: 13, padding: "4px 8px" }}
                    autoFocus
                  />
                  <button
                    onClick={async () => {
                      await act("update_claim", { claimIndex: i, claim: { text: claimTextDraft } });
                      setEditingClaimIndex(null);
                    }}
                    disabled={busy}
                    style={{ width: "auto", padding: "4px 10px", fontSize: 12 }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingClaimIndex(null)}
                    style={{ width: "auto", padding: "4px 10px", fontSize: 12 }}
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <span
                  onClick={() => { setEditingClaimIndex(i); setClaimTextDraft(c.text); }}
                  style={{ cursor: "pointer" }}
                  title="Click to edit"
                >
                  {c.text}
                  {c.confirmed_by_sources > 1 && (
                    <span style={{ color: "var(--text-muted)" }}> — confirmed by {c.confirmed_by_sources} sources</span>
                  )}
                  {c.manually_reviewed && (
                    <span style={{ color: "var(--success-text)", fontSize: 11 }}> · handmatig gecontroleerd</span>
                  )}
                </span>
              )}
            </div>
          ))}
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
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Additional sources (fact-check):</p>
              {article.additional_sources.map((s, i) => (
                <p key={i} style={{ fontSize: 13, margin: "2px 0" }}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-text)" }}>
                      🔗 {s.name || `Bron ${i + 2}`}
                    </a>
                  ) : (
                    <span>{s.name || `Source ${i + 2}`} (no link provided)</span>
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

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ marginBottom: 10, padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
              >
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>

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
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Featured image</p>
                {featuredImage && (
                  <>
                    <img src={featuredImage} alt="" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 6, display: "block" }} />
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                      <input
                        type="text"
                        placeholder="Creator name (optional — auto-fills for a stock photo)"
                        value={featuredImageCredit?.name || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFeaturedImageCredit(value ? { ...(featuredImageCredit || {}), name: value } : null);
                        }}
                        style={{ marginBottom: 0, flex: 1 }}
                      />
                      {featuredImageCredit && (
                        <button
                          type="button"
                          onClick={() => setFeaturedImageCredit(null)}
                          style={{ width: "auto", padding: "8px 10px", fontSize: 12 }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {featuredImageCredit?.source && (
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: -4, marginBottom: 8 }}>
                        Bron: {featuredImageCredit.source} (automatisch ingevuld)
                      </p>
                    )}
                  </>
                )}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFeaturedUpload} disabled={uploadingFeatured} />
                  <button type="button" onClick={handleSearchStockPhoto} disabled={searchingPhoto} style={{ width: "auto", padding: "5px 10px", fontSize: 12 }}>
                    {searchingPhoto ? "Working..." : "🔍 Search new stock photos"}
                  </button>
                </div>

                {photoOptions && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 10 }}>
                    {photoOptions.map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => choosePhoto(opt)}
                        style={{ padding: 0, border: "2px solid transparent", borderRadius: 6, overflow: "hidden", cursor: "pointer" }}
                        title={`${opt.credit_name} via ${opt.source}`}
                      >
                        <img src={opt.thumb} alt="" style={{ width: "100%", height: 70, objectFit: "cover", display: "block" }} />
                      </button>
                    ))}
                  </div>
                )}
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

              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Poll-ID (optioneel, uit Polls-pagina)</p>
                <input
                  type="text"
                  placeholder="Paste a poll ID here"
                  value={pollIdInput}
                  onChange={(e) => setPollIdInput(e.target.value)}
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Location (for the news map, optional)</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <input
                    type="text"
                    placeholder="Plaatsnaam (bijv. Vaassen)"
                    value={locationInput.label || ""}
                    onChange={(e) => setLocationInput((l) => ({ ...l, label: e.target.value }))}
                  />
                  <button type="button" onClick={handleGeocode} disabled={geocoding} style={{ width: "auto", padding: "5px 10px", fontSize: 12 }}>
                    {geocoding ? "..." : "Opzoeken"}
                  </button>
                </div>
                {locationInput.lat && locationInput.lng && (
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Coördinaten: {locationInput.lat}, {locationInput.lng}{" "}
                    <button type="button" onClick={() => setLocationInput({ lat: "", lng: "", label: "" })} style={{ width: "auto", padding: "0 4px", fontSize: 11, background: "none", border: "none", color: "var(--danger-text)" }}>
                      ✕ wissen
                    </button>
                  </p>
                )}
              </div>

              {autosaveStatus && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>{autosaveStatus}</p>
              )}
            </>
          ) : (
            <>
              <p style={{ fontWeight: 500, fontSize: 15, margin: "0 0 6px" }}>{article.title}</p>
              {article.featured_image && (
                <>
                  <img src={article.featured_image} alt="" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 4, display: "block" }} />
                  {article.featured_image_credit && formatImageCredit(article.featured_image_credit) && (
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                      {formatImageCredit(article.featured_image_credit)}
                    </p>
                  )}
                </>
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
            Scheduled: {new Date(article.scheduled_at).toLocaleString("en-US")}
          </span>
        )}
        {article.breaking && <span className="flag flag-warn">🔴 Breaking</span>}
        {article.featured && <span className="badge badge-muted">★ Featured</span>}
        {(article.status === "published" || article.status === "archived") && (
          <span className="badge badge-muted">{article.views || 0} views</span>
        )}
        <span className={`flag ${article.flags?.figures_verified === false ? "flag-warn" : "flag-ok"}`}>
          {article.flags?.figures_verified === false ? "Cijfer wijkt af van bron" : "Cijfer matcht bron"}
        </span>
        <span className={`flag ${article.flags?.quote_unverified ? "flag-warn" : "flag-ok"}`}>
          {article.flags?.quote_unverified ? "Quote not found in source" : "No unverified quotes"}
        </span>
        <span className="flag flag-ok">
          Confidence: {article.confidence_score != null ? Math.round(article.confidence_score * 100) + "%" : "-"}
        </span>
        {article.generated_by && (
          <span className="badge badge-muted">via {article.generated_by}</span>
        )}
        {article.readability && (
          <span className="badge badge-muted">📖 {article.readability.label} ({article.readability.score})</span>
        )}
      </div>

      {article.status === "published" && (
        <div style={{ marginBottom: 16 }}>
          <ShareButtons slug={article.slug} title={article.title} />
        </div>
      )}

      {isAdmin && (
        <div className="actions" style={{ marginBottom: 10 }}>
          <button disabled={busy} onClick={() => act("toggle_breaking")}>
            {article.breaking ? "Remove breaking status" : "Mark as breaking news"}
          </button>
          <button disabled={busy} onClick={() => act("toggle_featured")}>
            {article.featured ? "★ Featured (op hoofdpagina)" : "Uitlichten op hoofdpagina"}
          </button>
          {article.revisions?.length > 0 && (
            <button disabled={busy} onClick={() => setShowRevisions((s) => !s)}>
              Revisiegeschiedenis ({article.revisions.length})
            </button>
          )}
          <button disabled={busy} onClick={() => setShowExtras((s) => !s)}>
            Generate Extra Content
          </button>
          <button disabled={busy} onClick={() => act("toggle_liveblog")}>
            {article.is_liveblog ? "Liveblog uitzetten" : "Als liveblog markeren"}
          </button>
          <button disabled={busy} onClick={() => setShowPreview((s) => !s)}>
            👁 Voorbeeld
          </button>
        </div>
      )}

      {showPreview && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {[
              { id: "desktop", label: "Desktop", width: "100%" },
              { id: "tablet", label: "Tablet", width: 768 },
              { id: "mobile", label: "Mobiel", width: 375 },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setPreviewWidth(d.id)}
                style={{
                  width: "auto", padding: "5px 12px", fontSize: 12,
                  background: previewWidth === d.id ? "var(--accent-bg)" : "transparent",
                  color: previewWidth === d.id ? "var(--accent-text)" : "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div style={{ background: "#f4f3ef", borderRadius: 10, padding: 20, display: "flex", justifyContent: "center" }}>
            <div
              style={{
                width: previewWidth === "desktop" ? "100%" : previewWidth === "tablet" ? 768 : 375,
                maxWidth: "100%",
                background: "#fff",
                borderRadius: 8,
                padding: 24,
                color: "#1c1c1a",
              }}
            >
              <span className="badge" style={categoryStyle(article.category)}>{article.category}</span>
              <h1 style={{ fontSize: previewWidth === "mobile" ? 20 : 26, margin: "10px 0", color: "#1c1c1a" }}>
                {editing ? title : article.title}
              </h1>
              {(editing ? featuredImage : article.featured_image) && (
                <img
                  src={editing ? featuredImage : article.featured_image}
                  alt=""
                  style={{ width: "100%", borderRadius: 8, marginBottom: 16 }}
                />
              )}
              <div style={{ color: "#1c1c1a", fontSize: 15, lineHeight: 1.7 }}>
                <ArticleBody body={editing ? body : article.body} />
              </div>
            </div>
          </div>
        </div>
      )}

      {article.is_liveblog && (
        <div style={{ background: "var(--surface-1)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>🔴 Liveblog-updates</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input
              type="text"
              placeholder="Nieuwe update..."
              value={liveblogText}
              onChange={(e) => setLiveblogText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePostUpdate()}
            />
            <button onClick={handlePostUpdate} disabled={postingUpdate} className="primary" style={{ width: "auto", padding: "8px 16px" }}>
              {postingUpdate ? "..." : "Plaatsen"}
            </button>
          </div>
          {(article.liveblog_updates || []).map((u) => (
            <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <div>
                <p style={{ fontSize: 13, margin: 0 }}>{u.text}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>
                  {new Date(u.created_at).toLocaleString("en-US")} · {u.author}
                </p>
              </div>
              <button onClick={() => handleDeleteUpdate(u.id)} style={{ width: "auto", padding: "2px 8px", fontSize: 11, color: "var(--danger-text)" }}>
                ✕
              </button>
            </div>
          ))}
          {(article.liveblog_updates || []).length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No updates posted yet.</p>
          )}
        </div>
      )}

      {showExtras && (
        <div style={{ background: "var(--surface-1)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <button disabled={extraContentLoading} onClick={() => handleExtraContent("social")} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
              {extraContentLoading === "social" ? "Bezig..." : "📱 Social-media-posts"}
            </button>
            <button disabled={extraContentLoading} onClick={() => handleExtraContent("push")} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
              {extraContentLoading === "push" ? "Bezig..." : "🔔 Pushmelding"}
            </button>
            <button disabled={extraContentLoading} onClick={() => handleExtraContent("newsletter")} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
              {extraContentLoading === "newsletter" ? "Bezig..." : "✉️ Nieuwsbrief-samenvatting"}
            </button>
            <select value={translateLang} onChange={(e) => setTranslateLang(e.target.value)} style={{ width: "auto" }}>
              <option value="en">Engels</option>
              <option value="de">Duits</option>
              <option value="fr">Frans</option>
              <option value="es">Spaans</option>
            </select>
            <button disabled={extraContentLoading} onClick={() => handleExtraContent("translate", { language: translateLang })} style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
              {extraContentLoading === "translate" ? "Bezig..." : "🌐 Vertalen"}
            </button>
          </div>

          {extraContent && (
            <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
              {extraContent.kind === "social" && (
                <>
                  <ExtraField label="X / Twitter" value={extraContent.data.x} />
                  <ExtraField label="Facebook" value={extraContent.data.facebook} />
                  <ExtraField label="LinkedIn" value={extraContent.data.linkedin} />
                </>
              )}
              {extraContent.kind === "push" && (
                <>
                  <ExtraField label="Pushmelding-titel" value={extraContent.data.push_title} />
                  <ExtraField label="Pushmelding-tekst" value={extraContent.data.push_body} />
                </>
              )}
              {extraContent.kind === "newsletter" && (
                <ExtraField label="Nieuwsbrief-samenvatting" value={extraContent.data.newsletter_summary} />
              )}
              {extraContent.kind === "translate" && (
                <>
                  <ExtraField label={`Titel (${extraContent.data.language})`} value={extraContent.data.title} />
                  <ExtraField label={`Tekst (${extraContent.data.language})`} value={extraContent.data.body} multiline />
                </>
              )}
            </div>
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
                  {new Date(rev.edited_at).toLocaleString("en-US")}
                </p>
              </div>
              <button onClick={() => restoreRevision(rev)} style={{ width: "auto", padding: "4px 10px", fontSize: 12, flexShrink: 0 }}>
                Restore
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
            Save Changes
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
            {isAdmin && <button className="primary" disabled={busy} onClick={() => act("unarchive")}>Back to Published</button>}
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
    published: "Published",
    pending_review: "To Review",
    approved: "Approved",
    rejected: "Rejected",
    scheduled: "Scheduled",
    archived: "Archived",
  }[status] || status;
}

function ExtraField({ label, value, multiline }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{label}</p>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(value || "")}
          style={{ width: "auto", padding: "2px 8px", fontSize: 11 }}
        >
          Copy
        </button>
      </div>
      {multiline ? (
        <p style={{ fontSize: 13, whiteSpace: "pre-wrap", margin: 0 }}>{value}</p>
      ) : (
        <p style={{ fontSize: 13, margin: 0 }}>{value}</p>
      )}
    </div>
  );
}
