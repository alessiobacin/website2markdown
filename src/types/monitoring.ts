export interface MonitoredSite {
  id: string;
  url: string;
  name: string;
  cron_expression: string;
  webhook_url?: string;
  is_active: boolean;
  last_checked_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SiteChange {
  id: string;
  site_id: string;
  url: string;
  title?: string;
  type: 'added' | 'modified' | 'removed';
  diff_summary?: string;
  discovered_at: string;
  notified: boolean;
  created_at: string;
}

export interface CreateMonitoredSiteInput {
  url: string;
  name?: string;
  cron_expression?: string;
  webhook_url?: string;
}

export interface UpdateMonitoredSiteInput {
  url?: string;
  name?: string;
  cron_expression?: string;
  webhook_url?: string;
  is_active?: boolean;
}
