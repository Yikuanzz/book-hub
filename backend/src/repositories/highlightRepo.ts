import { db } from '../db/connection.js';
import type { Highlight } from '../types/index.js';

function rowToHighlight(row: Record<string, unknown>): Highlight {
  return {
    id: row.id as number,
    bookId: row.book_id as number,
    page: row.page as number,
    text: row.text as string,
    color: row.color as string,
    note: row.note as string | null,
    tags: JSON.parse((row.tags as string) || '[]'),
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

export const highlightRepo = {
  findAll(bookId?: number, tag?: string, search?: string): Highlight[] {
    let sql = 'SELECT * FROM highlights WHERE 1=1';
    const params: (string | number)[] = [];

    if (bookId) {
      sql += ' AND book_id = ?';
      params.push(bookId);
    }
    if (search) {
      sql += ' AND (text LIKE ? OR note LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY created_at DESC';

    const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
    let highlights = rows.map(rowToHighlight);

    if (tag) {
      highlights = highlights.filter(h => h.tags.includes(tag));
    }

    return highlights;
  },

  findById(id: number): Highlight | undefined {
    const row = db.prepare('SELECT * FROM highlights WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return rowToHighlight(row);
  },

  create(data: Omit<Highlight, 'id' | 'createdAt' | 'updatedAt'>): Highlight {
    const now = Math.floor(Date.now() / 1000);
    const result = db.prepare(`
      INSERT INTO highlights (book_id, page, text, color, note, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.bookId, data.page, data.text, data.color, data.note, JSON.stringify(data.tags), now, now);
    return { ...data, id: Number(result.lastInsertRowid), createdAt: now, updatedAt: now };
  },

  update(id: number, data: Partial<Omit<Highlight, 'id' | 'createdAt'>>): void {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (data.page !== undefined) { sets.push('page = ?'); values.push(data.page); }
    if (data.text !== undefined) { sets.push('text = ?'); values.push(data.text); }
    if (data.color !== undefined) { sets.push('color = ?'); values.push(data.color); }
    if (data.note !== undefined) { sets.push('note = ?'); values.push(data.note); }
    if (data.tags !== undefined) { sets.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    if (sets.length === 0) return;

    sets.push('updated_at = ?');
    values.push(Math.floor(Date.now() / 1000));
    values.push(id);

    db.prepare(`UPDATE highlights SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  },

  delete(id: number): void {
    db.prepare('DELETE FROM highlights WHERE id = ?').run(id);
  },
};
