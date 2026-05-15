export enum LinkType {
  SOCIAL = "social",
  CUSTOM = "custom",
  MUSIC = "music",
  VIDEO = "video",
  STORE = "store",
  PORTFOLIO = "portfolio",
  EMAIL = "email",
  PHONE = "phone",
  FILE = "file",
}

export enum UserPlan {
  FREE = "free",
  PRO = "pro",
  ENTERPRISE = "enterprise",
}

export enum AiTone {
  PROFESSIONAL = "professional",
  CASUAL = "casual",
  HUMOROUS = "humorous",
  MINIMALIST = "minimalist",
}

export enum AiLength {
  SHORT = "short", // ~50 words
  MEDIUM = "medium", // ~100 words
  LONG = "long", // ~200 words
}

export enum AiGenerationStatus {
  COMPLETED = "completed",
  FAILED = "failed",
  MODERATED = "moderated",
  RATE_LIMITED = "rate_limited",
}

export enum AnalyticsEventType {
  PROFILE_VIEW = "profile_view",
  LINK_CLICK = "link_click",
}

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}
