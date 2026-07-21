import axios from 'axios';
import { SiteChange } from '../types/monitoring';
import { getDatabaseService } from '../db/database';

export class WebhookService {
  async notifyChange(
    siteUrl: string,
    siteId: string,
    change: SiteChange,
    webhookUrl: string
  ): Promise<boolean> {
    try {
      const payload = {
        event: 'site.change.detected',
        site: { id: siteId, url: siteUrl },
        change: {
          id: change.id,
          url: change.url,
          title: change.title,
          discovered_at: change.discovered_at,
        },
        timestamp: new Date().toISOString(),
      };

      await axios.post(webhookUrl, payload, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      });

      getDatabaseService().markChangesNotified([change.id]);
      return true;
    } catch (error) {
      console.error('[Webhook] Failed to notify', webhookUrl, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  async notifyChanges(
    siteUrl: string,
    siteId: string,
    changes: SiteChange[],
    webhookUrl: string
  ): Promise<{ notified: number; failed: number }> {
    let notified = 0;
    let failed = 0;

    for (const change of changes) {
      const ok = await this.notifyChange(siteUrl, siteId, change, webhookUrl);
      if (ok) notified++;
      else failed++;
    }

    return { notified, failed };
  }
}

let instance: WebhookService | null = null;
export function getWebhookService(): WebhookService {
  if (!instance) instance = new WebhookService();
  return instance;
}
