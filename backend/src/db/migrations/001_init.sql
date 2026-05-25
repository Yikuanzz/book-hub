-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  created_at INTEGER DEFAULT (unixepoch())
);

-- Books
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

-- Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  page INTEGER NOT NULL,
  note TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- Highlights
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

-- AI Chats
CREATE TABLE IF NOT EXISTS ai_chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL UNIQUE,
  messages TEXT NOT NULL DEFAULT '[]',
  conversation_id TEXT NOT NULL DEFAULT '1',
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- AI Providers
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

-- Reading Sessions
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_last_read ON books(last_read_at DESC);
CREATE INDEX IF NOT EXISTS idx_highlights_book ON highlights(book_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_book ON bookmarks(book_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_date ON reading_sessions(date);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_book ON reading_sessions(book_id);

-- Initial categories
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
