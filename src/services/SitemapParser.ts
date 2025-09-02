import axios from 'axios';
import { parseString } from 'xml2js';
import { extractDomain } from '../utils/validation';

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
        urls.push(...sitemapUrls);
        
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
   * Analizza una singola sitemap XML
   */
  private async parseSitemap(sitemapUrl: string): Promise<string[]> {
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

        const urls: string[] = [];

        try {
          // Gestisce sitemap index (che contiene riferimenti ad altre sitemap)
          if (result.sitemapindex && result.sitemapindex.sitemap) {
            const sitemaps = Array.isArray(result.sitemapindex.sitemap) 
              ? result.sitemapindex.sitemap 
              : [result.sitemapindex.sitemap];
            
            for (const sitemap of sitemaps) {
              if (sitemap.loc && sitemap.loc[0]) {
                // Ricorsivamente analizza le sitemap figlie
                this.parseSitemap(sitemap.loc[0])
                  .then(childUrls => urls.push(...childUrls))
                  .catch(() => {}); // Ignora errori delle sitemap figlie
              }
            }
          }

          // Gestisce sitemap normale (che contiene URL delle pagine)
          if (result.urlset && result.urlset.url) {
            const urlEntries = Array.isArray(result.urlset.url) 
              ? result.urlset.url 
              : [result.urlset.url];
            
            for (const urlEntry of urlEntries) {
              if (urlEntry.loc && urlEntry.loc[0]) {
                urls.push(urlEntry.loc[0]);
              }
            }
          }

          resolve(urls);
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
  }
}