import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSecret } from "./secrets";
import { getGoogleApiKey } from "./db";

const SYSTEM_PROMPT = `Je bent een nieuwsredacteur die korte, feitelijke nieuwsartikelen schrijft in het Nederlands, uitsluitend op basis van de aangeleverde brontekst.

Regels, zonder uitzondering:
- Gebruik alleen feiten, cijfers en namen die letterlijk in de brontekst staan. Verzin niets.
- Voeg geen citaten toe die niet woordelijk (of vrijwel woordelijk) in de brontekst voorkomen.
- Als de brontekst iets niet vermeldt, laat het weg in plaats van het aan te vullen.
- Schrijf neutraal en feitelijk, geen mening of speculatie.
- Antwoord ALLEEN met geldige JSON, in dit exacte formaat, zonder markdown-codeblok eromheen:
{"title": "...", "body": "...", "category": "Binnenland|Economie|Sport|Tech|Overig"}`;

export async function generateDraft({ sourceText, sourceName }) {
  const apiKey = getGoogleApiKey() || getSecret("google_api_key", "GOOGLE_API_KEY");
  if (!apiKey) {
    throw new Error(
      "Er is nog geen Google API-key ingesteld. Voeg er een toe via Instellingen in het adminpaneel."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(
    `Bron: ${sourceName}\n\nBrontekst:\n${sourceText}`
  );

  const rawText = result.response.text();

  let parsed;
  try {
    let cleaned = rawText.replace(/```json|```/g, "").trim();
    // Gemini geeft soms extra tekst voor of na de JSON terug, ook met
    // responseMimeType: "application/json". Pak alleen het stuk tussen de
    // eerste { en de laatste } om dat te negeren.
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end < start) {
      throw new Error("geen JSON-object gevonden in het antwoord");
    }
    cleaned = cleaned.slice(start, end + 1);
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      "Kon AI-antwoord niet als JSON parsen: " + err.message + " — ruwe respons: " + rawText.slice(0, 200)
    );
  }

  const flags = validateDraft({ sourceText, draft: parsed });
  const confidence_score = computeConfidence(flags);

  return {
    title: parsed.title,
    body: parsed.body,
    category: parsed.category || "Overig",
    flags,
    confidence_score,
  };
}

/**
 * Simpele, transparante validatieheuristiek — geen zwarte doos.
 * Dit vervangt geen menselijke controle, het is een signaal voor de reviewer.
 * Ongewijzigd t.o.v. de Anthropic-versie: modelkeuze en validatie staan los van elkaar.
 */
function validateDraft({ sourceText, draft }) {
  const sourceLower = sourceText.toLowerCase();
  const bodyLower = (draft.body || "").toLowerCase();

  // Cijfer-check: elk getal in het concept moet ook in de bron voorkomen
  const draftNumbers = [...bodyLower.matchAll(/\d+([.,]\d+)?/g)].map((m) => m[0]);
  const numbersNotInSource = draftNumbers.filter(
    (n) => !sourceLower.includes(n)
  );

  // Citaat-check: tekst tussen aanhalingstekens in het concept
  const draftQuotes = [...(draft.body || "").matchAll(/"([^"]{5,})"/g)].map(
    (m) => m[1]
  );
  const quotesNotInSource = draftQuotes.filter(
    (q) => !sourceText.includes(q)
  );

  return {
    figures_verified: numbersNotInSource.length === 0,
    unverified_figures: numbersNotInSource,
    quote_unverified: quotesNotInSource.length > 0,
    unverified_quotes: quotesNotInSource,
  };
}

function computeConfidence(flags) {
  let score = 1;
  if (!flags.figures_verified) score -= 0.35;
  if (flags.quote_unverified) score -= 0.4;
  return Math.max(0, Math.round(score * 100) / 100);
}
