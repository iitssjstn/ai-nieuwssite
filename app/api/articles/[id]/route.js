import { NextResponse } from "next/server";
import { getArticle, updateArticle, editArticleWithRevision, deleteArticle, addReviewLogEntry, addLiveblogUpdate, deleteLiveblogUpdate } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { computeReadability } from "@/lib/readability";
import { triggerWebhooks } from "@/lib/webhooks";

// Acties die alleen een admin mag uitvoeren — een redacteur mag artikelen
// aanmaken/bewerken/inleveren, maar niet zelf goedkeuren/publiceren/afkeuren.
const ADMIN_ONLY_ACTIONS = [
  "approve", "publish", "reject", "unpublish",
  "schedule", "unschedule", "archive", "unarchive", "toggle_breaking", "toggle_featured",
];

export async function GET(request, { params }) {
  const article = getArticle(params.id);
  if (!article) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  return NextResponse.json({ ...article, readability: computeReadability(article.body) });
}

// action: "approve" | "publish" | "reject" | "edit" | "unpublish" |
//         "toggle_breaking" | "schedule" | "unschedule" | "archive" | "unarchive"
export async function PATCH(request, { params }) {
  const session = await getSessionFromRequest(request);
  const body = await request.json();
  const { action, title, articleBody, featuredImage, featuredImageCredit, tags, scheduledAt, liveblogText, updateId, location, pollId } = body;

  if (ADMIN_ONLY_ACTIONS.includes(action) && session?.role !== "admin") {
    return NextResponse.json({ error: "Alleen voor admins" }, { status: 403 });
  }

  const existing = getArticle(params.id);
  if (!existing) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const reviewer = session?.username || "onbekend";
  let updated;
  let diff = null;

  if (action === "approve") {
    // Goedkeuren ≠ publiceren: het artikel wacht daarna nog op de losse
    // publiceer-stap (of kan direct aansluitend gepubliceerd worden).
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
      return NextResponse.json({ error: "scheduledAt is verplicht" }, { status: 400 });
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
      return NextResponse.json({ error: "Tekst voor de update is verplicht" }, { status: 400 });
    }
    updated = addLiveblogUpdate(params.id, { text: liveblogText.trim(), author: reviewer });
  } else if (action === "delete_liveblog_update") {
    if (!updateId) {
      return NextResponse.json({ error: "updateId is verplicht" }, { status: 400 });
    }
    updated = deleteLiveblogUpdate(params.id, updateId);
  } else if (action === "edit") {
    updated = editArticleWithRevision(params.id, {
      title,
      body: articleBody,
      featured_image: featuredImage,
      featured_image_credit: featuredImageCredit,
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
  } else {
    return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
  }

  addReviewLogEntry({ article_id: params.id, action, diff, by: reviewer });
  return NextResponse.json(updated);
}

export async function DELETE(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Alleen voor admins" }, { status: 403 });
  }

  const existing = getArticle(params.id);
  if (!existing) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  deleteArticle(params.id);
  addReviewLogEntry({ article_id: params.id, action: "delete", diff: null, by: session.username });

  return NextResponse.json({ success: true });
}
