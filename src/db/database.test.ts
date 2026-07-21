import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from './database';

describe('DatabaseService', () => {
  let db: DatabaseService;

  beforeEach(() => {
    db = new DatabaseService(':memory:');
    db.initialize();
  });

  afterEach(() => {
    db.close();
  });

  describe('initialize', () => {
    it('should create tables and allow operations', () => {
      const sites = db.getAllSites();
      expect(sites).toEqual([]);
    });
  });

  describe('CRUD monitored_sites', () => {
    it('should add a site and return it', () => {
      const site = db.addSite({ url: 'https://example.com', name: 'Example' });

      expect(site.id).toBeTruthy();
      expect(site.url).toBe('https://example.com');
      expect(site.name).toBe('Example');
      expect(site.cron_expression).toBe('0 6 * * *');
      expect(site.is_active).toBe(true);
      expect(site.webhook_url).toBeUndefined();
      expect(site.created_at).toBeTruthy();
      expect(site.updated_at).toBeTruthy();
    });

    it('should add a site with all optional fields', () => {
      const site = db.addSite({
        url: 'https://test.com',
        name: 'Test',
        cron_expression: '0 */2 * * *',
        webhook_url: 'https://hooks.example.com',
      });

      expect(site.url).toBe('https://test.com');
      expect(site.name).toBe('Test');
      expect(site.cron_expression).toBe('0 */2 * * *');
      expect(site.webhook_url).toBe('https://hooks.example.com');
    });

    it('should get a site by id', () => {
      const added = db.addSite({ url: 'https://get-test.com' });
      const found = db.getSite(added.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(added.id);
      expect(found!.url).toBe('https://get-test.com');
    });

    it('should return undefined when getting a non-existent site', () => {
      const found = db.getSite('non-existent-id');
      expect(found).toBeUndefined();
    });

    it('should get a site by url', () => {
      db.addSite({ url: 'https://by-url.com', name: 'ByUrl' });
      const found = db.getSiteByUrl('https://by-url.com');

      expect(found).toBeDefined();
      expect(found!.name).toBe('ByUrl');
    });

    it('should return undefined when getting a site by non-existent url', () => {
      const found = db.getSiteByUrl('https://unknown.com');
      expect(found).toBeUndefined();
    });

    it('should get all sites', () => {
      db.addSite({ url: 'https://site1.com', name: 'Site1' });
      db.addSite({ url: 'https://site2.com', name: 'Site2' });

      const all = db.getAllSites();
      expect(all).toHaveLength(2);
      expect(all.map(s => s.name)).toContain('Site1');
      expect(all.map(s => s.name)).toContain('Site2');
    });

    it('should update a site', () => {
      const added = db.addSite({ url: 'https://update-test.com', name: 'OldName' });
      const updated = db.updateSite(added.id, { name: 'NewName', webhook_url: 'https://hook.new' });

      expect(updated).toBeDefined();
      expect(updated!.name).toBe('NewName');
      expect(updated!.webhook_url).toBe('https://hook.new');
      expect(updated!.url).toBe('https://update-test.com');
    });

    it('should deactivate a site', () => {
      const added = db.addSite({ url: 'https://deactivate-test.com' });
      const updated = db.updateSite(added.id, { is_active: false });

      expect(updated).toBeDefined();
      expect(updated!.is_active).toBe(false);
    });

    it('should return undefined when updating a non-existent site', () => {
      const updated = db.updateSite('non-existent', { name: 'Nope' });
      expect(updated).toBeUndefined();
    });

    it('should return the existing site when no fields to update', () => {
      const added = db.addSite({ url: 'https://no-change.com' });
      const updated = db.updateSite(added.id, {});
      expect(updated).toBeDefined();
      expect(updated!.id).toBe(added.id);
    });

    it('should delete a site and return true', () => {
      const added = db.addSite({ url: 'https://delete-test.com' });
      const deleted = db.deleteSite(added.id);
      expect(deleted).toBe(true);

      const found = db.getSite(added.id);
      expect(found).toBeUndefined();
    });

    it('should return false when deleting a non-existent site', () => {
      const deleted = db.deleteSite('non-existent');
      expect(deleted).toBe(false);
    });

    it('should update last_checked_at', () => {
      const added = db.addSite({ url: 'https://checked-test.com' });
      expect(added.last_checked_at).toBeUndefined();

      db.updateLastCheckedAt(added.id);
      const updated = db.getSite(added.id);
      expect(updated!.last_checked_at).toBeTruthy();
    });
  });

  describe('site_changes', () => {
    it('should add a change and retrieve it by site id', () => {
      const site = db.addSite({ url: 'https://changes-test.com' });
      const change = db.addChange(site.id, 'https://changes-test.com/page1', 'Page 1', '# Content');

      expect(change.id).toBeTruthy();
      expect(change.site_id).toBe(site.id);
      expect(change.url).toBe('https://changes-test.com/page1');
      expect(change.type).toBe('added');
      expect(change.notified).toBe(false);

      const changes = db.getChangesBySiteId(site.id);
      expect(changes).toHaveLength(1);
      expect(changes[0].id).toBe(change.id);
    });

    it('should return empty array for site with no changes', () => {
      const site = db.addSite({ url: 'https://no-changes.com' });
      const changes = db.getChangesBySiteId(site.id);
      expect(changes).toEqual([]);
    });

    it('should get seen URLs by site id', () => {
      const site = db.addSite({ url: 'https://seen-urls.com' });
      db.addChange(site.id, 'https://seen-urls.com/a', 'Page A', null);
      db.addChange(site.id, 'https://seen-urls.com/b', 'Page B', null);
      db.addChange(site.id, 'https://seen-urls.com/a', 'Page A again', null);

      const seen = db.getSeenUrlsBySiteId(site.id);
      expect(seen).toHaveLength(2);
      expect(seen).toContain('https://seen-urls.com/a');
      expect(seen).toContain('https://seen-urls.com/b');
    });

    it('should mark changes as notified', () => {
      const site = db.addSite({ url: 'https://notified-test.com' });
      const c1 = db.addChange(site.id, 'https://notified-test.com/1', 'Page 1', null);
      const c2 = db.addChange(site.id, 'https://notified-test.com/2', 'Page 2', null);

      db.markChangesNotified([c1.id, c2.id]);

      const changes = db.getChangesBySiteId(site.id);
      expect(changes.every(c => c.notified)).toBe(true);
    });

    it('should delete changes when site is deleted (cascade)', () => {
      const site = db.addSite({ url: 'https://cascade-test.com' });
      db.addChange(site.id, 'https://cascade-test.com/1', 'Page 1', null);

      db.deleteSite(site.id);
      const changes = db.getChangesBySiteId(site.id);
      expect(changes).toEqual([]);
    });
  });
});
