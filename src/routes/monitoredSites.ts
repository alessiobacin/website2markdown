import { Router, Request, Response } from 'express';
import cron from 'node-cron';
import { getDatabaseService } from '../db/database';
import { getCronService } from '../services/CronService';
import { validateUrl } from '../utils/validation';
import { CreateMonitoredSiteInput, UpdateMonitoredSiteInput } from '../types/monitoring';

const router = Router();

// POST /api/v1/monitored-sites - Aggiungi sito
router.post('/', async (req: Request<{}, {}, CreateMonitoredSiteInput>, res: Response): Promise<void> => {
  try {
    const { url, name, cron_expression, webhook_url } = req.body;

    if (!url) {
      res.status(400).json({ error: 'URL is required', message: 'The url field is mandatory' });
      return;
    }

    if (!validateUrl(url)) {
      res.status(400).json({ error: 'Invalid URL format', message: 'The provided URL is not valid' });
      return;
    }

    const expr = cron_expression || '0 6 * * *';
    if (!cron.validate(expr)) {
      res.status(400).json({ error: 'Invalid cron expression', message: `"${expr}" is not a valid cron expression` });
      return;
    }

    const db = getDatabaseService();
    const site = db.addSite({ url, name, cron_expression: expr, webhook_url });

    // Avvia il cron job per il nuovo sito
    getCronService().startSiteJob(site);

    res.status(201).json({
      success: true,
      data: site,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create site error:', error);
    res.status(500).json({
      error: 'Failed to create monitored site',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/v1/monitored-sites - Lista siti
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabaseService();
    const sites = db.getAllSites();

    const sitesWithStats = sites.map((site) => {
      const changes = db.getChangesBySiteId(site.id);
      return {
        ...site,
        changesCount: changes.length,
      };
    });

    res.json({
      success: true,
      data: sitesWithStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('List sites error:', error);
    res.status(500).json({
      error: 'Failed to list monitored sites',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/v1/monitored-sites/:id - Dettaglio sito
router.get('/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const db = getDatabaseService();
    const site = db.getSite(req.params.id);

    if (!site) {
      res.status(404).json({ error: 'Site not found', message: `No site with id "${req.params.id}"` });
      return;
    }

    const changes = db.getChangesBySiteId(req.params.id);

    res.json({
      success: true,
      data: {
        ...site,
        changes,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get site error:', error);
    res.status(500).json({
      error: 'Failed to get site details',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PATCH /api/v1/monitored-sites/:id - Modifica sito
router.patch('/:id', async (req: Request<{ id: string }, {}, UpdateMonitoredSiteInput>, res: Response): Promise<void> => {
  try {
    const { name, cron_expression, webhook_url, is_active } = req.body;
    const db = getDatabaseService();
    const existing = db.getSite(req.params.id);

    if (!existing) {
      res.status(404).json({ error: 'Site not found', message: `No site with id "${req.params.id}"` });
      return;
    }

    // Valida cron_expression se fornita
    if (cron_expression && !cron.validate(cron_expression)) {
      res.status(400).json({ error: 'Invalid cron expression', message: `"${cron_expression}" is not a valid cron expression` });
      return;
    }

    const updated = db.updateSite(req.params.id, { name, cron_expression, webhook_url, is_active });

    if (updated) {
      // Riavvia il job se la cron_expression o lo stato sono cambiati
      if (cron_expression !== undefined || is_active !== undefined) {
        getCronService().stopSiteJob(req.params.id);
        if (updated.is_active) {
          getCronService().startSiteJob(updated);
        }
      }
    }

    res.json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update site error:', error);
    res.status(500).json({
      error: 'Failed to update monitored site',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/v1/monitored-sites/:id - Rimuovi sito
router.delete('/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const db = getDatabaseService();
    const site = db.getSite(req.params.id);

    if (!site) {
      res.status(404).json({ error: 'Site not found', message: `No site with id "${req.params.id}"` });
      return;
    }

    getCronService().stopSiteJob(req.params.id);
    db.deleteSite(req.params.id);

    res.json({
      success: true,
      data: { message: 'Site removed successfully' },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Delete site error:', error);
    res.status(500).json({
      error: 'Failed to delete monitored site',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/v1/monitored-sites/:id/scan - Scansione manuale
router.post('/:id/scan', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const db = getDatabaseService();
    const site = db.getSite(req.params.id);

    if (!site) {
      res.status(404).json({ error: 'Site not found', message: `No site with id "${req.params.id}"` });
      return;
    }

    // Avvia scansione in background, rispondi subito
    getCronService().checkOnce(req.params.id).catch((err) => {
      console.error('Background scan error:', err);
    });

    res.json({
      success: true,
      data: {
        message: 'Scansione avviata',
        siteId: req.params.id,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Scan site error:', error);
    res.status(500).json({
      error: 'Failed to start scan',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/v1/monitored-sites/:id/changes - Lista changes
router.get('/:id/changes', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const db = getDatabaseService();
    const site = db.getSite(req.params.id);

    if (!site) {
      res.status(404).json({ error: 'Site not found', message: `No site with id "${req.params.id}"` });
      return;
    }

    const changes = db.getChangesBySiteId(req.params.id);

    res.json({
      success: true,
      data: changes,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('List changes error:', error);
    res.status(500).json({
      error: 'Failed to list site changes',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as monitoredSitesRouter };
