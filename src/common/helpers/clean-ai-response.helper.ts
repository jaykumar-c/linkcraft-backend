const AI_PREFIXES = [
  /^here'?s?\s*(a\s*)?(possible\s*)?(bio|summary|description|headline|tagline|text)?:?[\s\n]*/i,
  /^here'?s?\s*your\s*(bio|summary|description)?:?[\s\n]*/i,
  /^here'?s?\s*\w+\s*(bio|summary)\s*for\s*you:?[\s\n]*/i,
  /^sure[!,.]*\s*/i,
  /^of\s*course[!,.]*\s*/i,
  /^certainly[!,.]*\s*/i,
  /^absolutely[!,.]*\s*/i,
  /^no\s*problem[!,.]*\s*/i,
];

const TRAILING_QUESTIONS = /\n{0,2}(would you like me to|can i|shall i|do you want me to).*$/i;

/**
 * Clean AI response - remove prefixes, trailing questions, and extra whitespace
 */
export const cleanAiResponse = (text: string): string => {
  if (!text) return "";

  let cleaned = text;

  cleaned = cleaned.replace(/^["']+|["']+$/g, "");

  for (const prefix of AI_PREFIXES) {
    cleaned = cleaned.replace(prefix, "");
  }

  cleaned = cleaned.replace(TRAILING_QUESTIONS, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  cleaned = cleaned.trim();

  return cleaned;
};

/** @deprecated Use cleanAiResponse instead */
export const cleanAiBioResponse = cleanAiResponse;
