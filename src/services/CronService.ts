import cron, { ScheduledTask } from 'node-cron';
import { getDatabaseService } from '../db/database';
import { getWebhookService } from './WebhookService';
import { WebsiteConverter } from './WebsiteConverter';
import { PageExtractor } from './PageExtractor';
import { MonitoredSite, SiteChange } from '../types/monitoring';

interface ScanResult {
  newUrls: string[];
  changesCount: number;
}

let instance: CronService | null = null;

export class CronService {
  private jobs: Map<string, ScheduledTask> = new Map();
  private converter: WebsiteConverter;
  private extractor: PageExtractor;
  private running: boolean = false;

  constructor() {
    this.converter = new WebsiteConverter();
    this.extractor = new PageExtractor();
  }

  start(): void {
    const db = getDatabaseService();
    const sites = db.getAllSites();

    for (const site of sites) {
      if (site.is_active) {
        this.startSiteJob(site);
      }
    }

    console.log(`⏰ CronService avviato con ${sites.filter(s => s.is_active).length} job attivi`);
  }

  stop(): void {
    for (const [siteId] of this.jobs) {
      this.stopSiteJob(siteId);
    }
    console.log('⏰ CronService arrestato');
  }

  startSiteJob(site: MonitoredSite): void {
    this.stopSiteJob(site.id);

    if (!cron.validate(site.cron_expression)) {
      console.warn(`⏰ Cron expression non valida per ${site.url}: ${site.cron_expression}`);
      return;
    }

    const task = cron.schedule(site.cron_expression, async () => {
      console.log(`⏰ Esecuzione job per ${site.url}`);
      try {
        const result = await this.scanSite(site);
        if (result.changesCount > 0) {
          console.log(`⏰ Rilevate ${result.changesCount} modifiche per ${site.url}`);
        }
      } catch (error) {
        console.error(`⏰ Errore job per ${site.url}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    });

    this.jobs.set(site.id, task);
    console.log(`⏰ Job avviato per ${site.url} (${site.cron_expression})`);
  }

  stopSiteJob(siteId: string): void {
    const task = this.jobs.get(siteId);
    if (task) {
      task.stop();
      this.jobs.delete(siteId);
      console.log(`⏰ Job fermato per siteId: ${siteId}`);
    }
  }

  async checkOnce(siteId?: string): Promise<void> {
    const db = getDatabaseService();

    if (siteId) {
      const site = db.getSite(siteId);
      if (!site) {
        throw new Error(`Sito non trovato: ${siteId}`);
      }
      await this.scanSite(site);
    } else {
      const sites = db.getAllSites();
      for (const site of sites) {
        if (site.is_active) {
          await this.scanSite(site);
        }
      }
    }
  }

  async scanSite(site: MonitoredSite): Promise<ScanResult> {
    const db = getDatabaseService();
    const newUrls: string[] = [];
    let changesCount = 0;

    try {
      const discovered = await this.converter.discoverUrls(site.url, 500);
      const seenUrls = new Set(db.getSeenUrlsBySiteId(site.id));

      for (const page of discovered.urls) {
        if (seenUrls.has(page.url)) continue;
        newUrls.push(page.url);
        changesCount++;
      }

      // Extract content for new URLs (max 20 per scan)
      const batch = newUrls.slice(0, 20);
      const savedChanges: SiteChange[] = [];

      for (const url of batch) {
        try {
          const extracted = await this.extractor.extract(url);
          const change = db.addChange(site.id, url, extracted.title || null, extracted.markdown || null);
          savedChanges.push(change);
        } catch {
          const change = db.addChange(site.id, url, null, null);
          savedChanges.push(change);
        }
      }

      // Webhook notification
      if (site.webhook_url && savedChanges.length > 0) {
        const webhookService = getWebhookService();
        const result = await webhookService.notifyChanges(
          site.url,
          site.id,
          savedChanges,
          site.webhook_url
        );
        console.log(`🔔 Webhook: ${result.notified} notificati, ${result.failed} falliti`);
      }

      db.updateLastCheckedAt(site.id);
      return { newUrls, changesCount };
    } catch (error) {
      console.error(`Errore scansione ${site.url}:`, error instanceof Error ? error.message : 'Unknown error');
      return { newUrls: [], changesCount: 0 };
    }
  }
}

export function getCronService(): CronService {
  if (!instance) {
    instance = new CronService();
  }
  return instance;
}
