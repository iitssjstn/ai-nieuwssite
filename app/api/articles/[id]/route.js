import { NextResponse } from "next/server";
import { getArticle, updateArticle, editArticleWithRevision, deleteArticle, addReviewLogEntry, addLiveblogUpdate, deleteLiveblogUpdate, getSiteSettings } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { computeReadability } from "@/lib/readability";
import { triggerWebhooks } from "@/lib/webhooks";
import { pingIndexNow, submitUrlToBing } from "@/lib/indexnow";

// Voor IndexNow/Bing MOET dit de publieke hoofddomein-URL zijn (bijv.
// "https://novapers.nl"), nooit afgeleid van het inkomende request — deze
// route draait namelijk ook op admin.novapers.nl, en request.headers.get
// ("host") zou daar dus per ongeluk het admin-subdomein opleveren. Bij
// het ontbreken van de instelling (nog niet ingevuld) wordt de host van
// het huidige request als beste-poging-terugval gebruikt, zodat pings nog
// steeds iets doen zolang de instelling niet is ingevuld — al kan dat dus
// per ongeluk het admin-subdomein zijn.
function getPublicBaseUrl(request) {
  const configured = getSiteSettings().site_url;
  if (configured) return configured;
  const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
  return `${proto}://${request.headers.get("host")}`;
}

// Actions only an admin may perform — an editor may create/edit/submit
// articles, but not approve/publish/reject them.
const ADMIN_ONLY_ACTIONS = [
  "approve", "publish", "reject", "unpublish",
  "schedule", "unschedule", "archive", "unarchive", "toggle_breaking", "toggle_featured",
  "apply_pending_update", "dismiss_pending_update",
];

export async function GET(request, { params }) {
  const article = getArticle(params.id);
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...article, readability: computeReadability(article.body) });
}

// action: "approve" | "publish" | "reject" | "edit" | "unpublish" |
//         "toggle_breaking" | "schedule" | "unschedule" | "archive" | "unarchive"
export async function PATCH(request, { params }) {
  const session = await getSessionFromRequest(request);
  const body = await request.json();
  const { action, title, articleBody, featuredImage, featuredImageCredit, tags, scheduledAt, liveblogText, updateId, location, pollId, category, claimIndex, claim } = body;

  if (ADMIN_ONLY_ACTIONS.includes(action) && session?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const existing = getArticle(params.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reviewer = session?.username || "unknown";
  let updated;
  let diff = null;

  if (action === "approve") {
    // Approving ≠ publishing: the article then still awaits the separate
    // publish step (or can be published immediately after).
    updated = updateArticle(params.id, {
      status: "approved",
      reviewer_id: reviewer,
      reviewed_at: new Date().toISOString(),
    });
  } else if (action === "publish") {
    updated = updateArticle(params.id, {
      status: "published",
      published_at: new Date().toISOString(),
    });
    triggerWebhooks("article.published", updated).catch(() => {});
    pingIndexNow(getPublicBaseUrl(request), `${getPublicBaseUrl(request)}/artikel/${updated.slug}`);
    submitUrlToBing(getPublicBaseUrl(request), `${getPublicBaseUrl(request)}/artikel/${updated.slug}`);
  } else if (action === "reject") {
    updated = updateArticle(params.id, {
      status: "rejected",
      reviewer_id: reviewer,
      reviewed_at: new Date().toISOString(),
    });
  } else if (action === "unpublish") {
    updated = updateArticle(params.id, { status: "pending_review", published_at: null });
  } else if (action === "archive") {
    updated = updateArticle(params.id, { status: "archived" });
  } else if (action === "unarchive") {
    updated = updateArticle(params.id, { status: "published" });
  } else if (action === "toggle_breaking") {
    updated = updateArticle(params.id, { breaking: !existing.breaking });
  } else if (action === "toggle_featured") {
    // featured_at bewaren zodat meerdere uitgelichte artikelen op volgorde
    // van markeren gesorteerd kunnen worden (nieuwst uitgelicht eerst).
    updated = updateArticle(params.id, {
      featured: !existing.featured,
      featured_at: !existing.featured ? new Date().toISOString() : null,
    });
  } else if (action === "schedule") {
    if (!scheduledAt) {
      return NextResponse.json({ error: "scheduledAt is required" }, { status: 400 });
    }
    updated = updateArticle(params.id, {
      status: "scheduled",
      scheduled_at: scheduledAt,
      published_at: null,
      reviewer_id: reviewer,
      reviewed_at: new Date().toISOString(),
    });
  } else if (action === "unschedule") {
    updated = updateArticle(params.id, { status: "pending_review", scheduled_at: null });
  } else if (action === "toggle_liveblog") {
    updated = updateArticle(params.id, { is_liveblog: !existing.is_liveblog });
  } else if (action === "add_liveblog_update") {
    if (!liveblogText || !liveblogText.trim()) {
      return NextResponse.json({ error: "Text for the update is required" }, { status: 400 });
    }
    updated = addLiveblogUpdate(params.id, { text: liveblogText.trim(), author: reviewer });
  } else if (action === "delete_liveblog_update") {
    if (!updateId) {
      return NextResponse.json({ error: "updateId is required" }, { status: 400 });
    }
    updated = deleteLiveblogUpdate(params.id, updateId);
  } else if (action === "edit") {
    updated = editArticleWithRevision(params.id, {
      title,
      body: articleBody,
      featured_image: featuredImage,
      featured_image_credit: featuredImageCredit,
      category,
    });
    if (tags !== undefined) {
      updated = updateArticle(params.id, { tags });
    }
    if (location !== undefined) {
      updated = updateArticle(params.id, { location });
    }
    if (pollId !== undefined) {
      updated = updateArticle(params.id, { poll_id: pollId || null });
    }
    diff = "titel/body/afbeelding/tags aangepast";
  } else if (action === "apply_pending_update") {
    if (!existing.pending_update) {
      return NextResponse.json({ error: "Geen voorgestelde update aanwezig" }, { status: 400 });
    }
    editArticleWithRevision(params.id, { title: existing.title, body: existing.pending_update.updated_body });
    updated = updateArticle(params.id, {
      updated_at: new Date().toISOString(),
      last_update_summary: existing.pending_update.update_summary,
      pending_update: null,
    });
    triggerWebhooks("article.updated", updated).catch(() => {});
    pingIndexNow(getPublicBaseUrl(request), `${getPublicBaseUrl(request)}/artikel/${updated.slug}`);
    submitUrlToBing(getPublicBaseUrl(request), `${getPublicBaseUrl(request)}/artikel/${updated.slug}`);
  } else if (action === "update_claim") {
    if (!Number.isInteger(claimIndex) || claimIndex < 0) {
      return NextResponse.json({ error: "claimIndex is required" }, { status: 400 });
    }
    const currentClaims = existing.claims || [];
    if (claimIndex >= currentClaims.length) {
      return NextResponse.json({ error: "Claim not found" }, { status: 400 });
    }
    const newClaims = currentClaims.map((c, i) =>
      i === claimIndex ? { ...c, ...claim, manually_reviewed: true } : c
    );
    updated = updateArticle(params.id, { claims: newClaims });
    diff = `claim ${claimIndex + 1} handmatig aangepast`;
  } else if (action === "dismiss_pending_update") {
    updated = updateArticle(params.id, { pending_update: null });
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  addReviewLogEntry({ article_id: params.id, action, diff, by: reviewer });
  return NextResponse.json(updated);
}

export async function DELETE(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const existing = getArticle(params.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  deleteArticle(params.id);
  addReviewLogEntry({ article_id: params.id, action: "delete", diff: null, by: session.username });

  return NextResponse.json({ success: true });
}
