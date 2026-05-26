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

export type LibraryBook = {
  id: string;
  title: string;
  author: string;
  cover: string;
  category: string;
  progress: number;
  lastReadAt?: number;
  format?: 'pdf' | 'epub' | 'txt';
  file?: string;
  totalPages?: number;
};

function apiBookToFrontend(b: any): LibraryBook {
  return {
    id: String(b.id),
    title: b.title,
    author: b.author,
    cover: b.cover || '',
    category: b.categoryName || '',
    progress: b.progress || 0,
    lastReadAt: b.lastReadAt ? b.lastReadAt * 1000 : undefined,
    format: (b.format as LibraryBook['format']) || undefined,
    file: b.filePath || undefined,
    totalPages: b.totalPages || undefined,
  };
}

interface BooksState {
  books: LibraryBook[];
  initialized: boolean;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  addBook: (book: Omit<LibraryBook, 'id'> & { description?: string; tags?: string[] }) => Promise<void>;
  updateBook: (id: string, patch: Partial<Omit<LibraryBook, 'id'>>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
}

export const useBooksStore = create<BooksState>((set, get) => ({
  books: [],
  initialized: false,

  init: async () => {
    if (get().initialized) return;
    await get().refresh();
  },

  refresh: async () => {
    try {
      const data = await apiGet<any[]>('/api/books');
      set({ books: data.map(apiBookToFrontend), initialized: true });
    } catch (err) {
      console.error('Failed to refresh books:', err);
      set({ initialized: true });
    }
  },

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

    const created = await apiPost<any>('/api/books', {
      title: bookData.title,
      author: bookData.author,
      cover: bookData.cover || null,
      categoryId,
      description: (bookData as any).description || null,
      tags: (bookData as any).tags || [],
      totalPages: bookData.totalPages || null,
      format: bookData.format || null,
      filePath: bookData.file || null,
    });
    set((state) => ({ books: [apiBookToFrontend(created), ...state.books] }));
  },

  updateBook: async (id, patch) => {
    const numId = Number(id);
    const payload: Record<string, unknown> = {};
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.author !== undefined) payload.author = patch.author;
    if (patch.cover !== undefined) payload.cover = patch.cover || null;
    if (patch.progress !== undefined) payload.progress = patch.progress;
    if (patch.totalPages !== undefined) payload.totalPages = patch.totalPages;
    if (patch.format !== undefined) payload.format = patch.format;
    if (patch.file !== undefined) payload.filePath = patch.file;

    await apiPut(`/api/books/${numId}`, payload);
    set((state) => ({
      books: state.books.map((b) =>
        b.id === id ? { ...b, ...patch } : b
      ),
    }));
  },

  deleteBook: async (id) => {
    await apiDelete(`/api/books/${Number(id)}`);
    set((state) => ({
      books: state.books.filter((b) => b.id !== id),
    }));
  },
}));

// Selectors
export const selectRecentBooks = (state: BooksState) => {
  return state.books
    .filter((book) => book.progress > 0 && book.progress < 100 && book.lastReadAt)
    .sort((a, b) => (b.lastReadAt ?? 0) - (a.lastReadAt ?? 0))
    .slice(0, 5);
};

export const selectBookById = (bookId: string) => (state: BooksState) => {
  return state.books.find((book) => book.id === bookId);
};
