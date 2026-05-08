export enum StorageFileStatus {
  UPLOADED = "uploaded",
  FAILED = "failed",
  DELETED = "deleted",
}

export enum StorageErrorMessage {
  FILE_TOO_LARGE = "File size exceeds the maximum allowed size of 5MB",
  INVALID_FILE_TYPE = "File type not allowed. Only JPEG, PNG, WebP, and PDF files are accepted.",
  UPLOAD_FAILED = "Failed to upload file to Cloudinary",
  DELETE_FAILED = "Failed to delete file from Cloudinary",
  FILE_NOT_FOUND = "File not found in Cloudinary",
  BULK_UPLOAD_PARTIAL = "Some files failed to upload",
  BULK_UPLOAD_ALL_FAILED = "All files failed to upload",
  MAX_FILES_EXCEEDED = "Maximum number of files exceeded (max 10)",
  INVALID_MIME_TYPE = "Invalid MIME type detected",
  GENERATE_URL_FAILED = "Failed to generate download URL",
}