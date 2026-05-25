import { db } from '../db/connection.js';
import type { Bookmark } from '../types/index.js';

function rowToBookmark(row: Record<string, unknown>): Bookmark {
  return {
    id: row.id as number,
    bookId: row.book_id as number,
    page: row.page as number,
    note: row.note as string | null,
    createdAt: row.created_at as number,
  };
}

export const bookmarkRepo = {
  findByBookId(bookId: number): Bookmark[] {
    const rows = db.prepare('SELECT * FROM bookmarks WHERE book_id = ? ORDER BY page').all(bookId) as Array<Record<string, unknown>>;
    return rows.map(rowToBookmark);
  },

  findById(id: number): Bookmark | undefined {
    const row = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return rowToBookmark(row);
  },

  create(bookId: number, page: number, note: string | null): Bookmark {
    const result = db.prepare('INSERT INTO bookmarks (book_id, page, note) VALUES (?, ?, ?)').run(bookId, page, note);
    return {
      id: Number(result.lastInsertRowid),
      bookId,
      page,
      note,
      createdAt: Math.floor(Date.now() / 1000),
    };
  },

  delete(id: number): void {
    db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
  },
};
