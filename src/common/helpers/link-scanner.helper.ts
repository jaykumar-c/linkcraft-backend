const FETCH_TIMEOUT_MS = 10000;
const MAX_CONTENT_LENGTH = 3000;
const MAX_LINKS_TO_SCAN = 3;

interface ScrapedLink {
  title: string;
  url: string;
  content: string;
}

const normalizeUrl = (url: string): string => {
  url = url.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
};

const extractAllText = (html: string): string => {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;

  const cleaned = body
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();

  const lines = cleaned
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 15);

  return lines.join('\n');
};

const extractTitle = (html: string): string => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/<[^>]+>/g, '').trim() : '';
};

const extractMetaDescription = (html: string): string => {
  const patterns = [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1].trim();
  }
  return '';
};

const fetchPage = async (url: string): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const normalizedUrl = normalizeUrl(url);

    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (
      !contentType.includes('text/html') &&
      !contentType.includes('text/plain') &&
      !contentType.includes('application/xhtml')
    ) {
      throw new Error(`Unsupported content-type: ${contentType}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
};

export const scanLink = async (url: string): Promise<string> => {
  try {
    const html = await fetchPage(url);
    if (!html || html.length < 100) {
      return '';
    }

    const title = extractTitle(html);
    const description = extractMetaDescription(html);
    const bodyText = extractAllText(html);

    const parts: string[] = [];
    if (title) parts.push(`Page Title: ${title}`);
    if (description) parts.push(`Description: ${description}`);

    const cleanedBody = bodyText.slice(0, MAX_CONTENT_LENGTH);
    if (cleanedBody) {
      parts.push(`Page Content:\n${cleanedBody}`);
    }

    const result = parts.join('\n\n');

    return result.length > 20 ? result : '';
  } catch {
    return '';
  }
};

export const scanLinks = async (
  links: Array<{ title: string; url: string }>,
): Promise<ScrapedLink[]> => {
  const toScan = links.slice(0, MAX_LINKS_TO_SCAN);
  const results = await Promise.allSettled(
    toScan.map(async (link) => {
      const content = await scanLink(link.url);
      return { title: link.title, url: link.url, content };
    }),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<ScrapedLink> =>
        r.status === 'fulfilled' && r.value.content.length > 0,
    )
    .map((r) => r.value);
};
