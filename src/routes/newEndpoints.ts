import { Router, Request, Response } from 'express';
import { WebsiteConverter } from '../services/WebsiteConverter';
import { PageExtractor } from '../services/PageExtractor';
import { ArticleListingExtractor } from '../services/ArticleListingExtractor';
import { SitemapParser } from '../services/SitemapParser';
import { validateUrl, extractDomain } from '../utils/validation';

const router = Router();
const converter = new WebsiteConverter();
const extractor = new PageExtractor();
const articleExtractor = new ArticleListingExtractor();
const sitemapParser = new SitemapParser();

// ──────────────────────────────────────────────
// 1. POST /api/discover
// ──────────────────────────────────────────────
router.post('/discover', async (req: Request<{}, {}, { url: string; maxPages?: number }>, res: Response): Promise<void> => {
  try {
    const { url, maxPages = 100 } = req.body;

    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    if (!validateUrl(url)) {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }

    if (maxPages < 0 || maxPages > 5000) {
      res.status(400).json({ error: 'maxPages must be between 0 and 5000 (0 = unlimited)' });
      return;
    }

    const result = await converter.discoverUrls(url, maxPages);

    res.json({
      success: true,
      domain: result.domain,
      totalUrls: result.urls.length,
      urls: result.urls,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Discovery error:', error);
    res.status(500).json({
      error: 'Failed to discover URLs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ──────────────────────────────────────────────
// 2. POST /api/extract — Article listing extractor
// ──────────────────────────────────────────────
router.post('/extract', async (req: Request<{}, {}, { url: string }>, res: Response): Promise<void> => {
  try {
    const { url } = req.body;

    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    if (!validateUrl(url)) {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }

    const result = await articleExtractor.extract(url);

    res.json({
      success: result.success,
      title: result.title,
      articleLinks: result.articleLinks,
      linksInternal: result.linksInternal,
      markdown: result.markdown,
      timestamp: result.timestamp,
    });
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({
      error: 'Failed to extract page content',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ──────────────────────────────────────────────
// 3. POST /api/diff
// ──────────────────────────────────────────────
router.post('/diff', async (req: Request<{}, {}, {
  url1?: string;
  url2?: string;
  markdown1?: string;
  markdown2?: string;
}>, res: Response): Promise<void> => {
  try {
    const { url1, url2, markdown1, markdown2 } = req.body;

    if (!((url1 && url2) || (markdown1 && markdown2))) {
      res.status(400).json({
        error: 'Provide either (url1 + url2) or (markdown1 + markdown2)',
      });
      return;
    }

    let md1: string;
    let md2: string;
    let source1: string;
    let source2: string;

    if (url1 && url2) {
      const [p1, p2] = await Promise.all([
        extractor.extract(url1),
        extractor.extract(url2),
      ]);
      md1 = p1.markdown;
      md2 = p2.markdown;
      source1 = url1;
      source2 = url2;
    } else {
      md1 = markdown1!;
      md2 = markdown2!;
      source1 = 'markdown1';
      source2 = 'markdown2';
    }

    // Estrai heading da entrambi
    const headings1 = extractHeadings(md1);
    const headings2 = extractHeadings(md2);

    // Topic extraction semplice
    const topics1 = extractSimpleTopics(md1);
    const topics2 = extractSimpleTopics(md2);

    // Heading mancanti
    const headingsOnly1 = new Set(headings1.map((h) => h.text.toLowerCase()));
    const headingsOnly2 = new Set(headings2.map((h) => h.text.toLowerCase()));
    const missingIn2 = headings1.filter((h) => !headingsOnly2.has(h.text.toLowerCase()));
    const missingIn1 = headings2.filter((h) => !headingsOnly1.has(h.text.toLowerCase()));

    // Topic overlap
    const commonTopics = topics1.filter((t) => topics2.includes(t));
    const uniqueIn1 = topics1.filter((t) => !topics2.includes(t));
    const uniqueIn2 = topics2.filter((t) => !topics1.includes(t));

    // Word count
    const wc1 = md1.split(/\s+/).filter((w) => w.length > 0).length;
    const wc2 = md2.split(/\s+/).filter((w) => w.length > 0).length;

    // Similarity score semplice (basato su overlap di parole)
    const words1 = new Set(md1.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
    const words2 = new Set(md2.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    const similarity = union.size > 0 ? Math.round((intersection.size / union.size) * 100) : 0;

    res.json({
      success: true,
      source1,
      source2,
      stats: {
        wordCount1: wc1,
        wordCount2: wc2,
        headingCount1: headings1.length,
        headingCount2: headings2.length,
        similarityPercent: similarity,
      },
      differences: {
        headingsMissingInSource2: missingIn2,
        headingsMissingInSource1: missingIn1,
      },
      topics: {
        common: commonTopics,
        uniqueToSource1: uniqueIn1,
        uniqueToSource2: uniqueIn2,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Diff error:', error);
    res.status(500).json({
      error: 'Failed to compute diff',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ──────────────────────────────────────────────
// 4. POST /api/search
// ──────────────────────────────────────────────
router.post('/search', async (req: Request<{}, {}, {
  query: string;
  pages?: { url: string; markdown: string; title?: string }[];
  caseSensitive?: boolean;
}>, res: Response): Promise<void> => {
  try {
    const { query, pages = [], caseSensitive = false } = req.body;

    if (!query || query.trim().length === 0) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    if (pages.length === 0) {
      res.status(400).json({ error: 'Pages array is required (at least one page with url and markdown)' });
      return;
    }

    const searchQuery = caseSensitive ? query : query.toLowerCase();
    const results: {
      url: string;
      title?: string;
      matches: number;
      contextSnippets: string[];
    }[] = [];

    for (const page of pages) {
      const content = caseSensitive ? page.markdown : page.markdown.toLowerCase();
      const lines = content.split('\n');
      const matches: number[] = [];
      const snippets: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(searchQuery)) {
          matches.push(i);

          // Context snippet: 1 riga prima + riga match + 1 riga dopo
          const start = Math.max(0, i - 1);
          const end = Math.min(lines.length - 1, i + 1);
          const snippet = lines.slice(start, end + 1).join('\n').trim();
          if (snippet) snippets.push(snippet);
        }
      }

      if (matches.length > 0) {
        results.push({
          url: page.url,
          title: page.title,
          matches: matches.length,
          contextSnippets: snippets.slice(0, 10), // max 10 snippet per pagina
        });
      }
    }

    res.json({
      success: true,
      query,
      caseSensitive,
      totalResults: results.length,
      totalMatches: results.reduce((sum, r) => sum + r.matches, 0),
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Failed to search pages',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ──────────────────────────────────────────────
// 5. POST /api/chunk
// ──────────────────────────────────────────────
router.post('/chunk', async (req: Request<{}, {}, {
  markdown?: string;
  url?: string;
  maxTokens?: number;
  overlap?: number;
}>, res: Response): Promise<void> => {
  try {
    const { markdown, url, maxTokens = 500, overlap = 50 } = req.body;

    let md: string;
    let sourceUrl: string | undefined;

    if (markdown) {
      md = markdown;
      sourceUrl = url;
    } else if (url) {
      const page = await extractor.extract(url);
      md = page.markdown;
      sourceUrl = url;
    } else {
      res.status(400).json({ error: 'Provide either "markdown" or "url"' });
      return;
    }

    // Stima token: ~4 caratteri per token (approssimazione)
    const avgCharsPerToken = 4;
    const maxChars = maxTokens * avgCharsPerToken;
    const overlapChars = overlap * avgCharsPerToken;

    const chunks: {
      index: number;
      text: string;
      headingPath: string[];
      tokenEstimate: number;
      wordEstimate: number;
      sourceUrl?: string;
    }[] = [];

    const lines = md.split('\n');
    let currentChunk: string[] = [];
    let currentChars = 0;
    let currentHeadingPath: string[] = [];
    let chunkIndex = 0;

    for (const line of lines) {
      // Traccia heading path
      const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        currentHeadingPath = currentHeadingPath.slice(0, level - 1);
        currentHeadingPath[level - 1] = text;
        currentHeadingPath = currentHeadingPath.filter(Boolean);
      }

      const lineLength = line.length + 1; // +1 per newline

      if (currentChars + lineLength > maxChars && currentChunk.length > 0) {
        // Finalizza chunk corrente
        const chunkText = currentChunk.join('\n');
        const wordCount = chunkText.split(/\s+/).filter((w) => w.length > 0).length;

        chunks.push({
          index: chunkIndex++,
          text: chunkText,
          headingPath: [...currentHeadingPath],
          tokenEstimate: Math.round(chunkText.length / avgCharsPerToken),
          wordEstimate: wordCount,
          sourceUrl,
        });

        // Overlap: mantieni le ultime righe
        const overlapLines: string[] = [];
        let overlapCharsCount = 0;
        for (let j = currentChunk.length - 1; j >= 0; j--) {
          const cl = currentChunk[j].length + 1;
          if (overlapCharsCount + cl > overlapChars) break;
          overlapLines.unshift(currentChunk[j]);
          overlapCharsCount += cl;
        }

        currentChunk = [...overlapLines];
        currentChars = overlapCharsCount;
      }

      currentChunk.push(line);
      currentChars += lineLength;
    }

    // Ultimo chunk
    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join('\n');
      const wordCount = chunkText.split(/\s+/).filter((w) => w.length > 0).length;
      chunks.push({
        index: chunkIndex++,
        text: chunkText,
        headingPath: [...currentHeadingPath],
        tokenEstimate: Math.round(chunkText.length / avgCharsPerToken),
        wordEstimate: wordCount,
        sourceUrl,
      });
    }

    res.json({
      success: true,
      totalChunks: chunks.length,
      maxTokens,
      overlap,
      chunks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chunk error:', error);
    res.status(500).json({
      error: 'Failed to chunk content',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ──────────────────────────────────────────────
// 6. POST /api/map-topics
// ──────────────────────────────────────────────
router.post('/map-topics', async (req: Request<{}, {}, {
  url?: string;
  pages?: { url: string; title: string; markdown: string }[];
  minWordFrequency?: number;
}>, res: Response): Promise<void> => {
  try {
    const { url, pages: inputPages, minWordFrequency = 2 } = req.body;

    if (!url && (!inputPages || inputPages.length === 0)) {
      res.status(400).json({ error: 'Provide either "url" or "pages" array' });
      return;
    }

    let pages: { url: string; title: string; markdown: string }[];

    if (url) {
      // Discovery + extraction
      const discovered = await converter.discoverUrls(url, 500);
      const extracted = await Promise.all(
        discovered.urls.slice(0, 100).map(async (d) => {
          try {
            const page = await extractor.extract(d.url);
            return { url: page.url, title: page.title, markdown: page.markdown };
          } catch {
            return null;
          }
        })
      );
      pages = extracted.filter((p): p is { url: string; title: string; markdown: string } => p !== null);
    } else {
      pages = inputPages!;
    }

    if (pages.length === 0) {
      res.status(404).json({ error: 'No pages found or provided' });
      return;
    }

    // Estrai parole significative da tutte le pagine
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'by', 'with', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need',
      'dare', 'ought', 'used', 'this', 'that', 'these', 'those', 'it',
      'its', 'they', 'them', 'their', 'we', 'us', 'our', 'you', 'your',
      'he', 'she', 'him', 'her', 'his', 'il', 'la', 'le', 'di', 'che',
      'e', 'a', 'un', 'una', 'lo', 'gli', 'ai', 'alle', 'dagli', 'dai',
      'dalle', 'degli', 'delle', 'dell', 'della', 'sul', 'sulla', 'sui',
      'con', 'tra', 'fra', 'per', 'non', 'si', 'più', 'ha', 'ho', 'hanno',
      'sono', 'era', 'stato', 'viene', 'loro', 'cosa', 'come', 'dove',
      'quando', 'quanto', 'del', 'nel', 'dei', 'dai', 'con', 'oltre',
    ]);

    // Raccogli tutte le parole da titoli e heading
    const pageTopics: { url: string; title: string; topics: string[] }[] = [];

    for (const page of pages) {
      const text = `${page.title}\n${page.markdown}`;
      const words = text
        .toLowerCase()
        .replace(/[^a-zàèéìòù\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopWords.has(w));

      const freq = new Map<string, number>();
      for (const w of words) {
        freq.set(w, (freq.get(w) || 0) + 1);
      }

      // Prendi le parole più frequenti come topic
      const topTopics = [...freq.entries()]
        .filter(([, count]) => count >= minWordFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([word]) => word);

      pageTopics.push({ url: page.url, title: page.title, topics: topTopics });
    }

    // Clustering: raggruppa pagine per topic condivisi
    const allTopics = new Set<string>();
    for (const pt of pageTopics) {
      for (const t of pt.topics) {
        allTopics.add(t);
      }
    }

    // Costruisci cluster di topic
    const topicClusters: { topic: string; relatedTopics: string[]; pages: { url: string; title: string }[] }[] = [];
    for (const topic of allTopics) {
      // Pagine che contengono questo topic
      const topicPages = pageTopics
        .filter((pt) => pt.topics.includes(topic))
        .map((pt) => ({ url: pt.url, title: pt.title }));

      // Topic correlati (compaiono nelle stesse pagine)
      const relatedTopics = new Set<string>();
      for (const pt of pageTopics) {
        if (pt.topics.includes(topic)) {
          for (const t of pt.topics) {
            if (t !== topic) relatedTopics.add(t);
          }
        }
      }

      topicClusters.push({
        topic,
        relatedTopics: [...relatedTopics].slice(0, 10),
        pages: topicPages,
      });
    }

    // Ordina cluster per numero di pagine (decrescente)
    topicClusters.sort((a, b) => b.pages.length - a.pages.length);

    // Suggerisci gap (topic che potrebbero essere coperti ma non lo sono)
    const suggestedGaps: string[] = [];
    const coverage = new Set<string>();
    for (const pt of pageTopics) {
      for (const t of pt.topics) {
        coverage.add(t);
      }
    }

    // Se ci sono pochi cluster, suggerisci topic generali correlati al dominio
    if (topicClusters.length < 3) {
      const topTopics = topicClusters.slice(0, 5).map((c) => c.topic);
      suggestedGaps.push(
        `Consider expanding content around: ${topTopics.join(', ')} — try adding sub-topics or related angles.`
      );
    }

    // Gap basati su topic isolati (pagine singole)
    const isolatedTopics = topicClusters.filter((c) => c.pages.length === 1);
    if (isolatedTopics.length > 3) {
      suggestedGaps.push(
        `Found ${isolatedTopics.length} topics covered by only 1 page. Consider expanding these into clusters.`
      );
    }

    res.json({
      success: true,
      totalPages: pages.length,
      totalTopics: allTopics.size,
      clusters: topicClusters.slice(0, 30),
      pageTopics,
      suggestedGaps,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Topic mapping error:', error);
    res.status(500).json({
      error: 'Failed to map topics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ──────────────────────────────────────────────
// 7. POST /api/convert/batch-single
// ──────────────────────────────────────────────
router.post('/convert/batch-single', async (req: Request<{}, {}, {
  urls: string[];
  concurrency?: number;
}>, res: Response): Promise<void> => {
  try {
    const { urls, concurrency = 3 } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      res.status(400).json({ error: 'URLs array is required with at least one URL' });
      return;
    }

    if (urls.length > 500) {
      res.status(400).json({ error: 'Maximum 500 URLs per batch request' });
      return;
    }

    if (concurrency < 1 || concurrency > 20) {
      res.status(400).json({ error: 'Concurrency must be between 1 and 20' });
      return;
    }

    // Valida tutte le URL prima di iniziare
    const invalidUrls = urls.filter((u) => !validateUrl(u));
    if (invalidUrls.length > 0) {
      res.status(400).json({
        error: `Invalid URL(s): ${invalidUrls.join(', ')}`,
      });
      return;
    }

    // Converti con concorrenza controllata
    const results: {
      url: string;
      success: boolean;
      title?: string;
      markdown?: string;
      wordCount?: number;
      error?: string;
    }[] = [];

    const queue = [...urls];
    const inProgress = new Set<Promise<void>>();

    const processUrl = async (u: string): Promise<void> => {
      try {
        const page = await converter.convertSinglePage(u);
        results.push({
          url: u,
          success: true,
          title: page.title,
          markdown: page.markdown,
          wordCount: page.wordCount,
        });
      } catch (error) {
        results.push({
          url: u,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    while (queue.length > 0 || inProgress.size > 0) {
      // Riempi il pool di concorrenza
      while (queue.length > 0 && inProgress.size < concurrency) {
        const u = queue.shift()!;
        const promise = processUrl(u).finally(() => {
          inProgress.delete(promise);
        });
        inProgress.add(promise);
      }

      if (inProgress.size > 0) {
        await Promise.race(inProgress);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      total: results.length,
      successCount,
      failedCount,
      domain: urls.length > 0 ? extractDomain(urls[0]) : undefined,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Batch conversion error:', error);
    res.status(500).json({
      error: 'Failed to batch convert URLs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ──────────────────────────────────────────────
// 8. GET /api/sitemap
// ──────────────────────────────────────────────
router.get('/sitemap', async (req: Request, res: Response): Promise<void> => {
  try {
    const urlParam = req.query.url as string;

    if (!urlParam) {
      res.status(400).json({ error: 'Query parameter "url" is required' });
      return;
    }

    if (!validateUrl(urlParam)) {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }

    const sitemapInfo = await sitemapParser.getSitemapDetails(urlParam);

    if (!sitemapInfo) {
      res.json({
        success: true,
        found: false,
        message: 'No sitemap found for this domain',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      success: true,
      found: true,
      sitemapUrl: sitemapInfo.url,
      type: sitemapInfo.type,
      totalUrls: sitemapInfo.urls.length,
      urls: sitemapInfo.urls.slice(0, 1000), // Limita a 1000 per response
      children: sitemapInfo.children?.map((c) => ({
        url: c.url,
        totalUrls: c.urls.length,
      })),
      status: sitemapInfo.status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sitemap fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch sitemap',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ── Funzioni helper ───────────────────────────

function extractHeadings(markdown: string): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = [];
  const lines = markdown.split('\n');
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
      });
    }
  }
  return headings;
}

function extractSimpleTopics(markdown: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'by', 'with', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
    'we', 'us', 'our', 'you', 'your', 'he', 'she', 'him', 'her', 'his',
  ]);

  const words = markdown
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4 && !stopWords.has(w));

  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

export { router as newEndpointsRouter };
