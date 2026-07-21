import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { websiteToMarkdownRouter } from './routes/websiteToMarkdown';
import { robotsTxtRouter } from './routes/robotsTxt';
import { newEndpointsRouter } from './routes/newEndpoints';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { getDatabaseService } from './db/database';
import { getCronService } from './services/CronService';
import { monitoredSitesRouter } from './routes/monitoredSites';

// Carica le variabili d'ambiente
dotenv.config();

const app = express();
const PORT: number = Number(process.env.PORT) || 3004;
const HOST: string = process.env.HOST || '0.0.0.0';

// Middleware di sicurezza e parsing
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware di autenticazione su /api
app.use('/api', authMiddleware);

// Routes
app.use('/api/convert', websiteToMarkdownRouter);
app.use('/api', newEndpointsRouter);
app.use('/api/robots-txt', authMiddleware, robotsTxtRouter);
app.use('/api/v1/monitored-sites', authMiddleware, monitoredSitesRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Inizializza database SQLite e cron jobs
try {
  getDatabaseService().initialize();
  console.log('🗄️ Database monitoring inizializzato');
  getCronService().start();
} catch (error) {
  console.warn('⚠️ Database/Cron non avviato:', error instanceof Error ? error.message : 'Unknown error');
}

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📚 API Documentation: http://${HOST}:${PORT}/api/convert`);
});

export default app;
