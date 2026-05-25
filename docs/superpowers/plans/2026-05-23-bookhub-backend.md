# BookHub 后端 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 BookHub 前端搭建完整的 Express + SQLite 后端 API 服务

**Architecture:** 分层架构（Repository + Service + Route），better-sqlite3 同步操作，文件本地存储，单用户无需认证

**Tech Stack:** TypeScript, Express, better-sqlite3, multer, zod, cors, Bun

---

## File Structure

```
server/
├── src/
│   ├── index.ts                    # Express 入口
│   ├── routes/
│   │   ├── categories.ts
│   │   ├── books.ts
│   │   ├── bookmarks.ts
│   │   ├── highlights.ts
│   │   ├── aiChat.ts
│   │   ├── settings.ts
│   │   └── stats.ts
│   ├── services/
│   │   ├── bookService.ts
│   │   ├── highlightService.ts
│   │   ├── aiProxyService.ts
│   │   └── statsService.ts
│   ├── repositories/
│   │   ├── categoryRepo.ts
│   │   ├── bookRepo.ts
│   │   ├── bookmarkRepo.ts
│   │   ├── highlightRepo.ts
│   │   ├── aiChatRepo.ts
│   │   ├── settingsRepo.ts
│   │   └── statsRepo.ts
│   ├── db/
│   │   ├── connection.ts
│   │   ├── init.ts
│   │   └── migrations/
│   │       └── 001_init.sql
│   ├── middleware/
│   │   └── errorHandler.ts
│   └── types/
│       └── index.ts
├── uploads/books/                  # 书籍文件存储
├── uploads/covers/                 # 封面图存储
├── data/                           # SQLite 数据库文件
├── package.json
└── tsconfig.json
```

---

### Task 1: 后端项目初始化

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.gitignore`

- [ ] **Step 1: 创建 server/package.json**

```json
{
  "name": "bookhub-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "start": "bun src/index.ts",
    "build": "tsc"
  },
  "dependencies": {
    "better-sqlite3": "^12.0.0",
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "multer": "^1.4.5-lts.2",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.2",
    "@types/multer": "^1.4.12",
    "@types/node": "^22.15.0",
    "typescript": "^5.8.0"
  }
}
```

- [ ] **Step 2: 创建 server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: 创建 server/.gitignore**

```
node_modules/
dist/
data/
uploads/
*.db
```

- [ ] **Step 4: 安装依赖**

Run: `cd server && bun install`

- [ ] **Step 5: 创建目录结构**

Run:
```bash
cd server
mkdir -p src/routes src/services src/repositories src/db/migrations src/middleware src/types
mkdir -p uploads/books uploads/covers data
```

---

### Task 2: 数据库连接与迁移

**Files:**
- Create: `server/src/db/migrations/001_init.sql`
- Create: `server/src/db/connection.ts`
- Create: `server/src/db/init.ts`

- [ ] **Step 1: 编写建表 SQL**

创建 `server/src/db/migrations/001_init.sql`：

```sql
-- 分类
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  created_at INTEGER DEFAULT (unixepoch())
);

-- 书籍
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  cover TEXT,
  category_id INTEGER,
  description TEXT,
  tags TEXT DEFAULT '[]',
  total_pages INTEGER,
  current_page INTEGER DEFAULT 0,
  format TEXT,
  file_path TEXT,
  progress INTEGER DEFAULT 0,
  last_read_at INTEGER,
  total_reading_time INTEGER DEFAULT 0,
  uploaded_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 书签
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  page INTEGER NOT NULL,
  note TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- 高亮/笔记
CREATE TABLE IF NOT EXISTS highlights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  page INTEGER NOT NULL,
  text TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#FEF08A',
  note TEXT,
  tags TEXT DEFAULT '[]',
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- AI 对话
CREATE TABLE IF NOT EXISTS ai_chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL UNIQUE,
  messages TEXT NOT NULL DEFAULT '[]',
  conversation_id TEXT NOT NULL DEFAULT '1',
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- 设置
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- AI 提供商
CREATE TABLE IF NOT EXISTS ai_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  model TEXT NOT NULL,
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2048,
  is_active INTEGER DEFAULT 0
);

-- 阅读会话
CREATE TABLE IF NOT EXISTS reading_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  start_page INTEGER,
  end_page INTEGER,
  duration INTEGER,
  date TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_last_read ON books(last_read_at DESC);
CREATE INDEX IF NOT EXISTS idx_highlights_book ON highlights(book_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_book ON bookmarks(book_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_date ON reading_sessions(date);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_book ON reading_sessions(book_id);

-- 初始分类数据
INSERT OR IGNORE INTO categories (id, name, color) VALUES
  (1, '文学小说', '#8B5CF6'),
  (2, '科技', '#0EA5E9'),
  (3, '历史', '#F59E0B'),
  (4, '哲学', '#EF4444'),
  (5, '心理学', '#10B981'),
  (6, '传记', '#EC4899'),
  (7, '艺术', '#F97316'),
  (8, '经济', '#6366F1'),
  (9, '自然科学', '#14B8A6'),
  (10, '自我提升', '#8B5CF6'),
  (11, '诗词鉴赏', '#D946EF');
```

- [ ] **Step 2: 创建数据库连接模块**

创建 `server/src/db/connection.ts`：

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../data/bookhub.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
```

- [ ] **Step 3: 创建数据库初始化模块**

创建 `server/src/db/init.ts`：

```typescript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function initDatabase() {
  const migrationPath = path.join(__dirname, 'migrations/001_init.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  db.exec(sql);
  console.log('Database initialized');
}
```

---

### Task 3: 共享类型定义

**Files:**
- Create: `server/src/types/index.ts`

- [ ] **Step 1: 定义所有共享类型**

创建 `server/src/types/index.ts`：

```typescript
export interface Category {
  id: number;
  name: string;
  color: string;
  createdAt: number;
  bookCount?: number;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  cover: string | null;
  categoryId: number | null;
  description: string | null;
  tags: string[];
  totalPages: number | null;
  currentPage: number;
  format: string | null;
  filePath: string | null;
  progress: number;
  lastReadAt: number | null;
  totalReadingTime: number;
  uploadedAt: number;
  categoryName?: string;
}

export interface Bookmark {
  id: number;
  bookId: number;
  page: number;
  note: string | null;
  createdAt: number;
}

export interface Highlight {
  id: number;
  bookId: number;
  page: number;
  text: string;
  color: string;
  note: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AIChat {
  id: number;
  bookId: number;
  messages: ChatMessage[];
  conversationId: string;
  updatedAt: number;
}

export interface AIProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
}

export interface ReadingSession {
  id: number;
  bookId: number;
  startPage: number | null;
  endPage: number | null;
  duration: number | null;
  date: string;
  createdAt: number;
}

export interface DashboardStats {
  totalReadingTime: number;
  booksRead: number;
  totalBooks: number;
  currentStreak: number;
  weeklyReading: number[];
  categoryDistribution: { name: string; count: number; color: string }[];
}

export interface HeatmapData {
  date: string;
  minutes: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string[];
}
```

---

### Task 4: 错误处理中间件

**Files:**
- Create: `server/src/middleware/errorHandler.ts`

- [ ] **Step 1: 创建错误处理中间件**

创建 `server/src/middleware/errorHandler.ts`：

```typescript
import type { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '../types/index.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: string[]
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      error: err.message,
      details: err.details,
    };
    res.status(err.statusCode).json(response);
    return;
  }

  console.error('Unexpected error:', err);
  const response: ApiResponse = {
    success: false,
    error: 'Internal Server Error',
  };
  res.status(500).json(response);
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

---

### Task 5: 分类模块

**Files:**
- Create: `server/src/repositories/categoryRepo.ts`
- Create: `server/src/routes/categories.ts`

- [ ] **Step 1: 创建 Category Repository**

创建 `server/src/repositories/categoryRepo.ts`：

```typescript
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
```

- [ ] **Step 2: 创建 Category Route**

创建 `server/src/routes/categories.ts`：

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { categoryRepo } from '../repositories/categoryRepo.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

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
```

---

### Task 6: 书籍模块 - Repository

**Files:**
- Create: `server/src/repositories/bookRepo.ts`

- [ ] **Step 1: 创建 Book Repository**

创建 `server/src/repositories/bookRepo.ts`：

```typescript
import { db } from '../db/connection.js';
import type { Book } from '../types/index.js';

function rowToBook(row: Record<string, unknown>): Book {
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
    filePath: row.file_path as string | null,
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
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (categoryId) {
      sql += ' AND b.category_id = ?';
      params.push(categoryId);
    }
    if (search) {
      sql += ' AND (b.title LIKE ? OR b.author LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY b.last_read_at DESC NULLS LAST, b.uploaded_at DESC';

    const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
    return rows.map(rowToBook);
  },

  findById(id: number): Book | undefined {
    const row = db.prepare(`
      SELECT b.*, c.name as category_name
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ?
    `).get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return rowToBook(row);
  },

  create(data: Omit<Book, 'id' | 'uploadedAt'>): Book {
    const result = db.prepare(`
      INSERT INTO books (title, author, cover, category_id, description, tags, total_pages, current_page, format, file_path, progress, last_read_at, total_reading_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.title,
      data.author,
      data.cover,
      data.categoryId,
      data.description,
      JSON.stringify(data.tags),
      data.totalPages,
      data.currentPage,
      data.format,
      data.filePath,
      data.progress,
      data.lastReadAt,
      data.totalReadingTime
    );
    return { ...data, id: Number(result.lastInsertRowid), uploadedAt: Math.floor(Date.now() / 1000) };
  },

  update(id: number, data: Partial<Omit<Book, 'id' | 'uploadedAt'>>): void {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) { sets.push('title = ?'); values.push(data.title); }
    if (data.author !== undefined) { sets.push('author = ?'); values.push(data.author); }
    if (data.cover !== undefined) { sets.push('cover = ?'); values.push(data.cover); }
    if (data.categoryId !== undefined) { sets.push('category_id = ?'); values.push(data.categoryId); }
    if (data.description !== undefined) { sets.push('description = ?'); values.push(data.description); }
    if (data.tags !== undefined) { sets.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    if (data.totalPages !== undefined) { sets.push('total_pages = ?'); values.push(data.totalPages); }
    if (data.currentPage !== undefined) { sets.push('current_page = ?'); values.push(data.currentPage); }
    if (data.format !== undefined) { sets.push('format = ?'); values.push(data.format); }
    if (data.filePath !== undefined) { sets.push('file_path = ?'); values.push(data.filePath); }
    if (data.progress !== undefined) { sets.push('progress = ?'); values.push(data.progress); }
    if (data.lastReadAt !== undefined) { sets.push('last_read_at = ?'); values.push(data.lastReadAt); }
    if (data.totalReadingTime !== undefined) { sets.push('total_reading_time = ?'); values.push(data.totalReadingTime); }

    if (sets.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE books SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  },

  delete(id: number): void {
    db.prepare('DELETE FROM books WHERE id = ?').run(id);
  },
};
```

---

### Task 7: 书籍模块 - Service + Route

**Files:**
- Create: `server/src/services/bookService.ts`
- Create: `server/src/routes/books.ts`

- [ ] **Step 1: 创建 Book Service**

创建 `server/src/services/bookService.ts`：

```typescript
import { bookRepo } from '../repositories/bookRepo.js';
import { statsRepo } from '../repositories/statsRepo.js';
import type { Book } from '../types/index.js';

export const bookService = {
  list(categoryId?: number, search?: string) {
    return bookRepo.findAll(categoryId, search);
  },

  getById(id: number) {
    return bookRepo.findById(id);
  },

  create(data: Omit<Book, 'id' | 'uploadedAt' | 'currentPage' | 'progress' | 'totalReadingTime'>) {
    return bookRepo.create({
      ...data,
      currentPage: 0,
      progress: 0,
      totalReadingTime: 0,
      lastReadAt: null,
    });
  },

  update(id: number, data: Partial<Omit<Book, 'id' | 'uploadedAt'>>) {
    bookRepo.update(id, data);
    return bookRepo.findById(id);
  },

  delete(id: number) {
    bookRepo.delete(id);
  },

  updateProgress(id: number, currentPage: number, progress: number, readingTime?: number) {
    const now = Math.floor(Date.now() / 1000);
    const update: Partial<Book> = { currentPage, progress, lastReadAt: now };

    if (readingTime && readingTime > 0) {
      const book = bookRepo.findById(id);
      if (book) {
        update.totalReadingTime = book.totalReadingTime + readingTime;
      }
      // 记录阅读会话
      statsRepo.createSession({
        bookId: id,
        startPage: null,
        endPage: currentPage,
        duration: readingTime,
        date: new Date().toISOString().split('T')[0],
      });
    }

    bookRepo.update(id, update);
    return bookRepo.findById(id);
  },
};
```

- [ ] **Step 2: 创建 Book Route（含文件上传）**

创建 `server/src/routes/books.ts`：

```typescript
import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { bookService } from '../services/bookService.js';
import { bookRepo } from '../repositories/bookRepo.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// 确保上传目录存在
const booksUploadDir = path.resolve('uploads/books');
const coversUploadDir = path.resolve('uploads/covers');
fs.mkdirSync(booksUploadDir, { recursive: true });
fs.mkdirSync(coversUploadDir, { recursive: true });

const bookFileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, booksUploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const coverStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, coversUploadDir),
  filename: (req, _file, cb) => {
    const bookId = req.params.id;
    cb(null, `${bookId}.jpg`);
  },
});

const uploadBookFile = multer({ storage: bookFileStorage, limits: { fileSize: 100 * 1024 * 1024 } });
const uploadCover = multer({ storage: coverStorage, limits: { fileSize: 5 * 1024 * 1024 } });

const bookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  cover: z.string().nullable().optional(),
  categoryId: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  totalPages: z.number().nullable().optional(),
  format: z.string().nullable().optional(),
  filePath: z.string().nullable().optional(),
});

const progressSchema = z.object({
  currentPage: z.number().min(0),
  progress: z.number().min(0).max(100),
  readingTime: z.number().optional(),
});

router.get('/', asyncHandler(async (req, res) => {
  const categoryId = req.query.category ? Number(req.query.category) : undefined;
  const search = req.query.search as string | undefined;
  const books = bookService.list(categoryId, search);
  res.json({ success: true, data: books });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const book = bookService.getById(id);
  if (!book) throw new AppError(404, 'Book not found');
  res.json({ success: true, data: book });
}));

router.post('/', asyncHandler(async (req, res) => {
  const parsed = bookSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Validation Error', parsed.error.issues.map(i => i.message));
  }
  const book = bookService.create(parsed.data);
  res.status(201).json({ success: true, data: book });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const book = bookService.getById(id);
  if (!book) throw new AppError(404, 'Book not found');
  const parsed = bookSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Validation Error', parsed.error.issues.map(i => i.message));
  }
  const updated = bookService.update(id, parsed.data);
  res.json({ success: true, data: updated });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const book = bookService.getById(id);
  if (!book) throw new AppError(404, 'Book not found');

  // 删除关联文件
  if (book.filePath) {
    const filePath = path.join(booksUploadDir, path.basename(book.filePath));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  const coverPath = path.join(coversUploadDir, `${id}.jpg`);
  if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);

  bookService.delete(id);
  res.json({ success: true });
}));

router.put('/:id/progress', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const parsed = progressSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Validation Error', parsed.error.issues.map(i => i.message));
  }
  const book = bookService.updateProgress(id, parsed.data.currentPage, parsed.data.progress, parsed.data.readingTime);
  res.json({ success: true, data: book });
}));

router.post('/:id/upload', uploadBookFile.single('file'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const book = bookService.getById(id);
  if (!book) throw new AppError(404, 'Book not found');
  if (!req.file) throw new AppError(400, 'No file uploaded');

  const filePath = `/uploads/books/${req.file.filename}`;
  const format = path.extname(req.file.originalname).slice(1).toLowerCase();
  bookService.update(id, { filePath, format: format === 'pdf' ? 'pdf' : format === 'epub' ? 'epub' : 'txt' });
  res.json({ success: true, data: { filePath } });
}));

router.post('/:id/cover', uploadCover.single('cover'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const book = bookService.getById(id);
  if (!book) throw new AppError(404, 'Book not found');
  if (!req.file) throw new AppError(400, 'No cover uploaded');

  const coverPath = `/uploads/covers/${id}.jpg`;
  bookService.update(id, { cover: coverPath });
  res.json({ success: true, data: { cover: coverPath } });
}));

export default router;
```

---

### Task 8: 书签模块

**Files:**
- Create: `server/src/repositories/bookmarkRepo.ts`
- Create: `server/src/routes/bookmarks.ts`

- [ ] **Step 1: 创建 Bookmark Repository**

创建 `server/src/repositories/bookmarkRepo.ts`：

```typescript
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
```

- [ ] **Step 2: 创建 Bookmark Route**

创建 `server/src/routes/bookmarks.ts`：

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { bookmarkRepo } from '../repositories/bookmarkRepo.js';
import { bookRepo } from '../repositories/bookRepo.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router({ mergeParams: true });

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
```

---

### Task 9: 高亮/笔记模块

**Files:**
- Create: `server/src/repositories/highlightRepo.ts`
- Create: `server/src/services/highlightService.ts`
- Create: `server/src/routes/highlights.ts`

- [ ] **Step 1: 创建 Highlight Repository**

创建 `server/src/repositories/highlightRepo.ts`：

```typescript
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
```

- [ ] **Step 2: 创建 Highlight Service**

创建 `server/src/services/highlightService.ts`：

```typescript
import { highlightRepo } from '../repositories/highlightRepo.js';
import type { Highlight } from '../types/index.js';

export const highlightService = {
  list(bookId?: number, tag?: string, search?: string) {
    return highlightRepo.findAll(bookId, tag, search);
  },

  create(data: Omit<Highlight, 'id' | 'createdAt' | 'updatedAt'>) {
    return highlightRepo.create(data);
  },

  update(id: number, data: Partial<Omit<Highlight, 'id' | 'createdAt'>>) {
    highlightRepo.update(id, data);
    return highlightRepo.findById(id);
  },

  delete(id: number) {
    highlightRepo.delete(id);
  },
};
```

- [ ] **Step 3: 创建 Highlight Route**

创建 `server/src/routes/highlights.ts`：

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { highlightService } from '../services/highlightService.js';
import { highlightRepo } from '../repositories/highlightRepo.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

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
```

---

### Task 10: AI 对话模块

**Files:**
- Create: `server/src/repositories/aiChatRepo.ts`
- Create: `server/src/services/aiProxyService.ts`
- Create: `server/src/routes/aiChat.ts`

- [ ] **Step 1: 创建 AI Chat Repository**

创建 `server/src/repositories/aiChatRepo.ts`：

```typescript
import { db } from '../db/connection.js';
import type { AIChat, ChatMessage } from '../types/index.js';

function rowToAIChat(row: Record<string, unknown>): AIChat {
  return {
    id: row.id as number,
    bookId: row.book_id as number,
    messages: JSON.parse(row.messages as string) as ChatMessage[],
    conversationId: row.conversation_id as string,
    updatedAt: row.updated_at as number,
  };
}

export const aiChatRepo = {
  findByBookId(bookId: number): AIChat | undefined {
    const row = db.prepare('SELECT * FROM ai_chats WHERE book_id = ?').get(bookId) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return rowToAIChat(row);
  },

  createOrUpdate(bookId: number, messages: ChatMessage[], conversationId: string): void {
    const now = Math.floor(Date.now() / 1000);
    const existing = db.prepare('SELECT id FROM ai_chats WHERE book_id = ?').get(bookId) as { id: number } | undefined;
    if (existing) {
      db.prepare('UPDATE ai_chats SET messages = ?, conversation_id = ?, updated_at = ? WHERE book_id = ?')
        .run(JSON.stringify(messages), conversationId, now, bookId);
    } else {
      db.prepare('INSERT INTO ai_chats (book_id, messages, conversation_id, updated_at) VALUES (?, ?, ?, ?)')
        .run(bookId, JSON.stringify(messages), conversationId, now);
    }
  },

  startNewConversation(bookId: number): void {
    const now = Math.floor(Date.now() / 1000);
    const existing = db.prepare('SELECT conversation_id FROM ai_chats WHERE book_id = ?').get(bookId) as { conversation_id: string } | undefined;
    const nextConvId = existing ? String(Number(existing.conversation_id) + 1) : '1';
    db.prepare('UPDATE ai_chats SET messages = ?, conversation_id = ?, updated_at = ? WHERE book_id = ?')
      .run('[]', nextConvId, now, bookId);
  },
};
```

- [ ] **Step 2: 创建 AI Proxy Service**

创建 `server/src/services/aiProxyService.ts`：

```typescript
import { settingsRepo } from '../repositories/settingsRepo.js';
import type { ChatMessage } from '../types/index.js';

export const aiProxyService = {
  async sendMessage(bookTitle: string, currentPage: number, userMessage: string, history: ChatMessage[]): Promise<string> {
    const provider = settingsRepo.getActiveProvider();
    if (!provider) {
      throw new Error('No active AI provider configured');
    }

    const systemPrompt = `你是一位专业的阅读助手。用户正在阅读《${bookTitle}》这本书，当前在第 ${currentPage} 页。请基于书籍内容帮助用户理解、分析和讨论。保持回答简洁、有洞察力。`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: provider.temperature,
        max_tokens: provider.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content || '抱歉，我没有收到回复。';
  },
};
```

- [ ] **Step 3: 创建 AI Chat Route**

创建 `server/src/routes/aiChat.ts`：

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { aiChatRepo } from '../repositories/aiChatRepo.js';
import { aiProxyService } from '../services/aiProxyService.js';
import { bookRepo } from '../repositories/bookRepo.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router({ mergeParams: true });

const messageSchema = z.object({
  content: z.string().min(1),
  currentPage: z.number().default(1),
});

router.get('/', asyncHandler(async (req, res) => {
  const bookId = Number(req.params.bookId);
  const book = bookRepo.findById(bookId);
  if (!book) throw new AppError(404, 'Book not found');

  let chat = aiChatRepo.findByBookId(bookId);
  if (!chat) {
    aiChatRepo.createOrUpdate(bookId, [], '1');
    chat = aiChatRepo.findByBookId(bookId)!;
  }
  res.json({ success: true, data: chat });
}));

router.post('/message', asyncHandler(async (req, res) => {
  const bookId = Number(req.params.bookId);
  const book = bookRepo.findById(bookId);
  if (!book) throw new AppError(404, 'Book not found');

  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Validation Error', parsed.error.issues.map(i => i.message));
  }

  let chat = aiChatRepo.findByBookId(bookId);
  if (!chat) {
    aiChatRepo.createOrUpdate(bookId, [], '1');
    chat = aiChatRepo.findByBookId(bookId)!;
  }

  const userMsg: import('../types/index.js').ChatMessage = {
    id: `msg-${Date.now()}`,
    role: 'user',
    content: parsed.data.content,
    timestamp: Date.now(),
  };

  const history = [...chat.messages, userMsg];

  try {
    const reply = await aiProxyService.sendMessage(book.title, parsed.data.currentPage, parsed.data.content, chat.messages);
    const assistantMsg: import('../types/index.js').ChatMessage = {
      id: `msg-${Date.now()}-r`,
      role: 'assistant',
      content: reply,
      timestamp: Date.now(),
    };
    const newMessages = [...history, assistantMsg];
    aiChatRepo.createOrUpdate(bookId, newMessages, chat.conversationId);
    res.json({ success: true, data: { messages: newMessages, conversationId: chat.conversationId } });
  } catch (err) {
    throw new AppError(502, `AI service error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}));

router.post('/new', asyncHandler(async (req, res) => {
  const bookId = Number(req.params.bookId);
  const book = bookRepo.findById(bookId);
  if (!book) throw new AppError(404, 'Book not found');

  aiChatRepo.startNewConversation(bookId);
  const chat = aiChatRepo.findByBookId(bookId)!;
  res.json({ success: true, data: chat });
}));

export default router;
```

---

### Task 11: 设置模块

**Files:**
- Create: `server/src/repositories/settingsRepo.ts`
- Create: `server/src/routes/settings.ts`

- [ ] **Step 1: 创建 Settings Repository**

创建 `server/src/repositories/settingsRepo.ts`：

```typescript
import { db } from '../db/connection.js';
import type { AIProvider } from '../types/index.js';

export const settingsRepo = {
  getAll(): Record<string, string> {
    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  },

  set(key: string, value: string): void {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  },

  setMany(entries: Record<string, string>): void {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(entries)) {
      stmt.run(key, value);
    }
  },

  findAllProviders(): AIProvider[] {
    const rows = db.prepare('SELECT * FROM ai_providers').all() as Array<Record<string, unknown>>;
    return rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      baseUrl: row.base_url as string,
      apiKey: row.api_key as string,
      model: row.model as string,
      temperature: row.temperature as number,
      maxTokens: row.max_tokens as number,
      isActive: Boolean(row.is_active),
    }));
  },

  getActiveProvider(): AIProvider | undefined {
    const row = db.prepare('SELECT * FROM ai_providers WHERE is_active = 1 LIMIT 1').get() as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return {
      id: row.id as string,
      name: row.name as string,
      baseUrl: row.base_url as string,
      apiKey: row.api_key as string,
      model: row.model as string,
      temperature: row.temperature as number,
      maxTokens: row.max_tokens as number,
      isActive: true,
    };
  },

  createProvider(provider: Omit<AIProvider, 'id'> & { id?: string }): AIProvider {
    const id = provider.id || `ai-${Date.now()}`;
    db.prepare(`
      INSERT INTO ai_providers (id, name, base_url, api_key, model, temperature, max_tokens, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, provider.name, provider.baseUrl, provider.apiKey, provider.model, provider.temperature, provider.maxTokens, provider.isActive ? 1 : 0);
    return { ...provider, id };
  },

  updateProvider(id: string, data: Partial<Omit<AIProvider, 'id'>>): void {
    const sets: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
    if (data.baseUrl !== undefined) { sets.push('base_url = ?'); values.push(data.baseUrl); }
    if (data.apiKey !== undefined) { sets.push('api_key = ?'); values.push(data.apiKey); }
    if (data.model !== undefined) { sets.push('model = ?'); values.push(data.model); }
    if (data.temperature !== undefined) { sets.push('temperature = ?'); values.push(data.temperature); }
    if (data.maxTokens !== undefined) { sets.push('max_tokens = ?'); values.push(data.maxTokens); }
    if (data.isActive !== undefined) { sets.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }
    if (sets.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE ai_providers SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  },

  deleteProvider(id: string): void {
    db.prepare('DELETE FROM ai_providers WHERE id = ?').run(id);
  },

  activateProvider(id: string): void {
    db.prepare('UPDATE ai_providers SET is_active = 0').run();
    db.prepare('UPDATE ai_providers SET is_active = 1 WHERE id = ?').run(id);
  },

  seedProviders(): void {
    const count = db.prepare('SELECT COUNT(*) as c FROM ai_providers').get() as { c: number };
    if (count.c > 0) return;

    const providers = [
      { id: 'openai-1', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 2048, isActive: true },
      { id: 'ollama-1', name: 'Ollama 本地', baseUrl: 'http://localhost:11434/v1', apiKey: 'ollama', model: 'llama3.1:8b', temperature: 0.7, maxTokens: 4096, isActive: false },
    ];

    for (const p of providers) {
      db.prepare(`
        INSERT INTO ai_providers (id, name, base_url, api_key, model, temperature, max_tokens, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(p.id, p.name, p.baseUrl, p.apiKey, p.model, p.temperature, p.maxTokens, p.isActive ? 1 : 0);
    }
  },
};
```

- [ ] **Step 2: 创建 Settings Route**

创建 `server/src/routes/settings.ts`：

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { settingsRepo } from '../repositories/settingsRepo.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

const providerSchema = z.object({
  name: z.string().min(1),
  baseUrl: z.string().url(),
  apiKey: z.string(),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).default(2048),
});

router.get('/', asyncHandler(async (_req, res) => {
  const settings = settingsRepo.getAll();
  res.json({ success: true, data: settings });
}));

router.put('/', asyncHandler(async (req, res) => {
  if (typeof req.body !== 'object' || req.body === null) {
    throw new AppError(400, 'Invalid settings body');
  }
  const entries: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.body)) {
    entries[key] = String(value);
  }
  settingsRepo.setMany(entries);
  res.json({ success: true, data: entries });
}));

router.get('/ai-providers', asyncHandler(async (_req, res) => {
  const providers = settingsRepo.findAllProviders();
  res.json({ success: true, data: providers });
}));

router.post('/ai-providers', asyncHandler(async (req, res) => {
  const parsed = providerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Validation Error', parsed.error.issues.map(i => i.message));
  }
  const provider = settingsRepo.createProvider(parsed.data);
  res.status(201).json({ success: true, data: provider });
}));

router.put('/ai-providers/:id', asyncHandler(async (req, res) => {
  const id = req.params.id;
  const parsed = providerSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Validation Error', parsed.error.issues.map(i => i.message));
  }
  settingsRepo.updateProvider(id, parsed.data);
  const providers = settingsRepo.findAllProviders();
  res.json({ success: true, data: providers.find(p => p.id === id) });
}));

router.delete('/ai-providers/:id', asyncHandler(async (req, res) => {
  const id = req.params.id;
  settingsRepo.deleteProvider(id);
  res.json({ success: true });
}));

router.put('/ai-providers/:id/activate', asyncHandler(async (req, res) => {
  const id = req.params.id;
  settingsRepo.activateProvider(id);
  res.json({ success: true });
}));

export default router;
```

---

### Task 12: 阅读统计模块

**Files:**
- Create: `server/src/repositories/statsRepo.ts`
- Create: `server/src/services/statsService.ts`
- Create: `server/src/routes/stats.ts`

- [ ] **Step 1: 创建 Stats Repository**

创建 `server/src/repositories/statsRepo.ts`：

```typescript
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

    // 如果今天没有阅读，从昨天开始算
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
```

- [ ] **Step 2: 创建 Stats Service**

创建 `server/src/services/statsService.ts`：

```typescript
import { statsRepo } from '../repositories/statsRepo.js';
import type { DashboardStats, HeatmapData } from '../types/index.js';

export const statsService = {
  getDashboardStats(): DashboardStats {
    return {
      totalReadingTime: statsRepo.getTotalReadingTime(),
      booksRead: statsRepo.getBooksRead(),
      totalBooks: statsRepo.getTotalBooks(),
      currentStreak: statsRepo.getCurrentStreak(),
      weeklyReading: statsRepo.getWeeklyReading(),
      categoryDistribution: statsRepo.getCategoryDistribution(),
    };
  },

  getHeatmap(year?: number): HeatmapData[] {
    return statsRepo.getHeatmap(year);
  },
};
```

- [ ] **Step 3: 创建 Stats Route**

创建 `server/src/routes/stats.ts`：

```typescript
import { Router } from 'express';
import { statsService } from '../services/statsService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/dashboard', asyncHandler(async (_req, res) => {
  const stats = statsService.getDashboardStats();
  res.json({ success: true, data: stats });
}));

router.get('/heatmap', asyncHandler(async (req, res) => {
  const year = req.query.year ? Number(req.query.year) : undefined;
  const data = statsService.getHeatmap(year);
  res.json({ success: true, data });
}));

export default router;
```

---

### Task 13: Express 入口整合

**Files:**
- Create: `server/src/index.ts`

- [ ] **Step 1: 创建 Express 入口**

创建 `server/src/index.ts`：

```typescript
import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDatabase } from './db/init.js';
import { errorHandler } from './middleware/errorHandler.js';
import { settingsRepo } from './repositories/settingsRepo.js';

import categoryRoutes from './routes/categories.js';
import bookRoutes from './routes/books.js';
import bookmarkRoutes from './routes/bookmarks.js';
import highlightRoutes from './routes/highlights.js';
import aiChatRoutes from './routes/aiChat.js';
import settingsRoutes from './routes/settings.js';
import statsRoutes from './routes/stats.js';

const app = express();
const PORT = process.env.PORT || 3001;

// 初始化数据库
initDatabase();
settingsRepo.seedProviders();

// 中间件
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));
app.use(express.json());

// 静态文件服务
app.use('/uploads', express.static(path.resolve('uploads')));

// 路由
app.use('/api/categories', categoryRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/books/:bookId/bookmarks', bookmarkRoutes);
app.use('/api/highlights', highlightRoutes);
app.use('/api/books/:bookId/ai-chat', aiChatRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/stats', statsRoutes);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

// 错误处理
app.use(errorHandler);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not Found' });
});

app.listen(PORT, () => {
  console.log(`BookHub server running on http://localhost:${PORT}`);
});
```

---

### Task 14: 验证启动

- [ ] **Step 1: 启动后端服务**

Run: `cd server && bun run dev`

Expected output:
```
Database initialized
BookHub server running on http://localhost:3001
```

- [ ] **Step 2: 测试健康检查**

Run: `curl http://localhost:3001/api/health`

Expected:
```json
{ "success": true, "data": { "status": "ok" } }
```

- [ ] **Step 3: 测试分类列表**

Run: `curl http://localhost:3001/api/categories`

Expected: 返回 11 个初始分类

- [ ] **Step 4: 测试书籍 CRUD**

创建书籍:
```bash
curl -X POST http://localhost:3001/api/books \
  -H "Content-Type: application/json" \
  -d '{"title":"测试书籍","author":"测试作者","categoryId":1,"tags":["测试"]}'
```

Expected: 返回创建的书籍，包含 id

获取列表:
```bash
curl http://localhost:3001/api/books
```

Expected: 包含刚创建的书籍

---

## 自检结果

**1. Spec 覆盖率检查：**

| Spec 要求 | 实现任务 |
|-----------|---------|
| SQLite 表结构（books, bookmarks, highlights, categories, ai_chats, settings, ai_providers, reading_sessions） | Task 2 |
| 分类 CRUD | Task 5 |
| 书籍 CRUD + 进度更新 | Task 6, 7 |
| 文件上传（书籍文件 + 封面） | Task 7 |
| 书签 CRUD | Task 8 |
| 高亮/笔记 CRUD + 过滤 | Task 9 |
| AI 对话（获取、发送、新对话） | Task 10 |
| AI 代理转发 | Task 10 |
| 设置（key-value + AI providers） | Task 11 |
| 阅读统计（dashboard + heatmap） | Task 12 |
| 错误处理中间件 | Task 4 |
| Express 入口 | Task 13 |
| CORS + 静态文件服务 | Task 13 |

**2. Placeholder 扫描：** 无 TBD/TODO/"implement later"/"add appropriate" 等占位符。所有步骤包含完整代码。

**3. 类型一致性检查：**
- `Book.categoryId` 在 types、repo、route 中一致
- `AIProvider.baseUrl` vs `base_url`（数据库列名）在 repo 中正确映射
- `ChatMessage` 接口在 types 和 aiChat route 中一致
- 所有外键级联删除策略与 spec 一致

---

## 实施前清理任务（用户要求）

- [ ] 将根目录 `.png` 截图文件移动到 `screenshots/` 文件夹
- [ ] 更新 `.gitignore` 忽略 `screenshots/`
