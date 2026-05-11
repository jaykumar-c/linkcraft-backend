import { STORAGE_MAX_FILE_SIZE, ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS } from "../constants/storage.constants";

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  errorCode?: string;
}

export interface FileLike {
  originalname: string;
  mimetype: string;
  size: number;
}

export const validateFile = (file: FileLike): FileValidationResult => {
  if (!file) {
    return {
      isValid: false,
      error: "No file provided",
      errorCode: "STG001",
    };
  }

  if (file.size > STORAGE_MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds the maximum allowed size of ${STORAGE_MAX_FILE_SIZE / (1024 * 1024)}MB`,
      errorCode: "STG002",
    };
  }

  const fileMimeType = file.mimetype.toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(fileMimeType as any)) {
    return {
      isValid: false,
      error: "File type not allowed. Only JPEG, PNG, WebP, and PDF files are accepted.",
      errorCode: "STG012",
    };
  }

  const fileExtension = getFileExtension(file.originalname);
  if (!ALLOWED_EXTENSIONS.includes(fileExtension as any)) {
    return {
      isValid: false,
      error: "File extension not allowed.",
      errorCode: "STG013",
    };
  }

  return { isValid: true };
};

export const validateBulkFiles = (
  files: FileLike[],
): FileValidationResult => {
  if (!files || files.length === 0) {
    return {
      isValid: false,
      error: "No files provided",
      errorCode: "STG014",
    };
  }

  for (const file of files) {
    const result = validateFile(file);
    if (!result.isValid) {
      return result;
    }
  }

  return { isValid: true };
};

export const getFileExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.substring(lastDot).toLowerCase();
};

export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.+/g, ".")
    .replace(/^\.+/, "")
    .substring(0, 255);
};

export const getMimeTypeFromExtension = (
  extension: string,
): string | undefined => {
  const mimeTypeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
  };
  return mimeTypeMap[extension.toLowerCase()];
};

export const isExecutableFile = (filename: string): boolean => {
  const execExtensions = [".exe", ".bat", ".cmd", ".sh", ".ps1", ".scr", ".com"];
  const ext = getFileExtension(filename);
  return execExtensions.includes(ext);
};