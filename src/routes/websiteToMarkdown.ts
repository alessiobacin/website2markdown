import { Router, Request, Response } from 'express';
import { WebsiteConverter } from '../services/WebsiteConverter';
import { validateUrl } from '../utils/validation';

const router = Router();
const converter = new WebsiteConverter();

interface ConvertRequest {
  url: string;
  maxPages?: number;
}

// POST /api/convert - Converte un sito web in markdown
router.post('/', async (req: Request<{}, {}, ConvertRequest>, res: Response): Promise<void> => {
  try {
    const { url, maxPages = 100 } = req.body;

    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    if (!validateUrl(url)) {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }

    if (maxPages < 0 || maxPages > 500) {
      res.status(400).json({ error: 'maxPages must be between 0 and 500 (0 = unlimited)' });
      return;
    }

    const result = await converter.convertWebsiteToMarkdown(url, maxPages);
    
    res.json({
      success: true,
      domain: result.domain,
      totalPages: result.pages.length,
      pages: result.pages,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ 
      error: 'Failed to convert website to markdown',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/convert/single - Endpoint per convertire una singola pagina
router.post('/single', async (req: Request<{}, {}, { url: string }>, res: Response): Promise<void> => {
  try {
    const { url } = req.body;

    // Validazione input
    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    if (!validateUrl(url)) {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }

    console.log(`🔄 Converting single page: ${url}`);

    // Converti la singola pagina direttamente
    const pageContent = await converter.convertSinglePage(url);

    res.json({
      success: true,
      url: pageContent.url,
      title: pageContent.title,
      markdown: pageContent.markdown,
      wordCount: pageContent.wordCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Single page conversion error:', error);
    res.status(500).json({ 
      error: 'Failed to convert page to markdown',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/convert/status - Endpoint per verificare lo stato del servizio
router.get('/status', (req: Request, res: Response) => {
  res.json({
    service: 'Website to Markdown Converter',
    status: 'active',
    version: '1.0.0',
    endpoints: {
      convert: 'POST /api/convert',
      single: 'POST /api/convert/single',
      status: 'GET /api/convert/status'
    }
  });
});

export { router as websiteToMarkdownRouter };