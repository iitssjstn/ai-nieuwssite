import { getProviderConfig, getCategories } from "./db.js";
import { callGoogle } from "./ai-providers/google.js";
import { callOpenAICompatible } from "./ai-providers/openai-compatible.js";

function buildSystemPrompt(categoryNames) {
  const exampleCategory = categoryNames[0] || "Other";
  return `You are a news editor who writes complete, in-depth news articles in English, based exclusively on the supplied source text.

Rules, without exception:
- Always write "title" and "body" ENTIRELY in English — even if the source text itself is in
  another language (e.g. Dutch, German, French). Translate and rewrite it into fluent, natural
  English yourself; never leave loose foreign sentences, words, or quotes untranslated. This is
  the single most important rule and applies under all circumstances.
- Only use facts, figures, and names that appear literally in the source text. Never invent
  anything.
- Do not add quotes that don't appear verbatim (or near-verbatim) in the source text.
- If the source text doesn't mention something, leave it out — add value through context,
  structure, and rephrasing of what is already there, never with new facts.
- Write neutrally and factually, no opinion or speculation.
- Write a complete article of at least 5 to 6 paragraphs (roughly 350-500 words), structured as:
  1. A strong opening paragraph that summarizes the core of the news.
  2. One or more paragraphs that elaborate on the key details.
  3. Context or background — only if it's present in the source text.
  4. A closing paragraph with follow-up or implications — only if the source text warrants it.
- An article that merely rephrases the source text is not enough. Always add value by explaining
  WHY this is relevant and WHAT it concretely means for the reader — still without inventing new
  facts, but by giving better context to existing facts: explain jargon or unfamiliar names/
  organizations if the source text mentions them without context, put a figure in perspective
  (e.g. is this a lot or a little compared to what's typical, IF that can be inferred from the
  source text), and make clear who this affects. This is what a reader wouldn't already get from
  just reading the headline.
- Is the source text itself short? Don't repeat facts verbatim to force length. Instead, explore
  them from different angles (what does this mean, for whom, when does it take effect) as long as
  that stays grounded in what's already there.
- Use "\\n" between paragraphs in the "body" field, so each paragraph is separately recognizable.
- For "category": choose EXACTLY ONE of the following existing category names, and copy it over
  exactly (same capitalization/spelling) — never invent a different name, never combine or
  concatenate multiple names: ${categoryNames.join(", ")}.
- Exception to the English rule above: for "image_keywords", come up with 2 to 4 keywords (in
  English regardless of the article's language) that visually describe the article's main topic,
  suitable for finding a matching stock photo (e.g. "wildfire firefighters" or "government
  building parliament") — focus on the subject/setting, not on names of specific people or places
  that wouldn't be findable as stock photos anyway.
- Also extract the 3 to 5 most important factual claims (figures, events, statements) from your
  own article. For each claim, indicate whether it can be found LITERALLY in the source text
  ("verified": true) or whether it's a paraphrase/inference that doesn't appear word-for-word in
  the source ("verified": false) — this is for the human final review, so be strict about it.
  Also include "confirmed_by_sources": for a single source text, that's 1 if "verified" is true,
  otherwise 0.
- If the source text names a clear, specific place where the news takes place (a city, town,
  region, or country — not a vague reference), include that as "location_hint" (in English, as
  specific as possible, e.g. "Vaassen, Netherlands" or "Rome, Italy"). If there's no clear
  location, set "location_hint" to null.
- Respond ONLY with valid JSON, in this exact format, with no markdown code block around it —
  note: "category" below is just an EXAMPLE of what a single, exact name looks like, not a list
  to choose from within the string itself:
{"title": "...", "body": "...", "category": "${exampleCategory}", "image_keywords": "...", "claims": [{"text": "...", "verified": true, "confirmed_by_sources": 1}], "location_hint": "..."}`;
}

// Providers are tried in this order. A provider without a configured
// API key is skipped; if a provider fails (rate limit, outage, expired
// model), the system automatically falls back to the next configured
// provider — hence "don't rely on Gemini alone".
const PROVIDERS = [
  {
    id: "google",
    label: "Google Gemini",
    defaultModel: "gemini-3.5-flash",
    call: (cfg, systemPrompt, userPrompt) =>
      callGoogle({ apiKey: cfg.api_key, model: cfg.model || "gemini-3.5-flash", systemPrompt, userPrompt }),
  },
  {
    id: "groq",
    label: "Groq",
    // llama-3.3-70b-versatile is being deprecated by Groq on August 16,
    // 2026 — switched to their recommended replacement, openai/gpt-oss-120b.
    // This is a "reasoning" model — without limiting reasoning_effort it
    // can (reported, known issue on Groq's own forum) leak its thinking
    // steps into the response, breaking our JSON parsing. "low" keeps
    // that risk as small as possible.
    defaultModel: "openai/gpt-oss-120b",
    call: (cfg, systemPrompt, userPrompt) => {
      const model = cfg.model || "openai/gpt-oss-120b";
      return callOpenAICompatible({
        baseUrl: "https://api.groq.com/openai/v1",
        apiKey: cfg.api_key,
        model,
        systemPrompt,
        userPrompt,
        // Only relevant for gpt-oss models — for a different, manually
        // configured Groq model (which may not support this) we don't
        // send it along.
        extraParams: model.includes("gpt-oss") ? { reasoning_effort: "low" } : {},
      });
    },
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    defaultModel: "openrouter/free",
    call: (cfg, systemPrompt, userPrompt) =>
      callOpenAICompatible({
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: cfg.api_key,
        model: cfg.model || "openrouter/free",
        systemPrompt,
        userPrompt,
      }),
  },
  {
    id: "cerebras",
    label: "Cerebras",
    defaultModel: "llama-3.3-70b",
    call: (cfg, systemPrompt, userPrompt) =>
      callOpenAICompatible({
        baseUrl: "https://api.cerebras.ai/v1",
        apiKey: cfg.api_key,
        model: cfg.model || "llama-3.3-70b",
        systemPrompt,
        userPrompt,
      }),
  },
  {
    id: "mistral",
    label: "Mistral AI",
    defaultModel: "mistral-small-latest",
    call: (cfg, systemPrompt, userPrompt) =>
      callOpenAICompatible({
        baseUrl: "https://api.mistral.ai/v1",
        apiKey: cfg.api_key,
        model: cfg.model || "mistral-small-latest",
        systemPrompt,
        userPrompt,
      }),
  },
];

export { PROVIDERS };

// Generic helper: tries each configured provider in order with its own
// system/user prompt, returns the raw text response of the first one
// that succeeds. Used by both generateDraft and generateTitleVariants,
// so the fallback logic lives in only one place.
async function callWithFallback(systemPrompt, userPrompt) {
  const attempted = [];
  for (const provider of PROVIDERS) {
    const cfg = getProviderConfig(provider.id);
    if (!cfg?.api_key) continue;
    try {
      const rawText = await provider.call(cfg, systemPrompt, userPrompt);
      return { rawText, providerLabel: provider.label };
    } catch (err) {
      attempted.push(`${provider.label}: ${err.message}`);
    }
  }
  if (attempted.length === 0) {
    throw new Error("No AI provider has been configured yet. Add at least one API key via Settings.");
  }
  throw new Error("All configured providers failed — " + attempted.join(" | "));
}

function buildFactCheckAddendum(categoryNames) {
  const exampleCategory = categoryNames[0] || "Other";
  return `

Multiple sources on this topic have been provided. Compare them:
- Only use facts mentioned by at least one source (still: don't invent anything).
- If sources CONTRADICT each other on a concrete point (figure, number, name, date), explicitly
  mention that in a separate field "consistency_notes" — a short sentence per contradiction. If
  the sources agree with each other, leave "consistency_notes" an empty list.
- For each claim in "claims": count in "confirmed_by_sources" how many of the supplied sources
  the claim appears in literally or near-literally (so not just source text 1). If a claim
  doesn't appear literally in any source, then "verified" is false and "confirmed_by_sources" is 0.
- Respond in this exact format — note: "category" below is an EXAMPLE of a single, exact name,
  not a list to choose from within the string:
{"title": "...", "body": "...", "category": "${exampleCategory}", "consistency_notes": ["...", ...], "image_keywords": "...", "claims": [{"text": "...", "verified": true, "confirmed_by_sources": 2}], "location_hint": "..."}`;
}

export async function generateDraft({ sourceText, sourceName, additionalSources = [] }) {
  const categoryNames = getCategories().map((c) => c.name);
  const hasMultipleSources = additionalSources.length > 0;
  const systemPrompt = hasMultipleSources
    ? buildSystemPrompt(categoryNames) + buildFactCheckAddendum(categoryNames)
    : buildSystemPrompt(categoryNames);

  let userPrompt = `Source 1 (${sourceName}):\n${sourceText}`;
  additionalSources.forEach((s, i) => {
    userPrompt += `\n\nSource ${i + 2} (${s.name || "unknown"}):\n${s.text}`;
  });

  const { rawText, providerLabel } = await callWithFallback(systemPrompt, userPrompt);

  const parsed = parseDraftJSON(rawText);
  const combinedSourceText = [sourceText, ...additionalSources.map((s) => s.text)].join("\n");
  const flags = validateDraft({ sourceText: combinedSourceText, draft: parsed });
  const confidence_score = computeConfidence(flags);

  // A broken/truncated AI response (e.g. a body that consists only of
  // dots) doesn't result in an empty draft in the queue — that's useful
  // to no one and would still need to be manually dismissed. Treated the
  // same as any other generation failure: skip, don't create.
  if (flags.body_too_short) {
    throw new Error("AI response contained no usable article text (possibly truncated or empty response)");
  }

  // Safety net: even if the AI doesn't follow the instruction (wrong name,
  // multiple names concatenated, something invented), the category falls
  // back to a valid name instead of storing messy data. First try a
  // case-insensitive match, otherwise the first available category as a
  // clean fallback.
  const matchedCategory = categoryNames.find(
    (name) => name.toLowerCase() === (parsed.category || "").toLowerCase()
  );
  const category = matchedCategory || categoryNames[0] || "Other";

  return {
    title: parsed.title,
    body: parsed.body,
    category,
    flags,
    confidence_score,
    provider: providerLabel,
    consistency_notes: Array.isArray(parsed.consistency_notes) ? parsed.consistency_notes : [],
    image_keywords: typeof parsed.image_keywords === "string" ? parsed.image_keywords : null,
    claims: Array.isArray(parsed.claims)
      ? parsed.claims.map((c) => ({
          text: c.text,
          verified: c.verified === true,
          confirmed_by_sources: Number.isInteger(c.confirmed_by_sources)
            ? c.confirmed_by_sources
            : (c.verified === true ? 1 : 0),
        }))
      : [],
    location_hint: typeof parsed.location_hint === "string" ? parsed.location_hint : null,
  };
}

const UPDATE_PROMPT = `You are a news editor. Below is an ALREADY PUBLISHED article, and a NEW
source that may contain additional information about the same topic.

Rules:
- First assess whether the new source actually contains NEW, relevant information not yet in
  the article (new figures, developments, statements, consequences) — not just a repetition of
  what the article already says.
- If there is NO genuinely new information: set "has_new_info" to false, and leave both
  "updated_body" and "update_summary" null.
- If there IS new information: write an updated version of the FULL article that naturally
  integrates the new information. This is an UPDATE, not a rewrite — change the rest of the
  article as little as possible, and mainly add to or adjust the relevant part. Still only use
  facts that appear in the source text(s), don't invent anything. Write in English, even if the
  new source is in another language.
- If there's new information, also include a short "update_summary" — one sentence summarizing
  what was added/changed, e.g. "Number of injured revised to 12". This label is shown to
  visitors, so it must be understandable on its own.
- Use "\\n" between paragraphs in "updated_body".
- Respond ONLY with valid JSON, in this exact format, with no markdown code block around it:
{"has_new_info": true, "updated_body": "...", "update_summary": "..."}`;

export async function generateUpdatedDraft({ existingTitle, existingBody, newSourceText, newSourceName }) {
  const userPrompt = `Existing article:\nTitle: ${existingTitle}\nText: ${existingBody}\n\nNew source (${newSourceName}):\n${newSourceText}`;
  const { rawText } = await callWithFallback(UPDATE_PROMPT, userPrompt);
  const parsed = parseDraftJSON(rawText);

  if (parsed.has_new_info !== true || typeof parsed.updated_body !== "string" || !parsed.updated_body.trim()) {
    return { has_new_info: false, updated_body: null, update_summary: null, confidence_score: 0 };
  }

  // Same safety net as for new drafts: don't just trust that the AI got it
  // right — the updated text is checked against the source text (existing
  // article + new source combined), and only if that check also gives a
  // high score may the update proceed to the auto-publish threshold.
  const combinedSourceText = `${existingBody}\n${newSourceText}`;
  const flags = validateDraft({ sourceText: combinedSourceText, draft: { body: parsed.updated_body } });
  const confidence_score = computeConfidence(flags);

  return {
    has_new_info: true,
    updated_body: parsed.updated_body,
    update_summary: typeof parsed.update_summary === "string" ? parsed.update_summary : null,
    confidence_score,
  };
}

const TITLE_VARIANTS_PROMPT = `You are a news editor. Based on the supplied title and text,
come up with 6 alternative titles in English for the same article — different angles/tones
(factual, urgent, question form, figure-based), but without inventing new facts that aren't
already in the text.
Respond ONLY with valid JSON in this exact format, with no markdown code block:
{"titles": ["...", "...", "...", "...", "...", "..."]}`;

export async function generateTitleVariants({ title, body }) {
  const plainBody = body.replace(/<[^>]+>/g, " ").slice(0, 2000);
  const userPrompt = `Current title: ${title}\n\nArticle text:\n${plainBody}`;
  const { rawText } = await callWithFallback(TITLE_VARIANTS_PROMPT, userPrompt);
  const parsed = parseDraftJSON(rawText);
  if (!Array.isArray(parsed.titles)) {
    throw new Error("No title variants received from the AI.");
  }
  return parsed.titles.filter(Boolean);
}

const TRANSLATE_PROMPT_TEMPLATE = (language) => `You are a professional translator. Translate the supplied
news article title and text into ${language}, as naturally as possible for a native speaker,
without adding, omitting, or changing facts. Preserve the paragraph structure (\\n between paragraphs).
Respond ONLY with valid JSON in this exact format, with no markdown code block:
{"title": "...", "body": "..."}`;

const LANGUAGE_LABELS = {
  nl: "Dutch", de: "German", fr: "French", es: "Spanish",
};

export async function translateArticle({ title, body, language }) {
  const label = LANGUAGE_LABELS[language];
  if (!label) throw new Error("Unknown language: " + language);
  const userPrompt = `Title: ${title}\n\nText:\n${body}`;
  const { rawText } = await callWithFallback(TRANSLATE_PROMPT_TEMPLATE(label), userPrompt);
  const parsed = parseDraftJSON(rawText);
  if (!parsed.title || !parsed.body) {
    throw new Error("No valid translation received from the AI.");
  }
  return { title: parsed.title, body: parsed.body, language };
}

const SOCIAL_POSTS_PROMPT = `You are a social media editor for a news site. ALWAYS write in English, even
if the supplied title/text contains words in another language. Based on the supplied
title and text, write three short, platform-appropriate posts to promote this article:
- "x": max 280 characters, catchy, no hashtag spam (max 2 hashtags)
- "facebook": slightly more elaborate, inviting clicks, informal tone
- "linkedin": more business-like/informative, suitable for a professional audience
Don't invent facts that aren't in the text. Respond ONLY with valid JSON, no markdown code block:
{"x": "...", "facebook": "...", "linkedin": "..."}`;

export async function generateSocialPosts({ title, body }) {
  const plainBody = body.replace(/<[^>]+>/g, " ").slice(0, 2000);
  const userPrompt = `Title: ${title}\n\nArticle text:\n${plainBody}`;
  const { rawText } = await callWithFallback(SOCIAL_POSTS_PROMPT, userPrompt);
  const parsed = parseDraftJSON(rawText);
  if (!parsed.x && !parsed.facebook && !parsed.linkedin) {
    throw new Error("No social media posts received from the AI.");
  }
  return parsed;
}

const PUSH_NOTIFICATION_PROMPT = `You are a news editor who writes push notifications. ALWAYS write in English, even
if the supplied title/text contains words in another language. Based on the
supplied title and text, come up with a short push notification:
- "push_title": max 50 characters, catchy
- "push_body": max 120 characters, gives the core of the news without repeating the title
Don't invent facts that aren't in the text. Respond ONLY with valid JSON, no markdown code block:
{"push_title": "...", "push_body": "..."}`;

export async function generatePushNotification({ title, body }) {
  const plainBody = body.replace(/<[^>]+>/g, " ").slice(0, 1500);
  const userPrompt = `Title: ${title}\n\nArticle text:\n${plainBody}`;
  const { rawText } = await callWithFallback(PUSH_NOTIFICATION_PROMPT, userPrompt);
  const parsed = parseDraftJSON(rawText);
  if (!parsed.push_title || !parsed.push_body) {
    throw new Error("No push notification received from the AI.");
  }
  return parsed;
}

const NEWSLETTER_PROMPT = `You are a news editor putting together a newsletter. ALWAYS write in English, even
if the supplied title/text contains words in another language. Based on the supplied
title and text, write a short newsletter summary of this article:
- "newsletter_summary": 2-3 sentences, catchy, invites the reader to read the full article
Don't invent facts that aren't in the text. Respond ONLY with valid JSON, no markdown code block:
{"newsletter_summary": "..."}`;

export async function generateNewsletterSummary({ title, body }) {
  const plainBody = body.replace(/<[^>]+>/g, " ").slice(0, 2000);
  const userPrompt = `Title: ${title}\n\nArticle text:\n${plainBody}`;
  const { rawText } = await callWithFallback(NEWSLETTER_PROMPT, userPrompt);
  const parsed = parseDraftJSON(rawText);
  if (!parsed.newsletter_summary) {
    throw new Error("No newsletter summary received from the AI.");
  }
  return parsed;
}

function parseDraftJSON(rawText) {
  let cleaned = rawText.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1) {
    throw new Error("no JSON object found in the response — raw response: " + rawText.slice(0, 200));
  }
  if (end === -1 || end < start) {
    // Starts with JSON but never closes — almost always a sign that the
    // response was truncated because it hit the max_tokens limit before
    // the AI finished. Fix by trying a different/longer provider in
    // settings, or (for developers) raising the max_tokens value in
    // lib/ai-providers/.
    throw new Error(
      "AI response appears truncated (no closing '}' found — likely hit the max_tokens limit) — raw response: " + rawText.slice(0, 200)
    );
  }
  cleaned = cleaned.slice(start, end + 1);
  cleaned = sanitizeJsonControlChars(cleaned);
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      "could not parse AI response as JSON: " + err.message + " — raw response: " + rawText.slice(0, 200)
    );
  }
}

/**
 * Some models (especially smaller open-source models via Groq/OpenRouter)
 * put a literal line break in a JSON string value (for paragraphs)
 * instead of the escaped "\n" — that's invalid JSON and otherwise
 * produces a "Bad control character" error. This function escapes
 * control characters ONLY when they're inside a string value (using a
 * small state machine that tracks quotation marks and escape sequences),
 * so legitimate whitespace between JSON fields (e.g. for nicely
 * formatted output) stays intact.
 */
function sanitizeJsonControlChars(str) {
  let result = "";
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (!inString) {
      if (ch === '"') inString = true;
      result += ch;
      continue;
    }

    if (escapeNext) {
      result += ch;
      escapeNext = false;
      continue;
    }
    if (ch === "\\") {
      result += ch;
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      // Look ahead: does the end of a JSON string logically follow here
      // (space/comma/colon/closing bracket)? If not, this is almost
      // certainly a quotation mark the AI forgot to escape within the
      // text itself (e.g. a quote in an article) — escape it after all,
      // instead of prematurely closing the string and breaking the rest
      // of the JSON.
      let j = i + 1;
      while (j < str.length && /\s/.test(str[j])) j++;
      const next = str[j];
      const looksLikeRealEnd = next === undefined || [",", "}", "]", ":"].includes(next);
      if (looksLikeRealEnd) {
        inString = false;
        result += ch;
      } else {
        result += '\\"';
      }
      continue;
    }
    if (ch === "\n") { result += "\\n"; continue; }
    if (ch === "\r") { continue; }
    if (ch === "\t") { result += "\\t"; continue; }
    result += ch;
  }

  return result;
}

/**
 * Simple, transparent validation heuristic — not a black box.
 * This doesn't replace human review, it's a signal for the reviewer.
 * Works the same regardless of which provider delivered the draft.
 */
function validateDraft({ sourceText, draft }) {
  const sourceLower = sourceText.toLowerCase();
  const bodyLower = (draft.body || "").toLowerCase();

  const draftNumbers = [...bodyLower.matchAll(/\d+([.,]\d+)?/g)].map((m) => m[0]);
  const numbersNotInSource = draftNumbers.filter((n) => !sourceLower.includes(n));

  const draftQuotes = [...(draft.body || "").matchAll(/"([^"]{5,})"/g)].map((m) => m[1]);
  const quotesNotInSource = draftQuotes.filter((q) => !sourceText.includes(q));

  // Catches a broken/truncated AI response — e.g. a body that consists
  // only of dots or other punctuation, without actual content. Only
  // counts letters (including accented ones), not digits/punctuation/spaces.
  const letterCount = ((draft.body || "").match(/\p{L}/gu) || []).length;
  const body_too_short = letterCount < 100;

  // Separate from "broken" (above): an article that DOES have content
  // but clearly falls short of the intended 350-500 words is a risk for
  // "low-value content" (e.g. during an AdSense review) — this blocks
  // nothing, but gives a visible warning in the queue so an editor can
  // consciously choose to expand the article.
  const wordCount = (draft.body || "").trim().split(/\s+/).filter(Boolean).length;
  const content_thin = !body_too_short && wordCount < 250;

  return {
    figures_verified: numbersNotInSource.length === 0,
    unverified_figures: numbersNotInSource,
    quote_unverified: quotesNotInSource.length > 0,
    unverified_quotes: quotesNotInSource,
    body_too_short,
    content_thin,
    word_count: wordCount,
  };
}

function computeConfidence(flags) {
  let score = 1;
  if (!flags.figures_verified) score -= 0.35;
  if (flags.quote_unverified) score -= 0.4;
  if (flags.body_too_short) score -= 0.6;
  if (flags.content_thin) score -= 0.1;
  return Math.max(0, Math.round(score * 100) / 100);
}
