import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CronService } from './CronService';

const mockDb = {
  getAllSites: vi.fn(),
  getSite: vi.fn(),
  getSiteByUrl: vi.fn(),
  addSite: vi.fn(),
  updateSite: vi.fn(),
  deleteSite: vi.fn(),
  getChangesBySiteId: vi.fn(),
  getSeenUrlsBySiteId: vi.fn(),
  addChange: vi.fn(),
  markChangesNotified: vi.fn(),
  updateLastCheckedAt: vi.fn(),
  close: vi.fn(),
  initialize: vi.fn(),
};

const mockWebhook = {
  notifyChange: vi.fn(),
  notifyChanges: vi.fn(),
};

const { mockTask, mockCronSchedule, mockCronValidate, mockCronScheduleNamed } = vi.hoisted(() => {
  const mockTask = { stop: vi.fn() };
  const mockCronSchedule = vi.fn(() => mockTask);
  const mockCronValidate = vi.fn(() => true);
  const mockCronScheduleNamed = vi.fn(() => ({ stop: vi.fn() }));
  return { mockTask, mockCronSchedule, mockCronValidate, mockCronScheduleNamed };
});

vi.mock('node-cron', () => ({
  default: {
    schedule: mockCronSchedule,
    validate: mockCronValidate,
  },
  validate: mockCronValidate,
  schedule: mockCronScheduleNamed,
}));

vi.mock('../db/database', () => ({
  getDatabaseService: vi.fn(() => mockDb),
}));

vi.mock('./WebhookService', () => ({
  getWebhookService: vi.fn(() => mockWebhook),
}));

vi.mock('./WebsiteConverter', () => ({
  WebsiteConverter: class {
    discoverUrls = vi.fn();
  },
}));

vi.mock('./PageExtractor', () => ({
  PageExtractor: class {
    extract = vi.fn();
  },
}));

describe('CronService', () => {
  let service: CronService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CronService();
  });

  describe('scanSite', () => {
    it('should discover new URLs and save changes', async () => {
      const site = {
        id: 'site-1',
        url: 'https://example.com',
        name: 'Example',
        cron_expression: '0 6 * * *',
        is_active: true,
        webhook_url: undefined,
        last_checked_at: undefined,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      const websiteConverter = service['converter'] as unknown as {
        discoverUrls: ReturnType<typeof vi.fn>;
      };
      websiteConverter.discoverUrls.mockResolvedValue({
        domain: 'example.com',
        urls: [
          { url: 'https://example.com/page1', source: 'sitemap' },
          { url: 'https://example.com/page2', source: 'sitemap' },
        ],
      });

      mockDb.getSeenUrlsBySiteId.mockReturnValue([]);
      mockDb.addChange.mockImplementation(
        (siteId: string, url: string, title: string | null) => ({
          id: 'change-' + Math.random().toString(36).slice(2),
          site_id: siteId,
          url,
          title,
          type: 'added',
          discovered_at: new Date().toISOString(),
          notified: false,
          created_at: new Date().toISOString(),
        })
      );

      const pageExtractor = service['extractor'] as unknown as {
        extract: ReturnType<typeof vi.fn>;
      };
      pageExtractor.extract.mockImplementation((url: string) => ({
        url,
        title: 'Title: ' + url,
        markdown: '# Content for ' + url,
        metaTitle: 'Meta: ' + url,
        metaDescription: 'Desc',
        h1: [],
        headings: [],
        canonical: null,
        lang: 'en',
        wordCount: 10,
        linksInternal: [],
        linksExternal: [],
        publishedAt: null,
      }));

      const result = await service.scanSite(site);

      expect(result.newUrls).toHaveLength(2);
      expect(result.changesCount).toBe(2);
      expect(mockDb.addChange).toHaveBeenCalledTimes(2);
      expect(mockDb.updateLastCheckedAt).toHaveBeenCalledWith('site-1');
    });

    it('should filter already seen URLs', async () => {
      const site = {
        id: 'site-2',
        url: 'https://example.com',
        name: 'Example',
        cron_expression: '0 6 * * *',
        is_active: true,
        webhook_url: undefined,
        last_checked_at: undefined,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      const websiteConverter = service['converter'] as unknown as {
        discoverUrls: ReturnType<typeof vi.fn>;
      };
      websiteConverter.discoverUrls.mockResolvedValue({
        domain: 'example.com',
        urls: [
          { url: 'https://example.com/page1', source: 'sitemap' },
          { url: 'https://example.com/page2', source: 'crawl' },
          { url: 'https://example.com/page3', source: 'sitemap' },
        ],
      });

      mockDb.getSeenUrlsBySiteId.mockReturnValue([
        'https://example.com/page1',
        'https://example.com/page3',
      ]);
      mockDb.addChange.mockImplementation(
        (siteId: string, url: string, title: string | null) => ({
          id: 'change-xx',
          site_id: siteId,
          url,
          title,
          type: 'added',
          discovered_at: new Date().toISOString(),
          notified: false,
          created_at: new Date().toISOString(),
        })
      );

      const pageExtractor = service['extractor'] as unknown as {
        extract: ReturnType<typeof vi.fn>;
      };
      pageExtractor.extract.mockResolvedValue({
        url: 'https://example.com/page2',
        title: 'Page 2',
        markdown: '# Content',
        metaTitle: 'Page 2',
        metaDescription: '',
        h1: [],
        headings: [],
        canonical: null,
        lang: 'en',
        wordCount: 5,
        linksInternal: [],
        linksExternal: [],
        publishedAt: null,
      });

      const result = await service.scanSite(site);

      expect(result.newUrls).toEqual(['https://example.com/page2']);
      expect(result.changesCount).toBe(1);
      expect(mockDb.addChange).toHaveBeenCalledTimes(1);
      expect(mockDb.addChange).toHaveBeenCalledWith(
        'site-2',
        'https://example.com/page2',
        'Page 2',
        '# Content'
      );
    });

    it('should handle extraction errors gracefully', async () => {
      const site = {
        id: 'site-3',
        url: 'https://example.com',
        name: 'Example',
        cron_expression: '0 6 * * *',
        is_active: true,
        webhook_url: undefined,
        last_checked_at: undefined,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      const websiteConverter = service['converter'] as unknown as {
        discoverUrls: ReturnType<typeof vi.fn>;
      };
      websiteConverter.discoverUrls.mockResolvedValue({
        domain: 'example.com',
        urls: [{ url: 'https://example.com/page1', source: 'sitemap' }],
      });

      mockDb.getSeenUrlsBySiteId.mockReturnValue([]);

      const pageExtractor = service['extractor'] as unknown as {
        extract: ReturnType<typeof vi.fn>;
      };
      pageExtractor.extract.mockRejectedValue(new Error('Fetch failed'));

      mockDb.addChange.mockImplementation(
        (siteId: string, url: string, title: string | null, md: string | null) => ({
          id: 'change-fail',
          site_id: siteId,
          url,
          title,
          type: 'added',
          discovered_at: new Date().toISOString(),
          notified: false,
          created_at: new Date().toISOString(),
        })
      );

      const result = await service.scanSite(site);

      expect(result.changesCount).toBe(1);
      expect(mockDb.addChange).toHaveBeenCalledWith(
        'site-3',
        'https://example.com/page1',
        null,
        null
      );
    });

    it('should send webhook notification when webhook_url is set', async () => {
      const site = {
        id: 'site-4',
        url: 'https://example.com',
        name: 'Example',
        cron_expression: '0 6 * * *',
        webhook_url: 'https://hooks.example.com/notify',
        is_active: true,
        last_checked_at: undefined,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      const websiteConverter = service['converter'] as unknown as {
        discoverUrls: ReturnType<typeof vi.fn>;
      };
      websiteConverter.discoverUrls.mockResolvedValue({
        domain: 'example.com',
        urls: [{ url: 'https://example.com/page1', source: 'sitemap' }],
      });

      mockDb.getSeenUrlsBySiteId.mockReturnValue([]);
      mockDb.addChange.mockReturnValue({
        id: 'change-webhook',
        site_id: 'site-4',
        url: 'https://example.com/page1',
        title: 'Page 1',
        type: 'added',
        discovered_at: new Date().toISOString(),
        notified: false,
        created_at: new Date().toISOString(),
      });

      const pageExtractor = service['extractor'] as unknown as {
        extract: ReturnType<typeof vi.fn>;
      };
      pageExtractor.extract.mockResolvedValue({
        url: 'https://example.com/page1',
        title: 'Page 1',
        markdown: '# Content',
        metaTitle: 'Page 1',
        metaDescription: '',
        h1: [],
        headings: [],
        canonical: null,
        lang: 'en',
        wordCount: 5,
        linksInternal: [],
        linksExternal: [],
        publishedAt: null,
      });

      mockWebhook.notifyChanges.mockResolvedValue({ notified: 1, failed: 0 });

      await service.scanSite(site);

      expect(mockWebhook.notifyChanges).toHaveBeenCalledTimes(1);
      expect(mockWebhook.notifyChanges).toHaveBeenCalledWith(
        'https://example.com',
        'site-4',
        expect.any(Array),
        'https://hooks.example.com/notify'
      );
    });

    it('should handle scan errors without throwing', async () => {
      const site = {
        id: 'site-5',
        url: 'https://example.com',
        name: 'Example',
        cron_expression: '0 6 * * *',
        is_active: true,
        webhook_url: undefined,
        last_checked_at: undefined,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      const websiteConverter = service['converter'] as unknown as {
        discoverUrls: ReturnType<typeof vi.fn>;
      };
      websiteConverter.discoverUrls.mockRejectedValue(new Error('Network error'));

      const result = await service.scanSite(site);

      expect(result.newUrls).toEqual([]);
      expect(result.changesCount).toBe(0);
    });
  });

  describe('startSiteJob / stopSiteJob', () => {
    it('should register a cron job for a site', () => {
      const site = {
        id: 'site-job',
        url: 'https://example.com',
        name: 'Example',
        cron_expression: '0 */6 * * *',
        is_active: true,
        webhook_url: undefined,
        last_checked_at: undefined,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      service.startSiteJob(site);

      expect(mockCronSchedule).toHaveBeenCalledWith(
        '0 */6 * * *',
        expect.any(Function)
      );
    });

    it('should stop an existing job and start a new one', () => {
      const site = {
        id: 'site-restart',
        url: 'https://example.com',
        name: 'Example',
        cron_expression: '0 */6 * * *',
        is_active: true,
        webhook_url: undefined,
        last_checked_at: undefined,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      service.startSiteJob(site);
      expect(mockTask.stop).not.toHaveBeenCalled();

      service.startSiteJob(site);
      expect(mockTask.stop).toHaveBeenCalledTimes(1);
    });

    it('should stop a cron job', () => {
      const site = {
        id: 'site-stop',
        url: 'https://example.com',
        name: 'Example',
        cron_expression: '0 */6 * * *',
        is_active: true,
        webhook_url: undefined,
        last_checked_at: undefined,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      service.startSiteJob(site);
      service.stopSiteJob('site-stop');

      expect(mockTask.stop).toHaveBeenCalled();
    });
  });

  describe('start / stop', () => {
    it('should start jobs for all active sites', () => {
      const mockSites = [
        { id: 's1', url: 'https://a.com', is_active: true, cron_expression: '0 6 * * *', name: 'A' },
        { id: 's2', url: 'https://b.com', is_active: false, cron_expression: '0 6 * * *', name: 'B' },
        { id: 's3', url: 'https://c.com', is_active: true, cron_expression: '0 12 * * *', name: 'C' },
      ].map(s => ({
        ...s,
        webhook_url: undefined,
        last_checked_at: undefined,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      }));

      mockDb.getAllSites.mockReturnValue(mockSites);

      service.start();

      expect(mockCronSchedule).toHaveBeenCalledTimes(2);
    });

    it('should stop all jobs', () => {
      const site = {
        id: 'site-stop-all',
        url: 'https://example.com',
        name: 'Example',
        cron_expression: '0 6 * * *',
        is_active: true,
        webhook_url: undefined,
        last_checked_at: undefined,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      service.startSiteJob(site);
      service.stop();

      expect(mockTask.stop).toHaveBeenCalled();
    });
  });

  describe('checkOnce', () => {
    it('should scan a specific site by id', async () => {
      const site = {
        id: 'site-check',
        url: 'https://example.com',
        name: 'Example',
        cron_expression: '0 6 * * *',
        is_active: true,
        webhook_url: undefined,
        last_checked_at: undefined,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      mockDb.getSite.mockReturnValue(site);

      const websiteConverter = service['converter'] as unknown as {
        discoverUrls: ReturnType<typeof vi.fn>;
      };
      websiteConverter.discoverUrls.mockResolvedValue({
        domain: 'example.com',
        urls: [],
      });

      mockDb.getSeenUrlsBySiteId.mockReturnValue([]);

      await service.checkOnce('site-check');

      expect(mockDb.getSite).toHaveBeenCalledWith('site-check');
      expect(websiteConverter.discoverUrls).toHaveBeenCalled();
    });

    it('should throw when site is not found', async () => {
      mockDb.getSite.mockReturnValue(undefined);

      await expect(service.checkOnce('non-existent')).rejects.toThrow(
        'Sito non trovato: non-existent'
      );
    });

    it('should scan all active sites when no id given', async () => {
      const sites = [
        {
          id: 's1', url: 'https://a.com', name: 'A', cron_expression: '0 6 * * *',
          is_active: true, webhook_url: undefined, last_checked_at: undefined,
          created_at: '2025-01-01T00:00:00.000Z', updated_at: '2025-01-01T00:00:00.000Z',
        },
        {
          id: 's2', url: 'https://b.com', name: 'B', cron_expression: '0 6 * * *',
          is_active: false, webhook_url: undefined, last_checked_at: undefined,
          created_at: '2025-01-01T00:00:00.000Z', updated_at: '2025-01-01T00:00:00.000Z',
        },
      ];
      mockDb.getAllSites.mockReturnValue(sites);

      const websiteConverter = service['converter'] as unknown as {
        discoverUrls: ReturnType<typeof vi.fn>;
      };
      websiteConverter.discoverUrls.mockResolvedValue({
        domain: 'example.com',
        urls: [],
      });

      mockDb.getSeenUrlsBySiteId.mockReturnValue([]);

      await service.checkOnce();

      expect(websiteConverter.discoverUrls).toHaveBeenCalledTimes(1);
    });
  });
});
