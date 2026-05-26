import express from 'express';
import { z } from 'zod';
import { highlightService } from '../services/highlightService.js';
import { highlightRepo } from '../repositories/highlightRepo.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router: express.Router = express.Router();

const highlightSchema = z.object({
  bookId: z.number(),
  page: z.number().min(1),
  text: z.string().min(1),
  color: z.string().default('#FEF08A'),
  note: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
});

const updateSchema = z.object({
  page: z.number().min(1).optional(),
  text: z.string().min(1).optional(),
  color: z.string().optional(),
  note: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

router.get('/', asyncHandler(async (req, res) => {
  const bookId = req.query.bookId ? Number(req.query.bookId) : undefined;
  const tag = req.query.tag as string | undefined;
  const search = req.query.search as string | undefined;
  const highlights = highlightService.list(bookId, tag, search);
  res.json({ success: true, data: highlights });
}));

router.post('/', asyncHandler(async (req, res) => {
  const parsed = highlightSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Validation Error', parsed.error.issues.map(i => i.message));
  }
  const highlight = highlightService.create(parsed.data);
  res.status(201).json({ success: true, data: highlight });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = highlightRepo.findById(id);
  if (!existing) throw new AppError(404, 'Highlight not found');

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Validation Error', parsed.error.issues.map(i => i.message));
  }
  const updated = highlightService.update(id, parsed.data);
  res.json({ success: true, data: updated });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = highlightRepo.findById(id);
  if (!existing) throw new AppError(404, 'Highlight not found');
  highlightService.delete(id);
  res.json({ success: true });
}));

export default router;
