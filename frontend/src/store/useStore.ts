import { create } from 'zustand';
import type { Book, Bookmark, Highlight } from '../data/mockData';
import { books, bookmarks, highlights, categories } from '../data/mockData';

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
  addBook: (book: Omit<Book, 'id' | 'uploadedAt'>) => void;
  updateReadingProgress: (bookId: string, page: number, readingTime?: number) => void;

  // Bookmarks
  bookmarks: Bookmark[];
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (id: string) => void;

  // Highlights
  highlights: Highlight[];
  addHighlight: (highlight: Omit<Highlight, 'id' | 'createdAt'>) => void;
  removeHighlight: (id: string) => void;

  // Categories
  categories: typeof categories;

  // Reading stats
  totalReadingTime: number;
  booksRead: number;
  currentStreak: number;
}

export const useStore = create<AppState>((set) => ({
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
  books: books,
  addBook: (bookData) => {
    const newBook: Book = {
      ...bookData,
      id: Date.now().toString(),
      uploadedAt: new Date().toISOString().split('T')[0],
    };
    set((state) => ({ books: [newBook, ...state.books] }));
  },
  updateReadingProgress: (bookId: string, page: number, readingTime: number = 0) => {
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

  // Bookmarks
  bookmarks: bookmarks,
  addBookmark: (bookmarkData) => {
    const newBookmark: Bookmark = {
      ...bookmarkData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    set((state) => ({ bookmarks: [newBookmark, ...state.bookmarks] }));
  },
  removeBookmark: (id: string) => {
    set((state) => ({
      bookmarks: state.bookmarks.filter((bm) => bm.id !== id),
    }));
  },

  // Highlights
  highlights: highlights,
  addHighlight: (highlightData) => {
    const newHighlight: Highlight = {
      ...highlightData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    set((state) => ({ highlights: [newHighlight, ...state.highlights] }));
  },
  removeHighlight: (id: string) => {
    set((state) => ({
      highlights: state.highlights.filter((hl) => hl.id !== id),
    }));
  },

  // Categories
  categories: categories,

  // Stats
  totalReadingTime: 1860,
  booksRead: 3,
  currentStreak: 7,
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
