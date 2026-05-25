import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 初始化数据库
initDatabase();
settingsRepo.seedProviders();

// 中间件
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));
app.use(express.json());

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
