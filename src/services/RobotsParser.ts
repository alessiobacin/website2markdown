import axios from 'axios';
import { extractDomain } from '../utils/validation';

export class RobotsParser {
  private readonly timeout: number;

  constructor() {
    this.timeout = parseInt(process.env.REQUEST_TIMEOUT || '30000');
  }

  /**
   * Ottiene gli URL delle sitemap dal file robots.txt
   */
  async getRobotsUrls(baseUrl: string): Promise<string[]> {
    const domain = extractDomain(baseUrl);
    const robotsUrl = `https://${domain}/robots.txt`;
    
    try {
      const response = await axios.get(robotsUrl, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WebsiteToMarkdown/1.0)'
        }
      });

      return this.parseRobotsContent(response.data);
    } catch (error) {
      // Se robots.txt non esiste o non è accessibile, ritorna array vuoto
      return [];
    }
  }

  /**
   * Analizza il contenuto del file robots.txt per trovare sitemap
   */
  private parseRobotsContent(content: string): string[] {
    const sitemapUrls: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Cerca righe che iniziano con "Sitemap:"
      if (trimmedLine.toLowerCase().startsWith('sitemap:')) {
        const sitemapUrl = trimmedLine.substring(8).trim(); // Rimuove "Sitemap:"
        
        if (sitemapUrl && this.isValidUrl(sitemapUrl)) {
          sitemapUrls.push(sitemapUrl);
        }
      }
    }

    return sitemapUrls;
  }

  /**
   * Verifica se una stringa è un URL valido
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}