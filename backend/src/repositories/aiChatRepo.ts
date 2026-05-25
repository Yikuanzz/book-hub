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
