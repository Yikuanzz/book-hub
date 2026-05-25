import { Router } from 'express';
import { statsService } from '../services/statsService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/dashboard', asyncHandler(async (_req, res) => {
  const stats = statsService.getDashboardStats();
  res.json({ success: true, data: stats });
}));

router.get('/heatmap', asyncHandler(async (req, res) => {
  const year = req.query.year ? Number(req.query.year) : undefined;
  const data = statsService.getHeatmap(year);
  res.json({ success: true, data });
}));

export default router;
