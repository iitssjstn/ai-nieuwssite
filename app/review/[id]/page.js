"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ReviewDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [article, setArticle] = useState(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then((r) => r.json())
      .then((a) => {
        setArticle(a);
        setTitle(a.title);
        setBody(a.body);
      });
  }, [id]);

  async function act(action, extra = {}) {
    setBusy(true);
    const res = await fetch(`/api/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reviewer_id: "jij", ...extra }),
    });
    const updated = await res.json();
    setBusy(false);
    if (action === "approve" || action === "reject" || action === "unpublish") {
      router.push("/review");
    } else {
      setArticle(updated);
      setEditing(false);
    }
  }

  async function remove() {
    if (!confirm("Dit artikel definitief verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;
    setBusy(true);
    await fetch(`/api/articles/${id}`, { method: "DELETE" });
    router.push("/review/published");
  }

  if (!article) return <div className="container">Laden...</div>;

  const backHref = article.status === "published" ? "/review/published" : "/review";
  const backLabel = article.status === "published" ? "← Terug naar gepubliceerd" : "← Terug naar wachtrij";

  return (
    <div className="container">
      <Link href={backHref} style={{ fontSize: 13, color: "var(--text-secondary)" }}>{backLabel}</Link>

      <div className="review-columns" style={{ marginTop: 20 }}>
        <div className="review-col source">
          <p className="label">Bron — {article.source_id}</p>
          <p className="body-text">{article.source_raw_text}</p>
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
              <textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
            </>
          ) : (
            <>
              <p style={{ fontWeight: 500, fontSize: 15, margin: "0 0 6px" }}>{article.title}</p>
              <p className="body-text">{article.body}</p>
            </>
          )}
        </div>
      </div>

      <div className="flags">
        <span className="badge badge-muted">{statusLabel(article.status)}</span>
        {article.breaking && <span className="flag flag-warn">🔴 Breaking</span>}
        {article.status === "published" && (
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

      <div className="actions" style={{ marginBottom: 10 }}>
        <button disabled={busy} onClick={() => act("toggle_breaking")}>
          {article.breaking ? "Breaking-status verwijderen" : "Als breaking news markeren"}
        </button>
      </div>

      <div className="actions">
        {editing ? (
          <button className="primary" disabled={busy} onClick={() => act("edit", { title, articleBody: body })}>
            Wijzigingen opslaan
          </button>
        ) : article.status === "published" ? (
          <>
            <button disabled={busy} onClick={() => setEditing(true)}>Bewerken</button>
            <button disabled={busy} onClick={() => act("unpublish")}>Depubliceren</button>
            <button className="danger" disabled={busy} onClick={remove}>Verwijderen</button>
          </>
        ) : (
          <>
            <button disabled={busy} onClick={() => setEditing(true)}>Bewerken</button>
            <button className="danger" disabled={busy} onClick={() => act("reject")}>Afkeuren</button>
            <button className="primary" disabled={busy} onClick={() => act("approve")}>Publiceren</button>
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
    rejected: "Afgekeurd",
  }[status] || status;
}
