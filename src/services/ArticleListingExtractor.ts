import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

export interface ArticleLink {
  url: string;
  title: string;
  publishedAt: string | null;
}

export interface ArticleListingResult {
  success: boolean;
  title: string;
  articleLinks: ArticleLink[];
  linksInternal: string[];
  markdown: string;
  timestamp: string;
}

export class ArticleListingExtractor {
  private turndownService: TurndownService;
  private readonly timeout: number;
  private readonly maxArticles: number;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });
    this.timeout = parseInt(process.env.REQUEST_TIMEOUT || '30000');
    this.maxArticles = 50;
  }

  async extract(url: string): Promise<ArticleListingResult> {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

    const response = await axios.get(normalizedUrl, {
      timeout: this.timeout,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Page title
    const title =
      $('title').text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      'Untitled';

    // Extract article links from the listing page
    const articleLinks = this.extractArticleLinks($, normalizedUrl);

    // Internal links (all, deduplicated)
    const domain = new URL(normalizedUrl).hostname.replace(/^www\./, '');
    const linksInternal = this.extractInternalLinks($, normalizedUrl, domain);

    // Extract main content markdown if <main> or <article> section exists
    const mainContent = this.extractMainContent($, html);
    const markdown = mainContent
      ? this.turndownService.turndown(mainContent)
      : '';

    return {
      success: articleLinks.length > 0 || linksInternal.length > 0,
      title,
      articleLinks: articleLinks.slice(0, this.maxArticles),
      linksInternal: [...new Set(linksInternal)].slice(0, 200),
      markdown,
      timestamp: new Date().toISOString(),
    };
  }

  private extractArticleLinks(
    $: cheerio.CheerioAPI,
    baseUrl: string
  ): ArticleLink[] {
    const links: ArticleLink[] = [];
    const seen = new Set<string>();

    // Strategy 1: Look for <article> elements — most semantic
    $('article').each((_, article) => {
      const linkEl = $(article).find('a[href]').first();
      const href = linkEl.attr('href');
      if (!href) return;

      try {
        const absoluteUrl = new URL(href, baseUrl).toString();
        if (seen.has(absoluteUrl)) return;
        seen.add(absoluteUrl);

        const title =
          linkEl.attr('title') ||
          $(article).find('h1 a, h2 a, h3 a, h4 a').first().text().trim() ||
          $(article).find('h1, h2, h3, h4').first().text().trim() ||
          linkEl.text().trim() ||
          '';

        const publishedAt =
          $(article).find('meta[property="article:published_time"]').attr('content') ||
          $(article).find('time[datetime]').attr('datetime') ||
          null;

        if (absoluteUrl && title) {
          links.push({ url: absoluteUrl, title, publishedAt });
        }
      } catch {
        // malformed URL, skip
      }
    });

    // Strategy 2: Look for heading links (h2/h3/h4 > a) in content areas
    // Always runs and supplements strategy 1 — many listing pages use
    // <h2><a href=...>Title</a></h2> without <article> wrappers.
    const contentSelectors = ['main', '.content', '.post-list', '.entry-list', '.articles', '#content', '.listing', '.row', 'section', '[class*="col-"]'];
    const contentArea = $(contentSelectors.join(', '));

    if (contentArea.length > 0) {
      contentArea.find('h2 a[href], h3 a[href], h4 a[href]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const text = $el.text().trim();
        if (!href || !text) return;

        try {
          const absoluteUrl = new URL(href, baseUrl).toString();
          if (seen.has(absoluteUrl)) return;
          seen.add(absoluteUrl);

          // Check for nearby date — look at the parent container (e.g. div, li)
          const heading = $el.closest('h2, h3, h4');
          const parent = heading.length > 0 ? heading.parent() : $el.parent();
          const publishedAt =
            parent.find('time[datetime]').first().attr('datetime') ||
            parent.find('[datetime]').first().attr('datetime') ||
            $el.closest('li, div, article').find('time[datetime]').first().attr('datetime') ||
            null;

          links.push({ url: absoluteUrl, title: text, publishedAt });
        } catch {
          // skip
        }
      });
    }

    // Strategy 3: All internal links with text longer than 25 chars
    // Catches article links in non-standard layouts (e.g. PuntoSicuro
    // where articles are in <div class="row"> with <a> inside <h2> that
    // sits in a subcategory-level container, not the main content area).
    const domain = new URL(baseUrl).hostname.replace(/^www\./, '');
    $('a[href]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      const text = $el.text().trim();
      if (!href || !text || text.length < 25) return;

      try {
        const absoluteUrl = new URL(href, baseUrl).toString();
        const linkDomain = new URL(absoluteUrl).hostname.replace(/^www\./, '');
        if (linkDomain !== domain) return;
        if (seen.has(absoluteUrl)) return;
        seen.add(absoluteUrl);

        const publishedAt =
          $el.closest('li, div, article, section').find('time[datetime]').first().attr('datetime') ||
          null;

        links.push({ url: absoluteUrl, title: text, publishedAt });
      } catch {
        // skip
      }
    });

    return links;
  }

  private extractInternalLinks(
    $: cheerio.CheerioAPI,
    baseUrl: string,
    domain: string
  ): string[] {
    const links: string[] = [];
    const seen = new Set<string>();

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      try {
        const absoluteUrl = new URL(href, baseUrl).toString();
        const linkDomain = new URL(absoluteUrl).hostname.replace(/^www\./, '');
        if (linkDomain !== domain) return;
        if (seen.has(absoluteUrl)) return;
        seen.add(absoluteUrl);
        links.push(absoluteUrl);
      } catch {
        // malformed URL
      }
    });

    return links;
  }

  private extractMainContent($: cheerio.CheerioAPI, html: string): string | null {
    // Try main content selectors
    for (const selector of ['main', 'article', '[role="main"]', '.content', '.post', '.entry']) {
      const el = $(selector);
      if (el.length > 0) {
        // Clone to avoid mutating the original parsed DOM
        const clone = cheerio.load(el.html() || '');
        clone('script, style, nav, footer, aside, .advertisement, .ads, iframe').remove();
        const content = clone.root().html();
        if (content && content.trim().length > 100) {
          return content;
        }
      }
    }

    // Fallback: use body with noise removed
    const body$ = cheerio.load(html);
    body$('script, style, nav, footer, aside, .advertisement, .ads, iframe, header, noscript').remove();
    const bodyContent = body$('body').html();
    if (bodyContent && bodyContent.trim().length > 200) {
      return bodyContent;
    }

    return null;
  }
}
