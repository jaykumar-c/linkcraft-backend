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
