import { create } from 'zustand';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

export type BookChat = {
  bookId: string;
  messages: ChatMessage[];
  conversationId: string; // increments on "new chat"
};

interface AIChatState {
  chats: Record<string, BookChat>; // key: bookId
  addMessage: (bookId: string, role: 'user' | 'assistant', content: string) => void;
  startNewConversation: (bookId: string) => void;
}

// Empty array singleton to avoid infinite re-renders
const EMPTY_ARRAY: ChatMessage[] = [];

// Helper for getting messages - use outside of store selectors
export function getBookChatMessages(state: AIChatState, bookId: string): ChatMessage[] {
  return state.chats[bookId]?.messages ?? EMPTY_ARRAY;
}

const genId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const useAIChatStore = create<AIChatState>((set) => ({
  chats: {},

  addMessage: (bookId, role, content) => {
    set((s) => {
      const existing = s.chats[bookId] ?? { bookId, messages: [], conversationId: '1' };
      return {
        chats: {
          ...s.chats,
          [bookId]: {
            ...existing,
            messages: [...existing.messages, { id: genId(), role, content, timestamp: Date.now() }],
          },
        },
      };
    });
  },

  startNewConversation: (bookId) => {
    set((s) => {
      const existing = s.chats[bookId] ?? { bookId, messages: [], conversationId: '1' };
      const nextConvId = String(Number(existing.conversationId) + 1);
      return {
        chats: {
          ...s.chats,
          [bookId]: {
            bookId,
            messages: [],
            conversationId: nextConvId,
          },
        },
      };
    });
  },
}));
