import { db } from '../db/connection.js';
import type { Category } from '../types/index.js';

export const categoryRepo = {
  findAll(): Category[] {
    const rows = db.prepare(`
      SELECT c.*, COUNT(b.id) as bookCount
      FROM categories c
      LEFT JOIN books b ON b.category_id = c.id
      GROUP BY c.id
      ORDER BY c.id
    `).all() as Array<Record<string, unknown>>;

    return rows.map(row => ({
      id: row.id as number,
      name: row.name as string,
      color: row.color as string,
      createdAt: row.created_at as number,
      bookCount: row.bookCount as number,
    }));
  },

  findById(id: number): Category | undefined {
    const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return {
      id: row.id as number,
      name: row.name as string,
      color: row.color as string,
      createdAt: row.created_at as number,
    };
  },

  create(name: string, color: string): Category {
    const result = db.prepare('INSERT INTO categories (name, color) VALUES (?, ?)').run(name, color);
    return {
      id: Number(result.lastInsertRowid),
      name,
      color,
      createdAt: Math.floor(Date.now() / 1000),
    };
  },

  update(id: number, name: string, color: string): void {
    db.prepare('UPDATE categories SET name = ?, color = ? WHERE id = ?').run(name, color, id);
  },

  delete(id: number): void {
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  },
};
