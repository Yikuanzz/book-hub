import { db } from '../db/connection.js';
import type { ReadingSession, HeatmapData } from '../types/index.js';

export const statsRepo = {
  createSession(data: Omit<ReadingSession, 'id' | 'createdAt'>): void {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      INSERT INTO reading_sessions (book_id, start_page, end_page, duration, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.bookId, data.startPage, data.endPage, data.duration, data.date, now);
  },

  getTotalReadingTime(): number {
    const row = db.prepare('SELECT COALESCE(SUM(duration), 0) as total FROM reading_sessions').get() as { total: number };
    return row.total;
  },

  getBooksRead(): number {
    const row = db.prepare('SELECT COUNT(*) as count FROM books WHERE progress = 100').get() as { count: number };
    return row.count;
  },

  getTotalBooks(): number {
    const row = db.prepare('SELECT COUNT(*) as count FROM books').get() as { count: number };
    return row.count;
  },

  getCurrentStreak(): number {
    const rows = db.prepare(`
      SELECT DISTINCT date FROM reading_sessions
      WHERE date >= date('now', '-365 days')
      ORDER BY date DESC
    `).all() as Array<{ date: string }>;

    if (rows.length === 0) return 0;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let streak = 0;
    let expectedDate = today;

    if (rows[0]?.date !== today) {
      expectedDate = yesterday;
      if (rows[0]?.date !== yesterday) return 0;
    }

    for (const row of rows) {
      if (row.date === expectedDate) {
        streak++;
        const prev = new Date(new Date(expectedDate).getTime() - 86400000);
        expectedDate = prev.toISOString().split('T')[0];
      } else {
        break;
      }
    }

    return streak;
  },

  getWeeklyReading(): number[] {
    const rows = db.prepare(`
      SELECT date, COALESCE(SUM(duration), 0) as minutes
      FROM reading_sessions
      WHERE date >= date('now', '-6 days')
      GROUP BY date
      ORDER BY date
    `).all() as Array<{ date: string; minutes: number }>;

    const result: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const row = rows.find(r => r.date === d);
      result.push(row ? row.minutes : 0);
    }
    return result;
  },

  getCategoryDistribution(): Array<{ name: string; count: number; color: string }> {
    return db.prepare(`
      SELECT c.name, COUNT(b.id) as count, c.color
      FROM categories c
      LEFT JOIN books b ON b.category_id = c.id
      GROUP BY c.id
      ORDER BY count DESC
    `).all() as Array<{ name: string; count: number; color: string }>;
  },

  getHeatmap(year?: number): HeatmapData[] {
    const targetYear = year || new Date().getFullYear();
    const rows = db.prepare(`
      SELECT date, COALESCE(SUM(duration), 0) as minutes
      FROM reading_sessions
      WHERE date >= ? AND date <= ?
      GROUP BY date
      ORDER BY date
    `).all(`${targetYear}-01-01`, `${targetYear}-12-31`) as Array<{ date: string; minutes: number }>;

    return rows.map(r => ({ date: r.date, minutes: r.minutes }));
  },
};
