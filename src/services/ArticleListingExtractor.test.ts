import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArticleListingExtractor } from './ArticleListingExtractor';
import axios from 'axios';

const mockHtmlWithArticles = `<!DOCTYPE html>
<html lang="it">
<head><title>PuntoSicuro — Notizie</title></head>
<body>
  <main>
    <article>
      <h2><a href="/2025/01/sicurezza-lavoro-normative/">Nuove normative sulla sicurezza sul lavoro</a></h2>
      <meta property="article:published_time" content="2025-01-15T10:00:00Z">
      <time datetime="2025-01-15">15 Gennaio 2025</time>
      <p>Contenuto dell'articolo sulle nuove normative...</p>
    </article>
    <article>
      <h2><a href="/2025/01/prevenzione-incendi/">Prevenzione incendi: linee guida aggiornate</a></h2>
      <meta property="article:published_time" content="2025-01-14T08:30:00Z">
      <time datetime="2025-01-14">14 Gennaio 2025</time>
      <p>Contenuto sulla prevenzione incendi...</p>
    </article>
    <article>
      <h2><a href="/2025/01/formazione-rspp/">Corso RSPP: tutto quello che c'è da sapere</a></h2>
      <p>Contenuto senza data esplicita...</p>
    </article>
  </main>
  <footer><a href="/contatti">Contatti</a></footer>
</body>
</html>`;

const mockHtmlNoArticles = `<!DOCTYPE html>
<html lang="it">
<head><title>JavaScript SPA — Loading...</title></head>
<body>
  <div id="app">
    <p>Caricamento in corso...</p>
    <div class="spinner"></div>
  </div>
  <footer>
    <a href="/chi-siamo">Chi siamo</a>
    <a href="/servizi">Servizi</a>
    <a href="/contatti">Contatti</a>
  </footer>
</body>
</html>`;

const mockHtmlH2Listing = `<!DOCTYPE html>
<html lang="it">
<head><title>Blog — Articoli recenti</title></head>
<body>
  <div class="content">
    <div class="post-item">
      <h2><a href="/blog/primo-articolo/">Primo articolo del blog con titolo lungo e descrittivo</a></h2>
      <time datetime="2025-02-01">1 Febbraio 2025</time>
    </div>
    <div class="post-item">
      <h2><a href="/blog/secondo-articolo/">Secondo articolo: analisi approfondita del tema</a></h2>
      <time datetime="2025-01-28">28 Gennaio 2025</time>
    </div>
  </div>
</body>
</html>`;

describe('ArticleListingExtractor', () => {
  let extractor: ArticleListingExtractor;

  beforeEach(() => {
    extractor = new ArticleListingExtractor();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extract', () => {
    it('should extract article links from <article> elements with publishedAt', async () => {
      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        data: mockHtmlWithArticles,
      });

      const result = await extractor.extract('https://www.puntosicuro.it');

      expect(result.success).toBe(true);
      expect(result.title).toBe('PuntoSicuro — Notizie');
      expect(result.articleLinks).toHaveLength(3);

      expect(result.articleLinks[0].url).toBe(
        'https://www.puntosicuro.it/2025/01/sicurezza-lavoro-normative/'
      );
      expect(result.articleLinks[0].title).toBe(
        'Nuove normative sulla sicurezza sul lavoro'
      );
      expect(result.articleLinks[0].publishedAt).toBe('2025-01-15T10:00:00Z');

      expect(result.articleLinks[1].url).toBe(
        'https://www.puntosicuro.it/2025/01/prevenzione-incendi/'
      );
      expect(result.articleLinks[1].publishedAt).toBe('2025-01-14T08:30:00Z');

      // Third article has no date
      expect(result.articleLinks[2].publishedAt).toBeNull();
    });

    it('should return internal links as fallback when no articles found (JS-rendered page)', async () => {
      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        data: mockHtmlNoArticles,
      });

      const result = await extractor.extract('https://spa-site.example');

      expect(result.success).toBe(true);
      expect(result.title).toBe('JavaScript SPA — Loading...');
      expect(result.linksInternal.length).toBeGreaterThanOrEqual(3);
      expect(result.linksInternal).toContain(
        'https://spa-site.example/chi-siamo'
      );
      expect(result.linksInternal).toContain(
        'https://spa-site.example/servizi'
      );
      expect(result.linksInternal).toContain(
        'https://spa-site.example/contatti'
      );
      // articleLinks should be empty (no article-like content)
      expect(result.articleLinks).toHaveLength(0);
    });

    it('should extract article links from h2 listing pages (strategy 2)', async () => {
      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        data: mockHtmlH2Listing,
      });

      const result = await extractor.extract('https://blog.example');

      expect(result.success).toBe(true);
      expect(result.title).toBe('Blog — Articoli recenti');
      expect(result.articleLinks.length).toBeGreaterThanOrEqual(2);
      expect(result.articleLinks[0].url).toBe(
        'https://blog.example/blog/primo-articolo/'
      );
      expect(result.articleLinks[0].publishedAt).toBe('2025-02-01');
    });

    it('should limit article links to max 50', async () => {
      const articles = Array.from(
        { length: 100 },
        (_, i) =>
          `<article><h2><a href="/article-${i}">Article number ${i} with a sufficiently long title for testing</a></h2></article>`
      ).join('\n');

      const largeHtml = `<!DOCTYPE html><html><head><title>Large listing</title></head><body><main>${articles}</main></body></html>`;

      vi.spyOn(axios, 'get').mockResolvedValueOnce({ data: largeHtml });

      const result = await extractor.extract('https://large-listing.example');

      expect(result.articleLinks.length).toBeLessThanOrEqual(50);
      expect(result.linksInternal.length).toBeLessThanOrEqual(200);
    });

    it('should handle malformed URLs gracefully without crashing', async () => {
      const malformedHtml = `<!DOCTYPE html>
<html><head><title>Test malformed</title></head>
<body>
  <article>
    <h2><a href="">Empty link article with title text</a></h2>
  </article>
  <article>
    <h2><a href="javascript:void(0)">JS link with long title for testing</a></h2>
  </article>
</body></html>`;

      vi.spyOn(axios, 'get').mockResolvedValueOnce({ data: malformedHtml });

      const result = await extractor.extract('https://test.example');

      expect(result.success).toBe(true);
      expect(Array.isArray(result.articleLinks)).toBe(true);
      expect(Array.isArray(result.linksInternal)).toBe(true);
    });

    it('should prepend https:// when no protocol is provided', async () => {
      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        data: mockHtmlWithArticles,
      });

      const result = await extractor.extract('www.puntosicuro.it');

      expect(result.success).toBe(true);
      // axios.get was called with https://www.puntosicuro.it
      expect(axios.get).toHaveBeenCalledWith(
        'https://www.puntosicuro.it',
        expect.any(Object)
      );
    });

    it('should include markdown when <main> content exists', async () => {
      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        data: mockHtmlWithArticles,
      });

      const result = await extractor.extract('https://www.puntosicuro.it');

      expect(result.markdown.length).toBeGreaterThan(0);
      // Should contain article text converted to markdown
      expect(result.markdown).toContain('sicurezza');
    });

    it('should return empty markdown when no main/article content found', async () => {
      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        data: mockHtmlNoArticles,
      });

      const result = await extractor.extract('https://spa-site.example');

      // No <main>, <article>, or content selectors with enough text
      expect(result.markdown).toBe('');
    });

    it('should return a valid ISO timestamp', async () => {
      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        data: mockHtmlWithArticles,
      });

      const result = await extractor.extract('https://www.puntosicuro.it');

      expect(result.timestamp).toBeTruthy();
      expect(() => new Date(result.timestamp)).not.toThrow();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should use browser-like User-Agent header', async () => {
      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        data: mockHtmlWithArticles,
      });

      await extractor.extract('https://www.puntosicuro.it');

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('Mozilla/5.0'),
          }),
        })
      );
    });
  });
});
