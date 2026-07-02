import { Router, Request, Response } from 'express';
import { RobotsParser } from '../services/RobotsParser';
import { validateUrl, extractDomain } from '../utils/validation';

const router = Router();
const robotsParser = new RobotsParser();

// GET /api/robots-txt - Scarica il robots.txt di un sito web
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const urlParam = req.query.url as string;

    if (!urlParam) {
      res.status(400).json({ error: 'Query parameter "url" is required' });
      return;
    }

    if (!validateUrl(urlParam)) {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }

    const domain = extractDomain(urlParam);
    const result = await robotsParser.fetchRawRobotsTxt(urlParam);

    res.json({
      success: true,
      domain,
      sourceUrl: result.sourceUrl,
      content: result.content,
    });
  } catch (error) {
    console.error('Robots.txt fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch robots.txt',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as robotsTxtRouter };
