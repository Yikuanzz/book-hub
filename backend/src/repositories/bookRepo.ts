import { db } from '../db/connection.js';
import path from 'path';
import type { Book } from '../types/index.js';

export interface BookCreateInput {
  title: string;
  author: string;
  cover?: string | null;
  categoryId?: number | null;
  description?: string | null;
  tags?: string[];
  totalPages?: number | null;
  currentPage?: number;
  format?: string | null;
  filePath?: string | null;
  progress?: number;
  lastReadAt?: number | null;
  totalReadingTime?: number;
}

export interface BookUpdateInput {
  title?: string;
  author?: string;
  cover?: string | null;
  categoryId?: number | null;
  description?: string | null;
  tags?: string[];
  totalPages?: number | null;
  currentPage?: number;
  format?: string | null;
  filePath?: string | null;
  progress?: number;
  lastReadAt?: number | null;
  totalReadingTime?: number;
}

function mapBookRow(row: Record<string, unknown>): Book {
  return {
    id: row.id as number,
    title: row.title as string,
    author: row.author as string,
    cover: row.cover as string | null,
    categoryId: row.category_id as number | null,
    description: row.description as string | null,
    tags: JSON.parse((row.tags as string) || '[]'),
    totalPages: row.total_pages as number | null,
    currentPage: row.current_page as number,
    format: row.format as string | null,
    filePath: row.file_path
      ? `/uploads/books/${path.basename(row.file_path as string)}`
      : null,
    progress: row.progress as number,
    lastReadAt: row.last_read_at as number | null,
    totalReadingTime: row.total_reading_time as number,
    uploadedAt: row.uploaded_at as number,
    categoryName: row.category_name as string | undefined,
  };
}

export const bookRepo = {
  findAll(categoryId?: number, search?: string): Book[] {
    let sql = `
      SELECT b.*, c.name as category_name
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
    `;
    const conditions: string[] = [];
    const params: (number | string)[] = [];

    if (categoryId !== undefined) {
      conditions.push('b.category_id = ?');
      params.push(categoryId);
    }
    if (search) {
      conditions.push('(b.title LIKE ? OR b.author LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY b.last_read_at DESC NULLS LAST, b.uploaded_at DESC';

    const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
    return rows.map(mapBookRow);
  },

  findById(id: number): Book | undefined {
    const row = db.prepare(`
      SELECT b.*, c.name as category_name
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ?
    `).get(id) as Record<string, unknown> | undefined;

    if (!row) return undefined;
    return mapBookRow(row);
  },

  create(data: BookCreateInput): Book {
    const result = db.prepare(`
      INSERT INTO books (
        title, author, cover, category_id, description, tags,
        total_pages, current_page, format, file_path, progress,
        last_read_at, total_reading_time, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.title,
      data.author,
      data.cover ?? null,
      data.categoryId ?? null,
      data.description ?? null,
      JSON.stringify(data.tags ?? []),
      data.totalPages ?? null,
      data.currentPage ?? 0,
      data.format ?? null,
      data.filePath ?? null,
      data.progress ?? 0,
      data.lastReadAt ?? null,
      data.totalReadingTime ?? 0,
      Math.floor(Date.now() / 1000)
    );

    const id = Number(result.lastInsertRowid);
    return this.findById(id)!;
  },

  update(id: number, data: BookUpdateInput): Book {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.author !== undefined) { fields.push('author = ?'); values.push(data.author); }
    if (data.cover !== undefined) { fields.push('cover = ?'); values.push(data.cover); }
    if (data.categoryId !== undefined) { fields.push('category_id = ?'); values.push(data.categoryId); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    if (data.totalPages !== undefined) { fields.push('total_pages = ?'); values.push(data.totalPages); }
    if (data.currentPage !== undefined) { fields.push('current_page = ?'); values.push(data.currentPage); }
    if (data.format !== undefined) { fields.push('format = ?'); values.push(data.format); }
    if (data.filePath !== undefined) { fields.push('file_path = ?'); values.push(data.filePath); }
    if (data.progress !== undefined) { fields.push('progress = ?'); values.push(data.progress); }
    if (data.lastReadAt !== undefined) { fields.push('last_read_at = ?'); values.push(data.lastReadAt); }
    if (data.totalReadingTime !== undefined) { fields.push('total_reading_time = ?'); values.push(data.totalReadingTime); }

    values.push(id);
    db.prepare(`UPDATE books SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id)!;
  },

  delete(id: number): void {
    db.prepare('DELETE FROM books WHERE id = ?').run(id);
  },
};
