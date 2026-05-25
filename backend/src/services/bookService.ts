import { bookRepo } from '../repositories/bookRepo.js';
import { db } from '../db/connection.js';
import type { BookCreateInput, BookUpdateInput } from '../repositories/bookRepo.js';
import type { Book } from '../types/index.js';

export interface ProgressUpdateInput {
  currentPage: number;
  progress: number;
  readingTime?: number;
}

export const bookService = {
  list(categoryId?: number, search?: string): Book[] {
    return bookRepo.findAll(categoryId, search);
  },

  getById(id: number): Book | undefined {
    return bookRepo.findById(id);
  },

  create(data: Omit<BookCreateInput, 'currentPage' | 'progress' | 'totalReadingTime' | 'lastReadAt'> & Partial<Pick<BookCreateInput, 'currentPage' | 'progress' | 'totalReadingTime' | 'lastReadAt'>>): Book {
    return bookRepo.create({
      ...data,
      currentPage: data.currentPage ?? 0,
      progress: data.progress ?? 0,
      totalReadingTime: data.totalReadingTime ?? 0,
      lastReadAt: data.lastReadAt ?? null,
    });
  },

  update(id: number, data: BookUpdateInput): Book {
    return bookRepo.update(id, data);
  },

  delete(id: number): void {
    bookRepo.delete(id);
  },

  updateProgress(id: number, input: ProgressUpdateInput): Book {
    const { currentPage, progress, readingTime } = input;
    const now = Math.floor(Date.now() / 1000);

    if (readingTime !== undefined && readingTime > 0) {
      const book = bookRepo.findById(id);
      const startPage = book?.currentPage ?? 0;

      db.prepare(`
        INSERT INTO reading_sessions (book_id, start_page, end_page, duration, date)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        id,
        startPage,
        currentPage,
        readingTime,
        new Date().toISOString().split('T')[0]
      );

      return bookRepo.update(id, {
        currentPage,
        progress,
        lastReadAt: now,
        totalReadingTime: (book?.totalReadingTime ?? 0) + readingTime,
      });
    }

    return bookRepo.update(id, {
      currentPage,
      progress,
      lastReadAt: now,
    });
  },
};
