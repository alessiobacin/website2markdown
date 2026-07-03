import axios from 'axios';
import { parseString } from 'xml2js';
import { extractDomain } from '../utils/validation';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

export interface SitemapInfo {
  url: string;
  status: 'ok' | 'error';
  error?: string;
  urls: SitemapEntry[];
  type: 'sitemap' | 'sitemapindex';
  children?: SitemapInfo[];
}

export class SitemapParser {
  private readonly timeout: number;

  constructor() {
    this.timeout = parseInt(process.env.REQUEST_TIMEOUT || '30000');
  }

  /**
   * Ottiene tutti gli URL dalla sitemap di un sito
   */
  async getSitemapUrls(baseUrl: string): Promise<string[]> {
    const urls: string[] = [];
    const domain = extractDomain(baseUrl);
    
    // Lista di possibili percorsi per la sitemap
    const sitemapPaths = [
      '/sitemap.xml',
      '/sitemap_index.xml',
      '/sitemap1.xml',
      '/sitemaps.xml',
      '/sitemap/sitemap.xml'
    ];

    for (const path of sitemapPaths) {
      try {
        const sitemapUrl = `https://${domain}${path}`;
        const sitemapUrls = await this.parseSitemap(sitemapUrl);
        urls.push(...sitemapUrls.map(e => e.loc));
        
        if (urls.length > 0) {
          break; // Se troviamo una sitemap valida, fermiamoci
        }
      } catch (error) {
        // Continua con il prossimo percorso
        continue;
      }
    }

    // Rimuovi duplicati
    return [...new Set(urls)];
  }

  /**
   * Ottiene informazioni dettagliate sulla sitemap (URL + lastmod)
   */
  async getSitemapDetails(baseUrl: string): Promise<SitemapInfo | null> {
    const domain = extractDomain(baseUrl);
    
    const sitemapPaths = [
      '/sitemap.xml',
      '/sitemap_index.xml',
      '/sitemap1.xml',
      '/sitemaps.xml',
      '/sitemap/sitemap.xml'
    ];

    for (const path of sitemapPaths) {
      try {
        const sitemapUrl = `https://${domain}${path}`;
        return await this.parseSitemapDetail(sitemapUrl);
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Analizza una sitemap e restituisce info dettagliate
   */
  private async parseSitemapDetail(sitemapUrl: string): Promise<SitemapInfo> {
    const response = await axios.get(sitemapUrl, {
      timeout: this.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebsiteToMarkdown/1.0)'
      }
    });

    return new Promise((resolve, reject) => {
      parseString(response.data, (err: any, result: any) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          // Sitemap index
          if (result.sitemapindex && result.sitemapindex.sitemap) {
            const info: SitemapInfo = {
              url: sitemapUrl,
              status: 'ok',
              urls: [],
              type: 'sitemapindex',
              children: [],
            };

            const sitemaps = Array.isArray(result.sitemapindex.sitemap)
              ? result.sitemapindex.sitemap
              : [result.sitemapindex.sitemap];

            const childPromises = sitemaps.map(async (s: any) => {
              if (s.loc && s.loc[0]) {
                try {
                  const childInfo = await this.parseSitemapDetail(s.loc[0]);
                  info.children!.push(childInfo);
                  if (childInfo.type === 'sitemapindex') {
                    for (const child of childInfo.children || []) {
                      info.urls.push(...child.urls);
                    }
                  } else {
                    info.urls.push(...childInfo.urls);
                  }
                } catch {
                  // Ignora errori delle sitemap figlie
                }
              }
            });

            Promise.all(childPromises).then(() => resolve(info)).catch(() => resolve(info));
            return;
          }

          // Sitemap normale
          if (result.urlset && result.urlset.url) {
            const entries: SitemapEntry[] = [];
            const urlEntries = Array.isArray(result.urlset.url)
              ? result.urlset.url
              : [result.urlset.url];

            for (const urlEntry of urlEntries) {
              if (urlEntry.loc && urlEntry.loc[0]) {
                entries.push({
                  loc: urlEntry.loc[0],
                  lastmod: urlEntry.lastmod ? urlEntry.lastmod[0] : undefined,
                  changefreq: urlEntry.changefreq ? urlEntry.changefreq[0] : undefined,
                  priority: urlEntry.priority ? urlEntry.priority[0] : undefined,
                });
              }
            }

            resolve({
              url: sitemapUrl,
              status: 'ok',
              urls: entries,
              type: 'sitemap',
            });
            return;
          }

          // Fallback: nessuna struttura riconosciuta
          reject(new Error('Unrecognized sitemap format'));
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
  }

  /**
   * Analizza una singola sitemap XML (restituisce solo URL)
   */
  private async parseSitemap(sitemapUrl: string): Promise<SitemapEntry[]> {
    const response = await axios.get(sitemapUrl, {
      timeout: this.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebsiteToMarkdown/1.0)'
      }
    });

    return new Promise((resolve, reject) => {
      parseString(response.data, (err: any, result: any) => {
        if (err) {
          reject(err);
          return;
        }

        if (!result) {
          resolve([]);
          return;
        }

        const entries: SitemapEntry[] = [];

        try {
          // Gestisce sitemap index
          if (result.sitemapindex && result.sitemapindex.sitemap) {
            const sitemaps = Array.isArray(result.sitemapindex.sitemap) 
              ? result.sitemapindex.sitemap 
              : [result.sitemapindex.sitemap];
            
            const childPromises = sitemaps.map(async (s: any) => {
              if (s.loc && s.loc[0]) {
                try {
                  const childEntries = await this.parseSitemap(s.loc[0]);
                  entries.push(...childEntries);
                } catch {} // Ignora errori
              }
            });

            Promise.all(childPromises).then(() => resolve(entries)).catch(() => resolve(entries));
            return;
          }

          // Gestisce sitemap normale
          if (result.urlset && result.urlset.url) {
            const urlEntries = Array.isArray(result.urlset.url) 
              ? result.urlset.url 
              : [result.urlset.url];
            
            for (const urlEntry of urlEntries) {
              if (urlEntry.loc && urlEntry.loc[0]) {
                entries.push({
                  loc: urlEntry.loc[0],
                  lastmod: urlEntry.lastmod ? urlEntry.lastmod[0] : undefined,
                });
              }
            }
          }

          resolve(entries);
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
  }
}