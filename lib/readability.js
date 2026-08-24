// Simple, transparent readability score — no AI call needed, works
// instantly and for free. Based on the same principle as the Flesch Reading
// Ease formula (average sentence length + average word length), with a
// syllable estimate that works reasonably well for English text.

function countSyllables(word) {
  const cleaned = word.toLowerCase().replace(/[^a-zà-ÿ]/g, "");
  if (!cleaned) return 0;
  const matches = cleaned.match(/[aeiouyàáâäèéêëìíîïòóôöùúûü]+/g);
  return Math.max(1, matches ? matches.length : 1);
}

function stripHtml(text) {
  return text.replace(/<[^>]+>/g, " ");
}

export function computeReadability(body) {
  const text = stripHtml(body || "").trim();
  if (!text) return null;

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter(Boolean);
  if (sentences.length === 0 || words.length === 0) return null;

  const avgWordsPerSentence = words.length / sentences.length;
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const avgSyllablesPerWord = totalSyllables / words.length;

  // Flesch Reading Ease (higher = easier to read, 0-100)
  const rawScore = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  let label;
  if (score >= 70) label = "Makkelijk te lezen";
  else if (score >= 50) label = "Gemiddeld";
  else if (score >= 30) label = "Wat lastig";
  else label = "Moeilijk te lezen";

  return {
    score,
    label,
    words: words.length,
    sentences: sentences.length,
    avg_words_per_sentence: Math.round(avgWordsPerSentence * 10) / 10,
  };
}
