import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { websiteToMarkdownRouter } from './routes/websiteToMarkdown';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

// Carica le variabili d'ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware di sicurezza
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware di autenticazione
app.use('/api', authMiddleware);

// Routes
app.use('/api/convert', websiteToMarkdownRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/convert`);
});

export default app;