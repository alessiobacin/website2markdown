import axios, { AxiosInstance, AxiosError } from 'axios';

export interface SinglePageResult {
  url: string;
  title: string;
  markdown: string;
  wordCount: number;
}

export interface ConvertResult {
  success: boolean;
  domain: string;
  totalPages: number;
  pages: SinglePageResult[];
  timestamp: string;
}

// --- Nuovi tipi per i nuovi endpoint ---

export interface DiscoveredUrl {
  url: string;
  source: 'sitemap' | 'robots' | 'crawl';
  lastmod?: string;
}

export interface DiscoverResult {
  success: boolean;
  domain: string;
  totalUrls: number;
  urls: DiscoveredUrl[];
  timestamp: string;
}

export interface ExtractedPage {
  success: boolean;
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
  linksInternalCount: number;
  linksExternalCount: number;
  publishedAt: string | null;
  timestamp: string;
}

export interface DiffResult {
  success: boolean;
  source1: string;
  source2: string;
  stats: {
    wordCount1: number;
    wordCount2: number;
    headingCount1: number;
    headingCount2: number;
    similarityPercent: number;
  };
  differences: {
    headingsMissingInSource2: { level: number; text: string }[];
    headingsMissingInSource1: { level: number; text: string }[];
  };
  topics: {
    common: string[];
    uniqueToSource1: string[];
    uniqueToSource2: string[];
  };
  timestamp: string;
}

export interface SearchResult {
  success: boolean;
  query: string;
  totalResults: number;
  totalMatches: number;
  results: {
    url: string;
    title?: string;
    matches: number;
    contextSnippets: string[];
  }[];
  timestamp: string;
}

export interface ChunkResult {
  success: boolean;
  totalChunks: number;
  maxTokens: number;
  overlap: number;
  chunks: {
    index: number;
    text: string;
    headingPath: string[];
    tokenEstimate: number;
    wordEstimate: number;
    sourceUrl?: string;
  }[];
  timestamp: string;
}

export interface TopicMapResult {
  success: boolean;
  totalPages: number;
  totalTopics: number;
  clusters: {
    topic: string;
    relatedTopics: string[];
    pages: { url: string; title: string }[];
  }[];
  pageTopics: { url: string; title: string; topics: string[] }[];
  suggestedGaps: string[];
  timestamp: string;
}

export interface BatchSingleResult {
  success: boolean;
  total: number;
  successCount: number;
  failedCount: number;
  results: {
    url: string;
    success: boolean;
    title?: string;
    markdown?: string;
    wordCount?: number;
    error?: string;
  }[];
  timestamp: string;
}

export interface SitemapResult {
  success: boolean;
  found: boolean;
  sitemapUrl?: string;
  type?: string;
  totalUrls?: number;
  urls?: { loc: string; lastmod?: string }[];
  children?: { url: string; totalUrls: number }[];
  status?: string;
  timestamp: string;
}

export class ApiClient {
  private client: AxiosInstance;

  constructor(apiUrl: string, apiKey: string) {
    this.client = axios.create({
      baseURL: apiUrl.replace(/\/+$/, ''),
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    });
  }

  // ── Endpoint esistenti ──

  async convertWebsite(url: string, maxPages: number = 100): Promise<ConvertResult> {
    const response = await this.client.post('/api/convert', { url, maxPages });
    return response.data;
  }

  async convertSingle(url: string): Promise<{
    success: boolean;
    url: string;
    title: string;
    markdown: string;
    wordCount: number;
    timestamp: string;
  }> {
    const response = await this.client.post('/api/convert/single', { url });
    return response.data;
  }

  async getStatus(): Promise<Record<string, unknown>> {
    const response = await this.client.get('/api/convert/status');
    return response.data;
  }

  async healthCheck(): Promise<Record<string, unknown>> {
    const response = await this.client.get('/health');
    return response.data;
  }

  async fetchRobotsTxt(url: string): Promise<{
    success: boolean;
    domain: string;
    sourceUrl: string;
    content: string;
  }> {
    const response = await this.client.get('/api/robots-txt', { params: { url } });
    return response.data;
  }

  // ── Nuovi endpoint ──

  async discover(url: string, maxPages: number = 100): Promise<DiscoverResult> {
    const response = await this.client.post('/api/discover', { url, maxPages });
    return response.data;
  }

  async extract(url: string): Promise<ExtractedPage> {
    const response = await this.client.post('/api/extract', { url });
    return response.data;
  }

  async diff(opts: { url1?: string; url2?: string; markdown1?: string; markdown2?: string }): Promise<DiffResult> {
    const response = await this.client.post('/api/diff', opts);
    return response.data;
  }

  async search(opts: {
    query: string;
    pages: { url: string; markdown: string; title?: string }[];
    caseSensitive?: boolean;
  }): Promise<SearchResult> {
    const response = await this.client.post('/api/search', opts);
    return response.data;
  }

  async chunk(opts: {
    markdown?: string;
    url?: string;
    maxTokens?: number;
    overlap?: number;
  }): Promise<ChunkResult> {
    const response = await this.client.post('/api/chunk', opts);
    return response.data;
  }

  async mapTopics(opts: {
    url?: string;
    pages?: { url: string; title: string; markdown: string }[];
    minWordFrequency?: number;
  }): Promise<TopicMapResult> {
    const response = await this.client.post('/api/map-topics', opts);
    return response.data;
  }

  async batchSingle(urls: string[], concurrency: number = 3): Promise<BatchSingleResult> {
    const response = await this.client.post('/api/convert/batch-single', { urls, concurrency });
    return response.data;
  }

  async fetchSitemap(url: string): Promise<SitemapResult> {
    const response = await this.client.get('/api/sitemap', { params: { url } });
    return response.data;
  }

  formatError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: string; message?: string }>;
      if (axiosError.response) {
        const msg = axiosError.response.data?.error || axiosError.response.data?.message || axiosError.message;
        return `Errore ${axiosError.response.status}: ${msg}`;
      }
      if (axiosError.code === 'ECONNREFUSED') {
        return `Connessione rifiutata — il server è in esecuzione su ${this.client.defaults.baseURL}?`;
      }
      return `Errore di connessione: ${axiosError.message}`;
    }
    if (error instanceof Error) {
      return `Errore: ${error.message}`;
    }
    return `Errore sconosciuto: ${String(error)}`;
  }
}
