/**
 * Clean AI response - remove prefixes and trailing questions
 */
export const cleanAiBioResponse = (text: string): string => {
  if (!text) return "";

  let cleaned = text;

  // Remove quotes at start/end
  cleaned = cleaned.replace(/^["']+|["']+$/g, "");

  // Remove AI prefixes (case insensitive)
  cleaned = cleaned.replace(
    /^here'?s?\s*(a\s*)?(possible\s*)?bio:?[\s\n]*/i,
    "",
  );
  cleaned = cleaned.replace(/^here'?s?\s*your\s*bio:?[\s\n]*/i, "");
  cleaned = cleaned.replace(/^here'?s?\s*\w+\s*bio\s*for\s*you:?[\s\n]*/i, "");
  cleaned = cleaned.replace(/^sure[!,.]*\s*/i, "");
  cleaned = cleaned.replace(/^of\s*course[!,.]*\s*/i, "");
  cleaned = cleaned.replace(/^certainly[!,.]*\s*/i, "");
  cleaned = cleaned.replace(/^absolutely[!,.]*\s*/i, "");
  cleaned = cleaned.replace(/^no\s*problem[!,.]*\s*/i, "");

  // Remove ending questions like "Would you like me to modify..."
  cleaned = cleaned.replace(
    /\n{0,2}(would you like me to|would you|can i|shall i).*$/i,
    "",
  );

  // Clean up extra whitespace and newlines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  cleaned = cleaned.trim();

  return cleaned;
};
