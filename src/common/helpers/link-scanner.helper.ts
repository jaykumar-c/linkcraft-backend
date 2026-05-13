import * as cheerio from 'cheerio';
import puppeteer, { Browser } from 'puppeteer-core';

const FETCH_TIMEOUT_MS = 10000;
const PUPPETEER_TIMEOUT_MS = 15000;
const MAX_CONTENT_LENGTH = 3000;
const MAX_LINKS_TO_SCAN = 3;
const CHROME_EXECUTABLE =
  process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';

interface ScrapedLink {
  title: string;
  url: string;
  content: string;
}

interface ExtractResult {
  content: string;
  error?: string;
}

let browserInstance: Browser | null = null;

const getBrowser = async (): Promise<Browser> => {
  if (browserInstance?.connected) {
    return browserInstance;
  }
  browserInstance = await puppeteer.launch({
    executablePath: CHROME_EXECUTABLE,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--headless=new',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
  return browserInstance;
};

const safeCloseBrowser = async (): Promise<void> => {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch {
      // ignore close errors
    }
    browserInstance = null;
  }
};

const normalizeUrl = (url: string): string => {
  url = url.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
};

const extractTextFromHtml = (html: string): string => {
  const $ = cheerio.load(html);

  $('script, style, noscript, svg, nav, footer, header, aside').remove();

  const body = $('body');
  if (!body.length) return '';

  const text = body
    .text()
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 15);

  return lines.join('\n');
};

const extractTitle = ($: cheerio.CheerioAPI): string => {
  return $('title').first().text().trim();
};

const extractMetaDescription = ($: cheerio.CheerioAPI): string => {
  return (
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    ''
  ).trim();
};

// ─── Platform detection ───────────────────────────────────────

const PLATFORM_PATTERNS: Record<string, RegExp> = {
  github: /github\.com/i,
  linkedin: /linkedin\.com/i,
  twitter: /(twitter\.com|x\.com)/i,
  medium: /medium\.com/i,
  devto: /dev\.to/i,
  youtube: /(youtube\.com|youtu\.be)/i,
  instagram: /instagram\.com/i,
};

const detectPlatform = (url: string): string | null => {
  for (const [name, regex] of Object.entries(PLATFORM_PATTERNS)) {
    if (regex.test(url)) return name;
  }
  return null;
};

// ─── Platform-specific extractors ─────────────────────────────

const extractGithubUsername = (url: string): string | null => {
  const match = url.match(/github\.com\/([^/?#]+)/i);
  return match?.[1] ?? null;
};

const extractGithubProfile = async (
  username: string,
): Promise<ExtractResult> => {
  const apiUrl = `https://api.github.com/users/${username}`;
  try {
    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'LinkCraft-AI/1.0',
        Accept: 'application/vnd.github.v3+json',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { content: '', error: `GitHub API returned HTTP ${res.status}` };
    }

    const data: any = await res.json();

    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?sort=updated&per_page=5`,
      {
        headers: {
          'User-Agent': 'LinkCraft-AI/1.0',
          Accept: 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
    let repos: any[] = [];
    if (reposRes.ok) {
      repos = await reposRes.json();
    }

    const parts: string[] = [];
    parts.push(`GitHub Profile: ${data.login}`);
    if (data.name) parts.push(`Name: ${data.name}`);
    if (data.bio) parts.push(`Bio: ${data.bio}`);
    if (data.company) parts.push(`Company: ${data.company}`);
    if (data.location) parts.push(`Location: ${data.location}`);
    if (data.blog) parts.push(`Website: ${data.blog}`);
    if (data.public_repos !== undefined)
      parts.push(`Public Repos: ${data.public_repos}`);
    if (data.followers !== undefined)
      parts.push(`Followers: ${data.followers}`);
    if (data.following !== undefined)
      parts.push(`Following: ${data.following}`);

    if (repos.length > 0) {
      parts.push(
        `\nRecent Repositories:\n${repos
          .map(
            (r) =>
              `- ${r.name}: ${r.description || 'No description'} [${r.language || 'N/A'}] Stars ${r.stargazers_count}`,
          )
          .join('\n')}`,
      );
    }

    return { content: parts.join('\n') };
  } catch (err: any) {
    return { content: '', error: `GitHub API error: ${err.message}` };
  }
};

const extractLinkedinInfo = (url: string): ExtractResult => {
  const match = url.match(
    /linkedin\.com\/(?:in|company)\/([^/?#]+)/i,
  );
  const profileName = match?.[1] ?? null;
  if (profileName) {
    return {
      content: `LinkedIn Profile: ${profileName}`,
      error:
        'LinkedIn blocks automated scanning. Full profile content could not be extracted.',
    };
  }
  return {
    content: '',
    error: 'Could not parse LinkedIn profile URL.',
  };
};

// ─── Tier 1: Simple HTTP fetch ────────────────────────────────

const fetchViaHttp = async (url: string): Promise<ExtractResult> => {
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
      return { content: '', error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get('content-type') || '';
    if (
      !contentType.includes('text/html') &&
      !contentType.includes('text/plain') &&
      !contentType.includes('application/xhtml')
    ) {
      return {
        content: '',
        error: `Unsupported content-type: ${contentType}`,
      };
    }

    const html = await response.text();
    if (!html || html.length < 100) {
      return { content: '', error: 'Page too small or empty' };
    }

    const $ = cheerio.load(html);
    const title = extractTitle($);
    const description = extractMetaDescription($);
    const bodyText = extractTextFromHtml(html);

    const parts: string[] = [];
    if (title) parts.push(`Page Title: ${title}`);
    if (description) parts.push(`Description: ${description}`);
    const cleanedBody = bodyText.slice(0, MAX_CONTENT_LENGTH);
    if (cleanedBody) parts.push(`Page Content:\n${cleanedBody}`);

    const result = parts.join('\n\n');
    return {
      content: result.length > 20 ? result : '',
      error: result.length > 20 ? undefined : 'No meaningful content extracted',
    };
  } catch (err: any) {
    return { content: '', error: err.message };
  } finally {
    clearTimeout(timeoutId);
  }
};

// ─── Tier 2: Puppeteer headless browser ───────────────────────

const fetchViaPuppeteer = async (url: string): Promise<ExtractResult> => {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    await page.setViewport({ width: 1280, height: 800 });

    const response = await page.goto(normalizeUrl(url), {
      waitUntil: 'networkidle2',
      timeout: PUPPETEER_TIMEOUT_MS,
    });

    if (!response) {
      await page.close();
      return { content: '', error: 'No response from page' };
    }

    const status = response.status();
    if (status >= 400) {
      await page.close();
      return { content: '', error: `HTTP ${status}` };
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 1000));

    const html = await page.content();
    await page.close();

    if (!html || html.length < 100) {
      return { content: '', error: 'Page too small or empty after render' };
    }

    const $ = cheerio.load(html);
    const title = extractTitle($);
    const description = extractMetaDescription($);
    const bodyText = extractTextFromHtml(html);

    const parts: string[] = [];
    if (title) parts.push(`Page Title: ${title}`);
    if (description) parts.push(`Description: ${description}`);
    const cleanedBody = bodyText.slice(0, MAX_CONTENT_LENGTH);
    if (cleanedBody) parts.push(`Page Content:\n${cleanedBody}`);

    const result = parts.join('\n\n');
    return {
      content: result.length > 20 ? result : '',
      error: result.length > 20 ? undefined : 'No meaningful content extracted',
    };
  } catch (err: any) {
    return { content: '', error: err.message };
  }
};

// ─── Main scanning logic ──────────────────────────────────────

export const scanLink = async (url: string): Promise<string> => {
  const normalizedUrl = normalizeUrl(url);
  const platform = detectPlatform(normalizedUrl);

  let result: ExtractResult = { content: '' };

  if (platform === 'github') {
    const username = extractGithubUsername(normalizedUrl);
    if (username) {
      result = await extractGithubProfile(username);
      if (result.content) return result.content;
    }
  }

  if (platform === 'linkedin') {
    result = extractLinkedinInfo(normalizedUrl);
    return result.content;
  }

  result = await fetchViaHttp(normalizedUrl);
  if (result.content) return result.content;

  if (platform !== 'medium' && platform !== 'devto') {
    result = await fetchViaPuppeteer(normalizedUrl);
    if (result.content) return result.content;
  }

  return '';
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

  if (browserInstance?.connected) {
    await safeCloseBrowser();
  }

  return results
    .filter(
      (r): r is PromiseFulfilledResult<ScrapedLink> =>
        r.status === 'fulfilled' && r.value.content.length > 0,
    )
    .map((r) => r.value);
};
