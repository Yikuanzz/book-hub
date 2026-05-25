import { create } from 'zustand';

const API_BASE = '';

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'API error');
  return json.data as T;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'API error');
  return json.data as T;
}

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

export type BookChat = {
  bookId: string;
  messages: ChatMessage[];
  conversationId: string;
};

interface AIChatState {
  chats: Record<string, BookChat>;
  initialized: boolean;
  initBook: (bookId: string) => Promise<void>;
  addMessage: (bookId: string, role: 'user' | 'assistant', content: string) => Promise<void>;
  startNewConversation: (bookId: string) => Promise<void>;
}

const EMPTY_ARRAY: ChatMessage[] = [];

export function getBookChatMessages(state: AIChatState, bookId: string): ChatMessage[] {
  return state.chats[bookId]?.messages ?? EMPTY_ARRAY;
}

const genId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const useAIChatStore = create<AIChatState>((set, get) => ({
  chats: {},
  initialized: false,

  initBook: async (bookId) => {
    if (get().chats[bookId]) return;
    try {
      const data = await apiGet<any>(`/api/books/${bookId}/ai-chat`);
      const messages: ChatMessage[] = Array.isArray(data.messages)
        ? data.messages.map((m: any) => ({
            id: m.id || genId(),
            role: m.role,
            content: m.content,
            timestamp: m.timestamp || Date.now(),
          }))
        : [];
      set((s) => ({
        chats: {
          ...s.chats,
          [bookId]: {
            bookId,
            messages,
            conversationId: data.conversationId || '1',
          },
        },
      }));
    } catch (err) {
      console.error('Failed to load AI chat:', err);
    }
  },

  addMessage: async (bookId, role, content) => {
    // Optimistically add user message locally
    const userMsg: ChatMessage = { id: genId(), role, content, timestamp: Date.now() };
    set((s) => {
      const existing = s.chats[bookId] ?? { bookId, messages: [], conversationId: '1' };
      return {
        chats: {
          ...s.chats,
          [bookId]: {
            ...existing,
            messages: [...existing.messages, userMsg],
          },
        },
      };
    });

    if (role === 'user') {
      try {
        const data = await apiPost<any>(`/api/books/${bookId}/ai-chat/message`, {
          content,
          currentPage: 1,
        });
        const messages: ChatMessage[] = Array.isArray(data.messages)
          ? data.messages.map((m: any) => ({
              id: m.id || genId(),
              role: m.role,
              content: m.content,
              timestamp: m.timestamp || Date.now(),
            }))
          : [];
        set((s) => ({
          chats: {
            ...s.chats,
            [bookId]: {
              bookId,
              messages,
              conversationId: data.conversationId || s.chats[bookId]?.conversationId || '1',
            },
          },
        }));
      } catch (err) {
        console.error('AI chat error:', err);
        // Add error message
        const errorMsg: ChatMessage = {
          id: genId(),
          role: 'assistant',
          content: `抱歉，AI 服务暂时不可用：${err instanceof Error ? err.message : '未知错误'}`,
          timestamp: Date.now(),
        };
        set((s) => {
          const existing = s.chats[bookId] ?? { bookId, messages: [], conversationId: '1' };
          return {
            chats: {
              ...s.chats,
              [bookId]: {
                ...existing,
                messages: [...existing.messages, errorMsg],
              },
            },
          };
        });
      }
    }
  },

  startNewConversation: async (bookId) => {
    try {
      await apiPost(`/api/books/${bookId}/ai-chat/new`, {});
      set((s) => ({
        chats: {
          ...s.chats,
          [bookId]: {
            bookId,
            messages: [],
            conversationId: String(Number(s.chats[bookId]?.conversationId || '0') + 1),
          },
        },
      }));
    } catch (err) {
      console.error('Failed to start new conversation:', err);
    }
  },
}));
