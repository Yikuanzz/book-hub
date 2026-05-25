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
