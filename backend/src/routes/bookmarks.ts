import express from 'express';
import { z } from 'zod';
import { bookmarkRepo } from '../repositories/bookmarkRepo.js';
import { bookRepo } from '../repositories/bookRepo.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router: express.Router = express.Router({ mergeParams: true });

const bookmarkSchema = z.object({
  page: z.number().min(1),
  note: z.string().nullable().optional(),
});

router.get('/', asyncHandler(async (req, res) => {
  const bookId = Number(req.params.bookId);
  const book = bookRepo.findById(bookId);
  if (!book) throw new AppError(404, 'Book not found');
  const bookmarks = bookmarkRepo.findByBookId(bookId);
  res.json({ success: true, data: bookmarks });
}));

router.post('/', asyncHandler(async (req, res) => {
  const bookId = Number(req.params.bookId);
  const book = bookRepo.findById(bookId);
  if (!book) throw new AppError(404, 'Book not found');

  const parsed = bookmarkSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Validation Error', parsed.error.issues.map(i => i.message));
  }
  const bookmark = bookmarkRepo.create(bookId, parsed.data.page, parsed.data.note ?? null);
  res.status(201).json({ success: true, data: bookmark });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const bookmark = bookmarkRepo.findById(id);
  if (!bookmark) throw new AppError(404, 'Bookmark not found');
  bookmarkRepo.delete(id);
  res.json({ success: true });
}));

export default router;
