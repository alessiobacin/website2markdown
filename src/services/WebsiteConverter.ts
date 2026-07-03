import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { parseString } from 'xml2js';
import { extractDomain, normalizeUrl } from '../utils/validation';
import { SitemapParser } from './SitemapParser';
import { RobotsParser } from './RobotsParser';

export interface PageContent {
  url: string;
  title: string;
  markdown: string;
  wordCount: number;
}

export interface ConversionResult {
  domain: string;
  pages: PageContent[];
}

export interface DiscoveredUrl {
  url: string;
  source: 'sitemap' | 'robots' | 'crawl';
  lastmod?: string;
}

export class WebsiteConverter {
  private turndownService: TurndownService;
  private sitemapParser: SitemapParser;
  private robotsParser: RobotsParser;
  private readonly timeout: number;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-'
    });
    
    this.sitemapParser = new SitemapParser();
    this.robotsParser = new RobotsParser();
    this.timeout = parseInt(process.env.REQUEST_TIMEOUT || '30000');
  }

  /**
   * Converte una singola pagina web in markdown
   */
  async convertSinglePage(url: string): Promise<PageContent> {
    const normalizedUrl = normalizeUrl(url);
    console.log(`🔄 Converting single page: ${normalizedUrl}`);
    
    return await this.convertPageToMarkdown(normalizedUrl);
  }

  /**
   * Converte un sito web in markdown
   */
  async convertWebsiteToMarkdown(url: string, maxPages: number = 100): Promise<ConversionResult> {
    const domain = extractDomain(url);
    const baseUrl = normalizeUrl(url);

    console.log(`🔍 Discovering pages for domain: ${domain}`);
    
    // Scopri tutte le pagine del sito
    const discoveredUrls = await this.discoverAllPages(baseUrl, maxPages);
    
    console.log(`📄 Found ${discoveredUrls.length} pages to convert`);
    
    // Converti ogni pagina in markdown
    const pages: PageContent[] = [];
    
    for (let i = 0; i < discoveredUrls.length; i++) {
      try {
        console.log(`⚡ Converting page ${i + 1}/${discoveredUrls.length}: ${discoveredUrls[i]}`);
        const pageContent = await this.convertPageToMarkdown(discoveredUrls[i]);
        pages.push(pageContent);
      } catch (error) {
        console.error(`❌ Failed to convert ${discoveredUrls[i]}:`, error);
        // Continua con le altre pagine anche se una fallisce
      }
    }

    return {
      domain,
      pages
    };
  }

  /**
   * Scopre tutte le pagine di un sito web e restituisce URL con sorgente e metadata
   */
  async discoverUrls(url: string, maxPages: number = 100): Promise<{ domain: string; urls: DiscoveredUrl[] }> {
    const domain = extractDomain(url);
    const baseUrl = normalizeUrl(url);
    const isUnlimited = maxPages === 0;
    const result: DiscoveredUrl[] = [];
    const seen = new Set<string>();

    console.log(`🔍 Discovering pages for domain: ${domain}`);

    // 1. Sitemap
    try {
      console.log('🗺️  Checking sitemap...');
      const sitemapUrls = await this.sitemapParser.getSitemapUrls(baseUrl);
      for (const entry of sitemapUrls) {
        const u = typeof entry === 'string' ? entry : entry;
        if (this.isValidPageUrl(u, domain) && !seen.has(u)) {
          seen.add(u);
          result.push({ url: u, source: 'sitemap' });
        }
      }
      console.log(`Found from sitemap: ${sitemapUrls.length}`);
    } catch {
      console.log('No sitemap found');
    }

    // 2. Robots.txt
    try {
      console.log('🤖 Checking robots.txt...');
      const robotsUrls = await this.robotsParser.getRobotsUrls(baseUrl);
      for (const u of robotsUrls) {
        if (this.isValidPageUrl(u, domain) && !seen.has(u)) {
          seen.add(u);
          result.push({ url: u, source: 'robots' });
        }
      }
      console.log(`Found from robots.txt: ${robotsUrls.length}`);
    } catch {
      console.log('No robots.txt found');
    }

    // 3. Crawl homepage
    try {
      console.log('🕷️  Crawling homepage...');
      const crawledUrls = await this.crawlPageForLinks(baseUrl, domain);
      for (const u of crawledUrls) {
        if (this.isValidPageUrl(u, domain) && !seen.has(u) && (isUnlimited || result.length < maxPages)) {
          seen.add(u);
          result.push({ url: u, source: 'crawl' });
        }
      }
      console.log(`Found from crawl: ${crawledUrls.length}`);
    } catch {
      console.log('Error crawling homepage');
    }

    // 4. Se nessun URL trovato, almeno la homepage
    if (result.length === 0) {
      result.push({ url: baseUrl, source: 'crawl' });
    }

    const limited = isUnlimited ? result : result.slice(0, maxPages);
    console.log(`Total discovered: ${limited.length}${isUnlimited ? ' (unlimited)' : ''}`);
    return { domain, urls: limited };
  }

  /**
   * Scopre tutte le pagine di un sito web (metodo interno, legacy)
   */
  private async discoverAllPages(baseUrl: string, maxPages: number): Promise<string[]> {
    const urls = new Set<string>();
    const domain = extractDomain(baseUrl);
    const isUnlimited = maxPages === 0; // Se maxPages è 0, scarica tutto
    
    if (isUnlimited) {
      console.log('🌐 Unlimited mode: discovering ALL pages from the website');
    }

    try {
      // 1. Prova a ottenere URLs dalla sitemap
      console.log('🗺️  Checking sitemap...');
      const sitemapUrls = await this.sitemapParser.getSitemapUrls(baseUrl);
      sitemapUrls.forEach((url: string) => {
          if (this.isValidPageUrl(url, domain)) {
            urls.add(url);
          }
        });
      console.log(`Found ${sitemapUrls.length} URLs from sitemap`);
    } catch (error) {
      console.log('No sitemap found or error parsing sitemap');
    }

    try {
      // 2. Prova a ottenere URLs da robots.txt
      console.log('🤖 Checking robots.txt...');
      const robotsUrls = await this.robotsParser.getRobotsUrls(baseUrl);
      robotsUrls.forEach((url: string) => {
          if (this.isValidPageUrl(url, domain)) {
            urls.add(url);
          }
        });
      console.log(`Found ${robotsUrls.length} additional URLs from robots.txt`);
    } catch (error) {
      console.log('No robots.txt found or error parsing robots.txt');
    }

    // 3. Crawl della homepage per trovare link interni
    console.log('🕷️  Crawling homepage for internal links...');
    try {
      const crawledUrls = await this.crawlPageForLinks(baseUrl, domain);
      crawledUrls.forEach((url: string) => {
         if (this.isValidPageUrl(url, domain)) {
           urls.add(url);
         }
       });
      console.log(`Found ${crawledUrls.length} URLs from homepage crawling`);
    } catch (error) {
      console.log('Error crawling homepage:', error);
    }

    // 4. Crawling secondario più aggressivo
    const shouldContinueCrawling = isUnlimited || (urls.size < maxPages && urls.size > 0);
    if (shouldContinueCrawling) {
      console.log('🔍 Crawling discovered pages for more links...');
      // In modalità unlimited, processa più pagine per il crawling secondario
      const secondaryCrawlLimit = isUnlimited ? Math.min(50, urls.size) : Math.min(25, urls.size);
      const urlsToProcess = Array.from(urls).slice(0, secondaryCrawlLimit);
      
      for (const url of urlsToProcess) {
        if (!isUnlimited && urls.size >= maxPages) break;
        
        try {
          const pageUrls = await this.crawlPageForLinks(url, domain);
          pageUrls.forEach((pageUrl: string) => {
             if (this.isValidPageUrl(pageUrl, domain) && (isUnlimited || urls.size < maxPages)) {
               urls.add(pageUrl);
             }
           });
          
          // Crawling speciale per pagine blog/archivi - più aggressivo
          if (url.includes('/blog') || url.includes('/post') || url.includes('/articoli') || url.includes('/news') || url.includes('/article')) {
            console.log(`🔍 Deep crawling blog/archive page: ${url}`);
            // Cerca link di paginazione - più pagine in modalità unlimited
            const maxPaginationPages = isUnlimited ? 20 : 10;
            for (let page = 2; page <= maxPaginationPages && (isUnlimited || urls.size < maxPages); page++) {
              const paginatedUrl = `${url.replace(/\/$/, '')}/page/${page}/`;
              try {
                const paginatedUrls = await this.crawlPageForLinks(paginatedUrl, domain);
                let foundNewUrls = false;
                paginatedUrls.forEach((pageUrl: string) => {
                   if (this.isValidPageUrl(pageUrl, domain) && (isUnlimited || urls.size < maxPages)) {
                     const sizeBefore = urls.size;
                     urls.add(pageUrl);
                     if (urls.size > sizeBefore) foundNewUrls = true;
                   }
                 });
                // Se non troviamo nuovi URL, probabilmente abbiamo raggiunto la fine
                if (!foundNewUrls && !isUnlimited) break;
              } catch (error) {
                // Ignora errori di paginazione
                break;
              }
            }
          }
        } catch (error) {
          console.log(`Error crawling ${url}:`, error);
        }
      }
      console.log(`Total URLs after secondary crawling: ${urls.size}`);
    }

    // 5. Se non abbiamo trovato URLs, aggiungi almeno la homepage
    if (urls.size === 0) {
      urls.add(baseUrl);
      console.log('No URLs found, using homepage only');
    }

    // Limita il numero di pagine solo se non è modalità unlimited
    const urlArray = isUnlimited ? Array.from(urls) : Array.from(urls).slice(0, maxPages);
    console.log(`Final URL count: ${urlArray.length}${isUnlimited ? ' (unlimited mode)' : ''}`);
    return urlArray;
  }

  /**
   * Converte una singola pagina in markdown
   */
  private async convertPageToMarkdown(url: string): Promise<PageContent> {
    const response = await axios.get(url, {
      timeout: this.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebsiteToMarkdown/1.0)'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Rimuovi elementi non necessari
    $('script, style, nav, footer, aside, .advertisement, .ads').remove();
    
    // Estrai il titolo
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';
    
    // Estrai il contenuto principale
    let content = '';
    const mainContent = $('main, article, .content, .post, .entry');
    
    if (mainContent.length > 0) {
      content = mainContent.html() || '';
    } else {
      // Fallback: usa il body ma rimuovi header, nav, footer
      $('header, nav, footer, aside').remove();
      content = $('body').html() || '';
    }
    
    // Converti in markdown
    const markdown = this.turndownService.turndown(content);
    
    // Conta le parole
    const wordCount = markdown.split(/\s+/).filter((word: string) => word.length > 0).length;
    
    return {
      url,
      title,
      markdown,
      wordCount
    };
  }

  /**
   * Crawl di una pagina per trovare link interni
   */
  private async crawlPageForLinks(url: string, domain: string): Promise<string[]> {
    const urls: string[] = [];
    
    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WebsiteConverter/1.0)'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Estrai tutti i link dalla pagina
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          try {
            // Converti link relativi in assoluti
            const absoluteUrl = new URL(href, url).toString();
            const linkDomain = extractDomain(absoluteUrl);
            
            // Aggiungi solo link interni al dominio
            if (linkDomain === domain && this.isValidPageUrl(absoluteUrl, domain)) {
              urls.push(absoluteUrl);
            }
          } catch (error) {
            // Ignora URL non validi
          }
        }
      });
      
    } catch (error) {
      console.log(`Error crawling ${url}:`, error);
    }
    
    // Rimuovi duplicati
    return [...new Set(urls)];
  }

  /**
   * Verifica se un URL è valido per il dominio specificato
   */
  private isValidPageUrl(url: string, domain: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const urlDomain = parsedUrl.hostname.replace(/^www\./, '');
      const targetDomain = domain.replace(/^www\./, '');
      
      return urlDomain === targetDomain && 
             !parsedUrl.pathname.match(/\.(pdf|jpg|jpeg|png|gif|zip|rar|exe|dmg)$/i);
    } catch {
      return false;
    }
  }
}