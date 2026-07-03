import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

export interface ExtractedPage {
  url: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  h1: string[];
  headings: { level: number; text: string }[];
  canonical: string | null;
  lang: string;
  markdown: string;
  wordCount: number;
  linksInternal: string[];
  linksExternal: string[];
  publishedAt: string | null;
}

export class PageExtractor {
  private turndownService: TurndownService;
  private readonly timeout: number;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });
    this.timeout = parseInt(process.env.REQUEST_TIMEOUT || '30000');
  }

  /**
   * Estrae contenuto strutturato completo da una pagina web
   */
  async extract(url: string): Promise<ExtractedPage> {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

    const response = await axios.get(normalizedUrl, {
      timeout: this.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebsiteToMarkdown/1.0)',
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // --- Metadata (dal DOM originale) ---
    const title = $('title').text().trim() || 'Untitled';
    const metaTitle =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      title;
    const metaDescription =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      '';

    // --- Canonical ---
    const canonical =
      $('link[rel="canonical"]').attr('href') ||
      $('meta[property="og:url"]').attr('content') ||
      null;

    // --- Lang ---
    const lang =
      $('html').attr('lang') ||
      $('html').attr('xml:lang') ||
      '';

    // --- H1 ---
    const h1: string[] = [];
    $('h1').each((_, el) => {
      const text = $(el).text().trim();
      if (text) h1.push(text);
    });

    // --- All headings ---
    const headings: { level: number; text: string }[] = [];
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const tagName = el.tagName.toLowerCase();
      const level = parseInt(tagName.replace('h', ''));
      const text = $(el).text().trim();
      if (text) headings.push({ level, text });
    });

    // --- Published date ---
    const publishedAt =
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="date"]').attr('content') ||
      $('time[datetime]').attr('datetime') ||
      $('[itemprop="datePublished"]').attr('datetime') ||
      null;

    // --- Links ---
    const domain = new URL(normalizedUrl).hostname.replace(/^www\./, '');
    const linksInternal: string[] = [];
    const linksExternal: string[] = [];

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      try {
        const absoluteUrl = new URL(href, normalizedUrl).toString();
        const linkDomain = new URL(absoluteUrl).hostname.replace(/^www\./, '');
        if (linkDomain === domain) {
          linksInternal.push(absoluteUrl);
        } else {
          linksExternal.push(absoluteUrl);
        }
      } catch {
        // Ignora URL malformati
      }
    });

    // --- Markdown (secondo parse, rimuovendo elementi non necessari) ---
    const md$ = cheerio.load(html);
    md$('script, style, nav, footer, aside, .advertisement, .ads').remove();
    let mainContent = '';
    const contentEl = md$('main, article, .content, .post, .entry');
    if (contentEl.length > 0) {
      mainContent = contentEl.html() || '';
    } else {
      md$('header, nav, footer, aside').remove();
      mainContent = md$('body').html() || '';
    }
    const markdown = this.turndownService.turndown(mainContent);
    const wordCount = markdown.split(/\s+/).filter((w) => w.length > 0).length;

    return {
      url: normalizedUrl,
      title,
      metaTitle,
      metaDescription,
      h1,
      headings,
      canonical,
      lang,
      markdown,
      wordCount,
      linksInternal: [...new Set(linksInternal)],
      linksExternal: [...new Set(linksExternal)],
      publishedAt,
    };
  }
}
