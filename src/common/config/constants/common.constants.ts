export const RESET_TOKEN_EXPIRY_HOURS = 1;

export const SORT_ORDER_TYPE = {
  ASC: "ASC",
  DESC: "DESC",
} as const;

export const GROQ_AI_MODELS = {
  DEFAULT: "llama-3.1-70b-versatile",
} as const;

export const STORAGE_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const STORAGE_MAX_BULK_FILES = 10;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "application/pdf",
] as const;

export const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
] as const;

export const DEFAULT_STORAGE_FOLDER = "linkcraft";
