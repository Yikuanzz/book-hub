import type { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '../types/index.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: string[]
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      error: err.message,
      details: err.details,
    };
    res.status(err.statusCode).json(response);
    return;
  }

  console.error('Unexpected error:', err);
  const response: ApiResponse = {
    success: false,
    error: 'Internal Server Error',
  };
  res.status(500).json(response);
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
