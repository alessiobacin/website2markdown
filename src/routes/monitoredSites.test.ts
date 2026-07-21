import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(() => ({ stop: vi.fn() })),
    validate: vi.fn(() => true),
  },
  validate: vi.fn(() => true),
}));

// Store sites in-memory for the mock
const mockSites: Record<string, any> = {};
const mockChanges: Record<string, any[]> = {};
let siteCounter = 0;

const mockDbInstance = {
  getAllSites: vi.fn(() => Object.values(mockSites)),
  getSite: vi.fn((id: string) => mockSites[id] || undefined),
  getSiteByUrl: vi.fn((url: string) =>
    Object.values(mockSites).find((s: any) => s.url === url)
  ),
  addSite: vi.fn((input: any) => {
    siteCounter++;
    const id = `mock-site-${siteCounter}`;
    const now = new Date().toISOString();
    const site = {
      id,
      url: input.url,
      name: input.name || '',
      cron_expression: input.cron_expression || '0 6 * * *',
      webhook_url: input.webhook_url || undefined,
      is_active: true,
      last_checked_at: undefined as string | undefined,
      created_at: now,
      updated_at: now,
    };
    mockSites[id] = site;
    mockChanges[id] = [];
    return site;
  }),
  updateSite: vi.fn((id: string, input: any) => {
    const site = mockSites[id];
    if (!site) return undefined;
    if (input.url !== undefined) site.url = input.url;
    if (input.name !== undefined) site.name = input.name;
    if (input.cron_expression !== undefined) site.cron_expression = input.cron_expression;
    if (input.webhook_url !== undefined) site.webhook_url = input.webhook_url;
    if (input.is_active !== undefined) site.is_active = input.is_active;
    site.updated_at = new Date().toISOString();
    return site;
  }),
  deleteSite: vi.fn((id: string) => {
    if (!mockSites[id]) return false;
    delete mockSites[id];
    delete mockChanges[id];
    return true;
  }),
  getChangesBySiteId: vi.fn((siteId: string) => mockChanges[siteId] || []),
  addChange: vi.fn((siteId: string, url: string, title: string | null) => {
    const id = `change-${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();
    const change = {
      id,
      site_id: siteId,
      url,
      title: title || undefined,
      type: 'added' as const,
      discovered_at: now,
      notified: false,
      created_at: now,
    };
    if (!mockChanges[siteId]) mockChanges[siteId] = [];
    mockChanges[siteId].push(change);
    return change;
  }),
  getSeenUrlsBySiteId: vi.fn((siteId: string) =>
    (mockChanges[siteId] || []).map((c: any) => c.url)
  ),
  markChangesNotified: vi.fn(),
  updateLastCheckedAt: vi.fn(),
  close: vi.fn(),
  initialize: vi.fn(),
};

vi.mock('../db/database', () => ({
  getDatabaseService: vi.fn(() => mockDbInstance),
}));

const mockCronInstance = {
  startSiteJob: vi.fn(),
  stopSiteJob: vi.fn(),
  checkOnce: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../services/CronService', () => ({
  getCronService: vi.fn(() => mockCronInstance),
}));

// Must import after mocks are set up
const { monitoredSitesRouter } = await import('./monitoredSites');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/monitored-sites', monitoredSitesRouter);
  return app;
}

describe('Monitored Sites Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the in-memory store
    Object.keys(mockSites).forEach(k => delete mockSites[k]);
    Object.keys(mockChanges).forEach(k => delete mockChanges[k]);
    siteCounter = 0;
  });

  describe('POST /api/v1/monitored-sites', () => {
    it('should create a new monitored site and return 201', async () => {
      const app = createApp();

      const res = await request(app)
        .post('/api/v1/monitored-sites')
        .send({ url: 'https://example.com', name: 'Example' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toBe('https://example.com');
      expect(res.body.data.name).toBe('Example');
      expect(res.body.data.id).toBeTruthy();
      expect(mockCronInstance.startSiteJob).toHaveBeenCalledTimes(1);
    });

    it('should return 400 when URL is missing', async () => {
      const app = createApp();

      const res = await request(app)
        .post('/api/v1/monitored-sites')
        .send({ name: 'No URL' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('URL is required');
    });

    it('should return 400 when URL is invalid', async () => {
      const app = createApp();

      const res = await request(app)
        .post('/api/v1/monitored-sites')
        .send({ url: 'not-a-valid-url' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid URL format');
    });

    it('should return 400 when cron expression is invalid', async () => {
      const app = createApp();

      // Temporarily make cron.validate return false
      const cron = await import('node-cron');
      (cron.default as any).validate.mockReturnValueOnce(false);

      const res = await request(app)
        .post('/api/v1/monitored-sites')
        .send({ url: 'https://example.com', cron_expression: 'invalid-cron' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid cron expression');
    });
  });

  describe('GET /api/v1/monitored-sites', () => {
    it('should return the list of monitored sites', async () => {
      mockDbInstance.addSite({ url: 'https://site1.com', name: 'Site 1' });
      mockDbInstance.addSite({ url: 'https://site2.com', name: 'Site 2' });

      const app = createApp();

      const res = await request(app).get('/api/v1/monitored-sites');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].changesCount).toBe(0);
    });

    it('should return an empty array when no sites exist', async () => {
      const app = createApp();

      const res = await request(app).get('/api/v1/monitored-sites');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('GET /api/v1/monitored-sites/:id', () => {
    it('should return a site by id', async () => {
      const site = mockDbInstance.addSite({ url: 'https://detail-test.com' });

      const app = createApp();

      const res = await request(app).get(`/api/v1/monitored-sites/${site.id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toBe('https://detail-test.com');
      expect(res.body.data.changes).toEqual([]);
    });

    it('should return 404 when site does not exist', async () => {
      const app = createApp();

      const res = await request(app).get('/api/v1/monitored-sites/non-existent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Site not found');
    });
  });

  describe('PATCH /api/v1/monitored-sites/:id', () => {
    it('should update a site', async () => {
      const site = mockDbInstance.addSite({ url: 'https://patch-test.com' });

      const app = createApp();

      const res = await request(app)
        .patch(`/api/v1/monitored-sites/${site.id}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Name');
    });

    it('should return 404 when site does not exist', async () => {
      const app = createApp();

      const res = await request(app)
        .patch('/api/v1/monitored-sites/non-existent')
        .send({ name: 'Nope' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Site not found');
    });

    it('should return 400 when cron expression is invalid', async () => {
      const site = mockDbInstance.addSite({ url: 'https://cron-test.com' });

      const app = createApp();

      const cron = await import('node-cron');
      (cron.default as any).validate.mockReturnValueOnce(false);

      const res = await request(app)
        .patch(`/api/v1/monitored-sites/${site.id}`)
        .send({ cron_expression: 'bad' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid cron expression');
    });

    it('should restart job when cron_expression changes', async () => {
      const site = mockDbInstance.addSite({ url: 'https://restart-test.com' });

      const app = createApp();

      await request(app)
        .patch(`/api/v1/monitored-sites/${site.id}`)
        .send({ cron_expression: '0 */12 * * *' });

      expect(mockCronInstance.stopSiteJob).toHaveBeenCalledWith(site.id);
      expect(mockCronInstance.startSiteJob).toHaveBeenCalled();
    });

    it('should stop job when site is deactivated', async () => {
      const site = mockDbInstance.addSite({ url: 'https://deactivate-test.com' });

      const app = createApp();

      await request(app)
        .patch(`/api/v1/monitored-sites/${site.id}`)
        .send({ is_active: false });

      expect(mockCronInstance.stopSiteJob).toHaveBeenCalledWith(site.id);
      // startSiteJob should NOT be called since site is not active
    });
  });

  describe('DELETE /api/v1/monitored-sites/:id', () => {
    it('should delete a site', async () => {
      const site = mockDbInstance.addSite({ url: 'https://delete-test.com' });

      const app = createApp();

      const res = await request(app).delete(`/api/v1/monitored-sites/${site.id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockCronInstance.stopSiteJob).toHaveBeenCalledWith(site.id);
    });

    it('should return 404 when site does not exist', async () => {
      const app = createApp();

      const res = await request(app).delete('/api/v1/monitored-sites/non-existent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Site not found');
    });
  });

  describe('POST /api/v1/monitored-sites/:id/scan', () => {
    it('should start a scan and return 200', async () => {
      const site = mockDbInstance.addSite({ url: 'https://scan-test.com' });

      const app = createApp();

      const res = await request(app).post(`/api/v1/monitored-sites/${site.id}/scan`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Scansione avviata');
      expect(mockCronInstance.checkOnce).toHaveBeenCalledWith(site.id);
    });

    it('should return 404 when site does not exist', async () => {
      const app = createApp();

      const res = await request(app).post('/api/v1/monitored-sites/non-existent/scan');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Site not found');
    });
  });

  describe('GET /api/v1/monitored-sites/:id/changes', () => {
    it('should return changes for a site', async () => {
      const site = mockDbInstance.addSite({ url: 'https://changes-list.com' });

      const app = createApp();

      const res = await request(app).get(`/api/v1/monitored-sites/${site.id}/changes`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should return 404 when site does not exist', async () => {
      const app = createApp();

      const res = await request(app).get('/api/v1/monitored-sites/non-existent/changes');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Site not found');
    });
  });
});
