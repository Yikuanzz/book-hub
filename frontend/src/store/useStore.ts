import { create } from 'zustand';
import type { Book, Bookmark, Highlight, Category } from '../data/mockData';

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

async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'API error');
  return json.data as T;
}

async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'API error');
}

// Data transformers
function fmtDate(ts: number | null | undefined): string {
  if (!ts) return '';
  return new Date(ts * 1000).toISOString().split('T')[0];
}

function apiBookToFrontend(b: any): Book {
  return {
    id: String(b.id),
    title: b.title,
    author: b.author,
    cover: b.cover || '',
    description: b.description || '',
    category: b.categoryName || '',
    tags: Array.isArray(b.tags) ? b.tags : [],
    totalPages: b.totalPages || 0,
    currentPage: b.currentPage || 0,
    format: (b.format as Book['format']) || 'epub',
    uploadedAt: fmtDate(b.uploadedAt),
    lastReadAt: b.lastReadAt ? fmtDate(b.lastReadAt) : undefined,
    totalReadingTime: b.totalReadingTime || 0,
  };
}

function apiBookmarkToFrontend(bm: any): Bookmark {
  return {
    id: String(bm.id),
    bookId: String(bm.bookId),
    page: bm.page,
    createdAt: fmtDate(bm.createdAt),
    note: bm.note || undefined,
  };
}

function apiHighlightToFrontend(hl: any): Highlight {
  return {
    id: String(hl.id),
    bookId: String(hl.bookId),
    text: hl.text,
    page: hl.page,
    color: hl.color,
    note: hl.note || undefined,
    createdAt: fmtDate(hl.createdAt),
  };
}

function apiCategoryToFrontend(cat: any): Category {
  return {
    id: String(cat.id),
    name: cat.name,
    color: cat.color,
    bookCount: cat.bookCount || 0,
  };
}

interface AppState {
  // Auth
  isAuthenticated: boolean;
  rememberPassword: boolean;
  login: (password: string, remember: boolean) => boolean;
  logout: () => void;

  // Theme
  isDarkMode: boolean;
  toggleTheme: () => void;

  // Books
  books: Book[];
  addBook: (book: Partial<Omit<Book, 'id' | 'uploadedAt'>> & Pick<Book, 'title' | 'author'>) => void;
  updateReadingProgress: (bookId: string, page: number, readingTime?: number) => void;
  getBookById: (bookId: string) => Book | undefined;
  getRecentBooks: () => Book[];

  // Bookmarks
  bookmarks: Bookmark[];
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (id: string) => void;
  getBookmarksByBookId: (bookId: string) => Bookmark[];

  // Highlights
  highlights: Highlight[];
  addHighlight: (highlight: Omit<Highlight, 'id' | 'createdAt'>) => void;
  removeHighlight: (id: string) => void;
  getHighlightsByBookId: (bookId: string) => Highlight[];

  // Categories
  categories: Category[];

  // Reading stats
  totalReadingTime: number;
  booksRead: number;
  currentStreak: number;

  // Init
  initialized: boolean;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  // Auth
  isAuthenticated: false,
  rememberPassword: false,
  login: (password: string, remember: boolean) => {
    if (password === '123456') {
      set({ isAuthenticated: true, rememberPassword: remember });
      return true;
    }
    return false;
  },
  logout: () => set({ isAuthenticated: false, rememberPassword: false }),

  // Theme
  isDarkMode: false,
  toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

  // Books
  books: [],
  addBook: async (bookData) => {
    // Resolve category name to category id
    let categoryId: number | null = null;
    if (bookData.category) {
      try {
        const cats = await apiGet<any[]>('/api/categories');
        const cat = cats.find((c) => c.name === bookData.category);
        if (cat) categoryId = Number(cat.id);
      } catch {
        // ignore category resolution failure
      }
    }

    const payload: Record<string, unknown> = {
      title: bookData.title,
      author: bookData.author,
      cover: bookData.cover || null,
      description: bookData.description || null,
      tags: bookData.tags || [],
      totalPages: bookData.totalPages || null,
      format: bookData.format || null,
      categoryId,
    };
    const created = await apiPost<any>('/api/books', payload);
    const book = apiBookToFrontend(created);
    set((state) => ({ books: [book, ...state.books] }));
  },
  updateReadingProgress: async (bookId: string, page: number, readingTime: number = 0) => {
    const id = Number(bookId);
    const progress = Math.round((page / (get().books.find((b) => b.id === bookId)?.totalPages || 1)) * 100);
    await apiPut(`/api/books/${id}/progress`, { currentPage: page, progress, readingTime });
    set((state) => ({
      books: state.books.map((book) =>
        book.id === bookId
          ? {
              ...book,
              currentPage: page,
              lastReadAt: new Date().toISOString().split('T')[0],
              totalReadingTime: book.totalReadingTime + readingTime,
            }
          : book
      ),
      totalReadingTime: state.totalReadingTime + readingTime,
    }));
  },
  getBookById: (bookId: string) => {
    return get().books.find((book) => book.id === bookId);
  },
  getRecentBooks: () => {
    return get().books
      .filter((book) => book.lastReadAt)
      .sort((a, b) => new Date(b.lastReadAt!).getTime() - new Date(a.lastReadAt!).getTime());
  },

  // Bookmarks
  bookmarks: [],
  addBookmark: async (bookmarkData) => {
    const created = await apiPost<any>(`/api/books/${bookmarkData.bookId}/bookmarks`, {
      page: bookmarkData.page,
      note: bookmarkData.note || null,
    });
    const bm = apiBookmarkToFrontend(created);
    set((state) => ({ bookmarks: [bm, ...state.bookmarks] }));
  },
  removeBookmark: async (id: string) => {
    await apiDelete(`/api/bookmarks/${id}`);
    set((state) => ({
      bookmarks: state.bookmarks.filter((bm) => bm.id !== id),
    }));
  },
  getBookmarksByBookId: (bookId: string) => {
    return get().bookmarks.filter((bm) => bm.bookId === bookId);
  },

  // Highlights
  highlights: [],
  addHighlight: async (highlightData) => {
    const created = await apiPost<any>('/api/highlights', {
      bookId: Number(highlightData.bookId),
      page: highlightData.page,
      text: highlightData.text,
      color: highlightData.color,
      note: highlightData.note || null,
      tags: [],
    });
    const hl = apiHighlightToFrontend(created);
    set((state) => ({ highlights: [hl, ...state.highlights] }));
  },
  removeHighlight: async (id: string) => {
    await apiDelete(`/api/highlights/${id}`);
    set((state) => ({
      highlights: state.highlights.filter((hl) => hl.id !== id),
    }));
  },
  getHighlightsByBookId: (bookId: string) => {
    return get().highlights.filter((hl) => hl.bookId === bookId);
  },

  // Categories
  categories: [],

  // Stats
  totalReadingTime: 0,
  booksRead: 0,
  currentStreak: 0,

  // Init
  initialized: false,
  init: async () => {
    if (get().initialized) return;
    await get().refresh();
  },
  refresh: async () => {
    try {
      const [backendBooks, _backendBookmarks, backendHighlights, backendCategories, stats] = await Promise.all([
        apiGet<any[]>('/api/books'),
        apiGet<any[]>('/api/highlights'),
        apiGet<any[]>('/api/highlights'),
        apiGet<any[]>('/api/categories'),
        apiGet<any>('/api/stats/dashboard'),
      ]);

      // Note: bookmarks API is per-book; we'll derive from highlights for now
      // Actually, let's fetch bookmarks for each book that has them
      const booksWithBookmarks: Bookmark[] = [];
      for (const book of backendBooks) {
        try {
          const bms = await apiGet<any[]>(`/api/books/${book.id}/bookmarks`);
          booksWithBookmarks.push(...bms.map(apiBookmarkToFrontend));
        } catch {
          // ignore
        }
      }

      set({
        books: backendBooks.map(apiBookToFrontend),
        bookmarks: booksWithBookmarks,
        highlights: backendHighlights.map(apiHighlightToFrontend),
        categories: backendCategories.map(apiCategoryToFrontend),
        totalReadingTime: stats.totalReadingTime || 0,
        booksRead: stats.booksRead || 0,
        currentStreak: stats.currentStreak || 0,
        initialized: true,
      });
    } catch (err) {
      console.error('Failed to refresh store from backend:', err);
      set({ initialized: true });
    }
  },
}));

// Selectors
export const selectRecentBooks = (state: AppState) => {
  return state.books
    .filter((book) => book.lastReadAt)
    .sort((a, b) => new Date(b.lastReadAt!).getTime() - new Date(a.lastReadAt!).getTime())
    .slice(0, 5);
};

export const selectBookById = (bookId: string) => (state: AppState) => {
  return state.books.find((book) => book.id === bookId);
};

export const selectBookmarksByBookId = (bookId: string) => (state: AppState) => {
  return state.bookmarks.filter((bm) => bm.bookId === bookId);
};

export const selectHighlightsByBookId = (bookId: string) => (state: AppState) => {
  return state.highlights.filter((hl) => hl.bookId === bookId);
};

export const selectBooksByCategory = (category: string) => (state: AppState) => {
  return state.books.filter((book) => book.category === category);
};
