/**
 * Detects platform from URL and returns platform name + normalized URL.
 * Used to auto-assign link_type and platform_detected fields.
 */

type PlatformDetectionResult = {
  platform: string;
  linkType: string;
  normalizedUrl: string;
};

const PLATFORM_PATTERNS: { [key: string]: { regex: RegExp; type: string } } = {
  github: { regex: /github\.com/i, type: "social" },
  linkedin: { regex: /linkedin\.com/i, type: "social" },
  twitter: { regex: /(twitter\.com|x\.com)/i, type: "social" },
  youtube: { regex: /youtube\.com|youtu\.be/i, type: "video" },
  spotify: { regex: /spotify\.com/i, type: "music" },
  instagram: { regex: /instagram\.com/i, type: "social" },
  tiktok: { regex: /tiktok\.com/i, type: "video" },
  discord: { regex: /discord\.com|discord\.gg/i, type: "social" },
  portfolio: { regex: /(portfolio|about\.me|linktr\.ee)/i, type: "portfolio" },
};

export const detectPlatform = (url: string): PlatformDetectionResult => {
  const normalizedUrl = normalizeUrl(url);

  for (const [platform, config] of Object.entries(PLATFORM_PATTERNS)) {
    if (config.regex.test(normalizedUrl)) {
      return {
        platform,
        linkType: config.type,
        normalizedUrl,
      };
    }
  }

  return {
    platform: "custom",
    linkType: "custom",
    normalizedUrl,
  };
};

export const normalizeUrl = (url: string): string => {
  let normalized = url.trim();

  // Add protocol if missing
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = "https://" + normalized;
  }

  // Remove trailing slash
  normalized = normalized.replace(/\/+$/, "");

  return normalized;
};
