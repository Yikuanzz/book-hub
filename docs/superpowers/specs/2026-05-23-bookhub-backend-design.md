# BookHub 后端设计文档

## 1. 项目概述

为 BookHub 电子书阅读管理应用设计并实现后端服务，使用 TypeScript + Express + SQLite，文件本地存储。

## 2. 架构决策

### 2.1 架构风格：分层架构（Repository + Service）

```
routes/        → Express 路由（薄层，参数校验、调用 service）
services/     → 业务逻辑（阅读统计计算、AI 代理转发等）
repositories/ → 数据库访问层（SQL 操作）
db/           → 连接、迁移
```

选择理由：数据模型涉及多个实体，且包含阅读统计等业务逻辑，分层架构在保持清晰的同时不过度复杂。

### 2.2 技术栈

| 组件 | 选型 | 说明 |
|------|------|------|
| 运行时 | Bun | 统一前后端包管理器 |
| Web 框架 | Express | 成熟稳定 |
| 数据库 | SQLite (better-sqlite3) | 本地单文件，零配置 |
| 文件上传 | multer | Express 生态标准 |
| 校验 | zod | 前后端可共享 schema |
| 开发热重载 | tsx / bun --watch | 快速开发体验 |

### 2.3 用户模型

单用户本地服务，**无需认证系统**。

## 3. 数据库设计

### 3.1 表结构

```sql
-- 分类
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  created_at INTEGER DEFAULT (unixepoch())
);

-- 书籍
CREATE TABLE books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  cover TEXT,                    -- 封面 URL 或本地路径
  category_id INTEGER,
  description TEXT,
  tags TEXT,                     -- JSON 数组
  total_pages INTEGER,
  current_page INTEGER DEFAULT 0,
  format TEXT,                   -- 'pdf' | 'epub' | 'txt'
  file_path TEXT,                -- 本地文件路径
  progress INTEGER DEFAULT 0,    -- 0-100
  last_read_at INTEGER,          -- unixepoch
  total_reading_time INTEGER DEFAULT 0, -- 分钟
  uploaded_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 书签
CREATE TABLE bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  page INTEGER NOT NULL,
  note TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- 高亮/笔记
CREATE TABLE highlights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  page INTEGER NOT NULL,
  text TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#FEF08A',
  note TEXT,
  tags TEXT,                     -- JSON 数组
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- AI 对话（每本书只保留当前轮次）
CREATE TABLE ai_chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL UNIQUE,
  messages TEXT NOT NULL DEFAULT '[]',  -- JSON 数组 {role, content, timestamp}
  conversation_id TEXT NOT NULL DEFAULT '1',
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- 用户设置（key-value）
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- AI 提供商配置
CREATE TABLE ai_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  model TEXT NOT NULL,
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2048,
  is_active INTEGER DEFAULT 0    -- 1 = 当前激活
);

-- 阅读会话记录（用于统计）
CREATE TABLE reading_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  start_page INTEGER,
  end_page INTEGER,
  duration INTEGER,              -- 分钟
  date TEXT NOT NULL,            -- YYYY-MM-DD
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
```

### 3.2 索引

```sql
CREATE INDEX idx_books_category ON books(category_id);
CREATE INDEX idx_books_last_read ON books(last_read_at);
CREATE INDEX idx_highlights_book ON highlights(book_id);
CREATE INDEX idx_bookmarks_book ON bookmarks(book_id);
CREATE INDEX idx_reading_sessions_date ON reading_sessions(date);
CREATE INDEX idx_reading_sessions_book ON reading_sessions(book_id);
```

## 4. API 接口设计

### 4.1 统一响应格式

```json
{ "success": true, "data": {} }
{ "success": false, "error": "...", "details?": [] }
```

### 4.2 书籍管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/books` | 列表，支持 `?category=&search=` |
| GET | `/api/books/:id` | 详情 |
| POST | `/api/books` | 创建，`{title, author, cover?, categoryId?, description?, tags?, totalPages?, format?, filePath?}` |
| PUT | `/api/books/:id` | 更新 |
| DELETE | `/api/books/:id` | 删除（级联删除关联数据） |
| PUT | `/api/books/:id/progress` | 更新进度，`{currentPage, progress, lastReadAt, readingTime?}` |

### 4.3 文件

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/books/:id/upload` | 上传书籍文件（multipart，PDF/epub/txt） |
| POST | `/api/books/:id/cover` | 上传封面图（multipart，jpg/png） |
| GET | `/uploads/books/:filename` | 静态文件服务 |
| GET | `/uploads/covers/:filename` | 静态文件服务 |

文件存储路径：
- 书籍文件：`server/uploads/books/{bookId}-{timestamp}.{ext}`
- 封面图：`server/uploads/covers/{bookId}.jpg`

### 4.4 书签

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/books/:bookId/bookmarks` | 某书的所有书签 |
| POST | `/api/books/:bookId/bookmarks` | 创建，`{page, note?}` |
| DELETE | `/api/bookmarks/:id` | 删除 |

### 4.5 高亮/笔记

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/highlights` | 列表，`?bookId=&tag=&search=` |
| POST | `/api/highlights` | 创建，`{bookId, page, text, color?, note?, tags?}` |
| PUT | `/api/highlights/:id` | 更新 |
| DELETE | `/api/highlights/:id` | 删除 |

### 4.6 分类

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/categories` | 列表（含 bookCount） |
| POST | `/api/categories` | 创建，`{name, color?}` |
| PUT | `/api/categories/:id` | 更新 |
| DELETE | `/api/categories/:id` | 删除（关联书籍 category_id 设为 NULL） |

### 4.7 AI 对话

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/books/:bookId/ai-chat` | 获取当前轮次对话 |
| POST | `/api/books/:bookId/ai-chat/message` | 发送消息 |
| POST | `/api/books/:bookId/ai-chat/new` | 开启新对话（清空旧记录，conversation_id +1） |

**AI 消息处理流程：**
1. 接收用户消息
2. 读取该书信息和当前对话历史
3. 从 settings 获取 active AI provider 配置
4. 构造 system prompt："你是一位阅读助手，正在帮助用户理解《{书名}》这本书。用户当前在第 {page} 页。"
5. 调用 provider 的 `/v1/chat/completions` API
6. 将 user + assistant 消息存入 ai_chats
7. 返回 assistant reply

### 4.8 设置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/settings` | 获取所有设置 |
| PUT | `/api/settings` | 批量更新，`{key: value}` |
| GET | `/api/settings/ai-providers` | AI 提供商列表 |
| POST | `/api/settings/ai-providers` | 添加提供商 |
| PUT | `/api/settings/ai-providers/:id` | 更新提供商 |
| DELETE | `/api/settings/ai-providers/:id` | 删除提供商 |
| PUT | `/api/settings/ai-providers/:id/activate` | 设为当前激活 |

### 4.9 阅读统计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats/dashboard` | 仪表盘数据 |
| GET | `/api/stats/heatmap` | 热力图数据，`?year=` |

**Dashboard 数据结构：**
```json
{
  "totalReadingTime": 1860,
  "booksRead": 3,
  "totalBooks": 20,
  "currentStreak": 7,
  "weeklyReading": [120, 90, 0, 180, 60, 240, 30],
  "categoryDistribution": [
    { "name": "文学小说", "count": 5, "color": "#8B5CF6" }
  ]
}
```

**Heatmap 数据结构：**
```json
[
  { "date": "2026-01-01", "minutes": 120 },
  { "date": "2026-01-02", "minutes": 0 }
]
```

## 5. 目录结构

```
book-hub/
├── src/                        # 前端（已有）
├── server/
│   ├── src/
│   │   ├── index.ts            # Express 入口
│   │   ├── routes/
│   │   │   ├── books.ts
│   │   │   ├── bookmarks.ts
│   │   │   ├── highlights.ts
│   │   │   ├── categories.ts
│   │   │   ├── aiChat.ts
│   │   │   ├── settings.ts
│   │   │   ├── stats.ts
│   │   │   └── files.ts
│   │   ├── services/
│   │   │   ├── bookService.ts
│   │   │   ├── highlightService.ts
│   │   │   ├── aiProxyService.ts
│   │   │   └── statsService.ts
│   │   ├── repositories/
│   │   │   ├── bookRepo.ts
│   │   │   ├── bookmarkRepo.ts
│   │   │   ├── highlightRepo.ts
│   │   │   ├── categoryRepo.ts
│   │   │   ├── aiChatRepo.ts
│   │   │   ├── settingsRepo.ts
│   │   │   └── statsRepo.ts
│   │   ├── db/
│   │   │   ├── connection.ts
│   │   │   ├── init.ts
│   │   │   └── migrations/
│   │   │       └── 001_init.sql
│   │   ├── middleware/
│   │   │   └── errorHandler.ts
│   │   └── types/
│   │       └── index.ts        # 共享接口
│   ├── uploads/                # 文件存储（gitignore）
│   │   ├── books/
│   │   └── covers/
│   ├── package.json
│   └── tsconfig.json
├── screenshots/                # 截图统一存放
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-05-23-bookhub-backend-design.md
├── package.json                # 前端
└── vite.config.ts              # 前端
```

## 6. 错误处理

统一错误响应格式：

```json
{ "success": false, "error": "Validation Error", "details": ["title is required"] }
```

错误类型：
- `404 Not Found` - 资源不存在
- `400 Bad Request` - 参数校验失败
- `500 Internal Server Error` - 服务端错误
- `422 Unprocessable Entity` - 业务逻辑错误

## 7. 前端适配

前端需要将 zustand store 从本地 mock 数据切换为 API 调用：
- `booksStore` → 调用 `/api/books/*`
- `notesStore`（highlights）→ 调用 `/api/highlights/*`
- `aiChatStore` → 调用 `/api/books/:id/ai-chat/*`
- `settingsStore` → 调用 `/api/settings/*`
- `useStore`（旧 mock）→ 逐步废弃，功能拆分到各 store

## 8. 非功能性需求

- CORS 允许前端 dev server（`http://localhost:5173`）
- 静态文件服务 `/uploads/*`
- SQLite 数据库文件：`server/data/bookhub.db`
- 开发启动：`bun --watch server/src/index.ts`
- 生产启动：`bun server/src/index.ts`
