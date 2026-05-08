export const STORAGE_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const STORAGE_MAX_BULK_FILES = 10;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "application/pdf",
] as const;

export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"] as const;

export const STORAGE_ERROR_CODES = {
  FILE_TOO_LARGE: "STORAGE001",
  INVALID_FILE_TYPE: "STORAGE002",
  UPLOAD_FAILED: "STORAGE003",
  DELETE_FAILED: "STORAGE004",
  FILE_NOT_FOUND: "STORAGE005",
  BULK_UPLOAD_PARTIAL: "STORAGE006",
  BULK_UPLOAD_ALL_FAILED: "STORAGE007",
  MAX_FILES_EXCEEDED: "STORAGE008",
  INVALID_MIME_TYPE: "STORAGE009",
  GENERATE_URL_FAILED: "STORAGE010",
};