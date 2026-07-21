import Database from 'better-sqlite3';
import path from 'path';
import { MonitoredSite, SiteChange, CreateMonitoredSiteInput, UpdateMonitoredSiteInput } from '../types/monitoring';

const uuidv4 = () => require('crypto').randomUUID();

let instance: DatabaseService | null = null;

export class DatabaseService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(process.cwd(), 'data', 'monitoring.sqlite');
  }

  initialize(): void {
    const fs = require('fs');
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.createTables();
  }

  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS monitored_sites (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        cron_expression TEXT NOT NULL DEFAULT '0 6 * * *',
        webhook_url TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        last_checked_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS site_changes (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        url TEXT NOT NULL,
        title TEXT,
        type TEXT NOT NULL CHECK(type IN ('added', 'modified', 'removed')),
        diff_summary TEXT,
        discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
        notified INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES monitored_sites(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_site_changes_site_id ON site_changes(site_id);
      CREATE INDEX IF NOT EXISTS idx_monitored_sites_url ON monitored_sites(url);
    `);
  }

  getAllSites(): MonitoredSite[] {
    if (!this.db) throw new Error('Database not initialized');
    const rows = this.db.prepare('SELECT * FROM monitored_sites ORDER BY created_at DESC').all() as any[];
    return rows.map(this.mapSiteRow);
  }

  getSite(id: string): MonitoredSite | undefined {
    if (!this.db) throw new Error('Database not initialized');
    const row = this.db.prepare('SELECT * FROM monitored_sites WHERE id = ?').get(id) as any;
    return row ? this.mapSiteRow(row) : undefined;
  }

  getSiteByUrl(url: string): MonitoredSite | undefined {
    if (!this.db) throw new Error('Database not initialized');
    const row = this.db.prepare('SELECT * FROM monitored_sites WHERE url = ?').get(url) as any;
    return row ? this.mapSiteRow(row) : undefined;
  }

  addSite(input: CreateMonitoredSiteInput): MonitoredSite {
    if (!this.db) throw new Error('Database not initialized');
    const id = uuidv4();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO monitored_sites (id, url, name, cron_expression, webhook_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, input.url, input.name || '', input.cron_expression || '0 6 * * *', input.webhook_url || null, now, now);

    return this.getSite(id)!;
  }

  updateSite(id: string, input: UpdateMonitoredSiteInput): MonitoredSite | undefined {
    if (!this.db) throw new Error('Database not initialized');
    const existing = this.getSite(id);
    if (!existing) return undefined;

    const fields: string[] = [];
    const values: any[] = [];

    if (input.url !== undefined) { fields.push('url = ?'); values.push(input.url); }
    if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
    if (input.cron_expression !== undefined) { fields.push('cron_expression = ?'); values.push(input.cron_expression); }
    if (input.webhook_url !== undefined) { fields.push('webhook_url = ?'); values.push(input.webhook_url); }
    if (input.is_active !== undefined) { fields.push('is_active = ?'); values.push(input.is_active ? 1 : 0); }

    if (fields.length === 0) return existing;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    this.db.prepare(`UPDATE monitored_sites SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getSite(id);
  }

  updateLastCheckedAt(id: string): void {
    if (!this.db) throw new Error('Database not initialized');
    const now = new Date().toISOString();
    this.db.prepare('UPDATE monitored_sites SET last_checked_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);
  }

  deleteSite(id: string): boolean {
    if (!this.db) throw new Error('Database not initialized');
    const result = this.db.prepare('DELETE FROM monitored_sites WHERE id = ?').run(id);
    return result.changes > 0;
  }

  getChangesBySiteId(siteId: string): SiteChange[] {
    if (!this.db) throw new Error('Database not initialized');
    const rows = this.db.prepare(
      'SELECT * FROM site_changes WHERE site_id = ? ORDER BY discovered_at DESC'
    ).all(siteId) as any[];
    return rows.map(this.mapChangeRow);
  }

  getSeenUrlsBySiteId(siteId: string): string[] {
    if (!this.db) throw new Error('Database not initialized');
    const rows = this.db.prepare('SELECT DISTINCT url FROM site_changes WHERE site_id = ?').all(siteId) as any[];
    return rows.map((r: any) => r.url);
  }

  addChange(siteId: string, url: string, title: string | null, _markdown: string | null): SiteChange {
    if (!this.db) throw new Error('Database not initialized');
    const id = uuidv4();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO site_changes (id, site_id, url, title, type, discovered_at, notified, created_at)
      VALUES (?, ?, ?, ?, 'added', ?, 0, ?)
    `).run(id, siteId, url, title, now, now);

    return {
      id,
      site_id: siteId,
      url,
      title: title || undefined,
      type: 'added',
      discovered_at: now,
      notified: false,
      created_at: now,
    };
  }

  markChangesNotified(changeIds: string[]): void {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('UPDATE site_changes SET notified = 1 WHERE id = ?');
    const tx = this.db.transaction((ids: string[]) => {
      for (const id of ids) {
        stmt.run(id);
      }
    });
    tx(changeIds);
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private mapSiteRow(row: any): MonitoredSite {
    return {
      id: row.id,
      url: row.url,
      name: row.name,
      cron_expression: row.cron_expression,
      webhook_url: row.webhook_url || undefined,
      is_active: row.is_active === 1,
      last_checked_at: row.last_checked_at || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapChangeRow(row: any): SiteChange {
    return {
      id: row.id,
      site_id: row.site_id,
      url: row.url,
      title: row.title || undefined,
      type: row.type,
      diff_summary: row.diff_summary || undefined,
      discovered_at: row.discovered_at,
      notified: row.notified === 1,
      created_at: row.created_at,
    };
  }
}

export function getDatabaseService(dbPath?: string): DatabaseService {
  if (!instance) {
    instance = new DatabaseService(dbPath);
  }
  return instance;
}
