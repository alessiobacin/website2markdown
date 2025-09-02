import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  const expectedApiKey = process.env.X_API_KEY;

  if (!expectedApiKey) {
    res.status(500).json({ error: 'Server configuration error: API key not set' });
    return;
  }

  if (!apiKey) {
    res.status(401).json({ error: 'Missing x-api-key header' });
    return;
  }

  if (apiKey !== expectedApiKey) {
    res.status(403).json({ error: 'Invalid API key' });
    return;
  }

  next();
};