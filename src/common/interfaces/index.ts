export interface ThemeSettings {
  theme?: "minimal" | "gradient" | "dark" | "glassmorphism" | "brutalist";
  primaryColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  layout?: "list" | "grid" | "bento" | "carousel";
}

export interface UserProfileInput {
  displayName?: string;
  profession?: string;
}

export interface UploadOptions {
  folder?: string;
  public_id?: string;
  resource_type?: "auto" | "image" | "video" | "raw" | "multi";
  use_filename?: boolean;
  unique_filename?: boolean;
}

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
