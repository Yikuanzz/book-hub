import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { bookService } from '../services/bookService.js';
import { bookRepo } from '../repositories/bookRepo.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsBase = path.join(__dirname, '../../uploads');
const booksUploadDir = path.join(uploadsBase, 'books');
const coversUploadDir = path.join(uploadsBase, 'covers');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDir(booksUploadDir);
ensureDir(coversUploadDir);

function getBookFilePath(bookId: number): string | null {
  const book = bookRepo.findById(bookId);
  return book?.filePath ?? null;
}

const bookFileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, booksUploadDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}-${random}${ext}`);
  },
});

const coverStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, coversUploadDir);
  },
  filename: (req, _file, cb) => {
    const bookId = req.params.id;
    cb(null, `${bookId}.jpg`);
  },
});

const uploadBookFile = multer({
  storage: bookFileStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

const uploadCover = multer({
  storage: coverStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

const createBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  cover: z.string().optional().nullable(),
  categoryId: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  totalPages: z.number().optional().nullable(),
  format: z.string().optional().nullable(),
  filePath: z.string().optional().nullable(),
});

const updateBookSchema = z.object({
  title: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
  cover: z.string().optional().nullable(),
  categoryId: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  totalPages: z.number().optional().nullable(),
  format: z.string().optional().nullable(),
  filePath: z.string().optional().nullable(),
});

const progressSchema = z.object({
  currentPage: z.number().min(0),
  progress: z.number().min(0).max(100),
  readingTime: z.number().optional(),
});

router.get('/', asyncHandler(async (req, res) => {
  const category = req.query.category ? Number(req.query.category) : undefined;
  const search = req.query.search as string | undefined;
  const books = bookService.list(category, search);
  res.json({ success: true, data: books });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const book = bookService.getById(id);
  if (!book) throw new AppError(404, 'Book not found');
  res.json({ success: true, data: book });
}));

router.post('/', asyncHandler(async (req, res) => {
  const parsed = createBookSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Validation Error', parsed.error.issues.map(i => i.message));
  }
  const book = bookService.create(parsed.data);
  res.status(201).json({ success: true, data: book });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateBookSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Validation Error', parsed.error.issues.map(i => i.message));
  }
  const existing = bookService.getById(id);
  if (!existing) throw new AppError(404, 'Book not found');
  const book = bookService.update(id, parsed.data);
  res.json({ success: true, data: book });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = bookService.getById(id);
  if (!existing) throw new AppError(404, 'Book not found');

  const filePath = getBookFilePath(id);
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  const coverPath = path.join(coversUploadDir, `${id}.jpg`);
  if (fs.existsSync(coverPath)) {
    fs.unlinkSync(coverPath);
  }

  bookService.delete(id);
  res.json({ success: true });
}));

router.put('/:id/progress', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const parsed = progressSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Validation Error', parsed.error.issues.map(i => i.message));
  }
  const existing = bookService.getById(id);
  if (!existing) throw new AppError(404, 'Book not found');
  const book = bookService.updateProgress(id, parsed.data);
  res.json({ success: true, data: book });
}));

router.post(
  '/:id/upload',
  uploadBookFile.single('file'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!req.file) throw new AppError(400, 'No file uploaded');

    const existing = bookService.getById(id);
    if (!existing) {
      fs.unlinkSync(req.file.path);
      throw new AppError(404, 'Book not found');
    }

    const oldPath = existing.filePath;
    if (oldPath && fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }

    const filePath = req.file.path;
    const book = bookService.update(id, { filePath });
    res.json({ success: true, data: book });
  })
);

router.post(
  '/:id/cover',
  uploadCover.single('cover'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!req.file) throw new AppError(400, 'No cover image uploaded');

    const existing = bookService.getById(id);
    if (!existing) {
      fs.unlinkSync(req.file.path);
      throw new AppError(404, 'Book not found');
    }

    const coverPath = `/uploads/covers/${id}.jpg`;
    const book = bookService.update(id, { cover: coverPath });
    res.json({ success: true, data: book });
  })
);

export default router;
