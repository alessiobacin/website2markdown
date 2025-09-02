import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
  status?: number;
}

export const errorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction): void => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`Error ${status}: ${message}`);
  console.error(err.stack);

  res.status(status).json({
    error: message,
    timestamp: new Date().toISOString(),
    path: req.path
  });
};