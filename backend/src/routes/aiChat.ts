import express from 'express';
import { z } from 'zod';
import { aiChatRepo } from '../repositories/aiChatRepo.js';
import { aiProxyService } from '../services/aiProxyService.js';
import { bookRepo } from '../repositories/bookRepo.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import type { ChatMessage } from '../types/index.js';

const router: express.Router = express.Router({ mergeParams: true });

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

  const userMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    role: 'user',
    content: parsed.data.content,
    timestamp: Date.now(),
  };

  const history = [...chat.messages, userMsg];

  try {
    const reply = await aiProxyService.sendMessage(book.title, parsed.data.currentPage, parsed.data.content, chat.messages);
    const assistantMsg: ChatMessage = {
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
