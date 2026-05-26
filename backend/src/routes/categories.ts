import express from 'express';
import { z } from 'zod';
import { categoryRepo } from '../repositories/categoryRepo.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router: express.Router = express.Router();

const categorySchema = z.object({
  name: z.string().min(1),
  color: z.string().default('#8B5CF6'),
});

router.get('/', asyncHandler(async (_req, res) => {
  const categories = categoryRepo.findAll();
  res.json({ success: true, data: categories });
}));

router.post('/', asyncHandler(async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Validation Error', parsed.error.issues.map(i => i.message));
  }
  const category = categoryRepo.create(parsed.data.name, parsed.data.color);
  res.status(201).json({ success: true, data: category });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Validation Error', parsed.error.issues.map(i => i.message));
  }
  const existing = categoryRepo.findById(id);
  if (!existing) throw new AppError(404, 'Category not found');
  categoryRepo.update(id, parsed.data.name, parsed.data.color);
  res.json({ success: true, data: { id, ...parsed.data } });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = categoryRepo.findById(id);
  if (!existing) throw new AppError(404, 'Category not found');
  categoryRepo.delete(id);
  res.json({ success: true });
}));

export default router;
