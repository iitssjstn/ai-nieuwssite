import { NextResponse } from "next/server";
import { getArticle, updateArticle, deleteArticle, addReviewLogEntry } from "@/lib/db";

export async function GET(request, { params }) {
  const article = getArticle(params.id);
  if (!article) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  return NextResponse.json(article);
}

// action: "approve" | "reject" | "edit" | "unpublish"
export async function PATCH(request, { params }) {
  const body = await request.json();
  const { action, title, articleBody, featuredImage, reviewer_id } = body;

  const existing = getArticle(params.id);
  if (!existing) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  let updates = {};
  let logAction = action;

  if (action === "approve") {
    updates = {
      status: "published",
      reviewer_id: reviewer_id || "onbekend",
      reviewed_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
    };
  } else if (action === "reject") {
    updates = {
      status: "rejected",
      reviewer_id: reviewer_id || "onbekend",
      reviewed_at: new Date().toISOString(),
    };
  } else if (action === "unpublish") {
    updates = {
      status: "pending_review",
      published_at: null,
    };
  } else if (action === "toggle_breaking") {
    updates = { breaking: !existing.breaking };
  } else if (action === "edit") {
    updates = {
      title: title ?? existing.title,
      body: articleBody ?? existing.body,
      featured_image: featuredImage !== undefined ? featuredImage : existing.featured_image,
    };
  } else {
    return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
  }

  const updated = updateArticle(params.id, updates);
  addReviewLogEntry({
    article_id: params.id,
    action: logAction,
    diff: action === "edit" ? "titel/body aangepast" : null,
  });

  return NextResponse.json(updated);
}

export async function DELETE(request, { params }) {
  const existing = getArticle(params.id);
  if (!existing) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  deleteArticle(params.id);
  addReviewLogEntry({ article_id: params.id, action: "delete", diff: null });

  return NextResponse.json({ success: true });
}
