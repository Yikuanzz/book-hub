import { create } from 'zustand';

export type LibraryBook = {
  id: string;
  title: string;
  author: string;
  cover: string;       // URL or empty
  category: string;
  progress: number;    // 0–100
  lastReadAt?: number; // timestamp; undefined = never opened
  format?: 'pdf' | 'epub' | 'txt';
  file?: string;       // public URL to the file
  totalPages?: number;
};

interface BooksState {
  books: LibraryBook[];
  addBook: (book: Omit<LibraryBook, 'id'>) => void;
  updateBook: (id: string, patch: Partial<Omit<LibraryBook, 'id'>>) => void;
  deleteBook: (id: string) => void;
}

// helper: timestamps used to seed lastReadAt (deterministic offsets from "today")
const _h = 3600_000;
const _d = 86_400_000;
const _now = Date.now();

// Seed data moved from App.tsx
const seedBooks: LibraryBook[] = [
  { id: '1', title: '百年孤独',       author: '加西亚·马尔克斯',  cover: 'https://images.unsplash.com/photo-1544947950-fa07a98bebd3?auto=format&fit=crop&q=80&w=300&h=400', category: '文学小说', progress: 45, lastReadAt: _now - 5 * _h },
  { id: '2', title: '人类简史',       author: '尤瓦尔·赫拉利',    cover: 'https://images.unsplash.com/photo-1543002580-c756a8468a36?auto=format&fit=crop&q=80&w=300&h=400', category: '历史',     progress: 80, lastReadAt: _now - 2 * _d },
  { id: '3', title: '深度学习',       author: 'Ian Goodfellow',  cover: 'https://images.unsplash.com/photo-1515879218376-6b0bcbceab6b?auto=format&fit=crop&q=80&w=300&h=400', category: '科技',     progress: 15, lastReadAt: _now - 18 * _d },
  { id: '4', title: '存在与虚无',     author: '让-保罗·萨特',    cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300&h=400', category: '哲学',     progress: 0  },
  { id: '5', title: '思考，快与慢',   author: '丹尼尔·卡尼曼',   cover: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=300&h=400', category: '心理学',   progress: 50, lastReadAt: _now - 4 * _d },
  { id: '6', title: '史蒂夫·乔布斯传', author: '沃尔特·艾萨克森', cover: 'https://images.unsplash.com/photo-1518531926272-a07a646116f5?auto=format&fit=crop&q=80&w=300&h=400', category: '传记',     progress: 0  },
  { id: '7', title: '三体',           author: '刘慈欣',          cover: 'https://images.unsplash.com/photo-1446773436665-8156e4242e42?auto=format&fit=crop&q=80&w=300&h=400', category: '文学小说', progress: 100 },
  { id: '8', title: '设计心理学',     author: '唐纳德·诺曼',     cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300&h=400', category: '科技',     progress: 30, lastReadAt: _now - 65 * _d },
  { id: '9', title: '苏菲的世界',     author: '乔斯坦·贾德',     cover: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&q=80&w=300&h=400', category: '哲学',     progress: 65, lastReadAt: _now - 11 * _d },
  { id: '10', title: '原则',          author: '瑞·达利欧',       cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=300&h=400', category: '心理学',   progress: 100 },
  { id: '11', title: '万历十五年',    author: '黄仁宇',          cover: 'https://images.unsplash.com/photo-1535905557558-afc4877a26fc?auto=format&fit=crop&q=80&w=300&h=400', category: '历史',     progress: 0  },
  { id: '12', title: '影响力',        author: '罗伯特·西奥迪尼',  cover: 'https://images.unsplash.com/photo-1589998059171-988d887df646?auto=format&fit=crop&q=80&w=300&h=400', category: '心理学',   progress: 22, lastReadAt: _now - 95 * _d },
  { id: '13', title: '艺术的故事',    author: '贡布里希',         cover: '', category: '艺术',     progress: 0  },
  { id: '14', title: '经济学原理',    author: '曼昆',             cover: '', category: '经济',     progress: 10, lastReadAt: _now - 1 * _h },
  { id: '15', title: '寂静的春天',    author: '蕾切尔·卡逊',      cover: '', category: '自然科学', progress: 0  },
  { id: '16', title: '杀死一只知更鸟', author: '哈珀·李',         cover: '', category: '文学小说', progress: 0  },
  { id: '17', title: '心流',          author: '米哈里',           cover: '', category: '心理学',   progress: 0  },
  { id: '18', title: '原子习惯',      author: '詹姆斯·克利尔',    cover: '', category: '自我提升', progress: 60, lastReadAt: _now - 6 * _d },
  { id: '19', title: '人间词话',      author: '王国维',           cover: '', category: '诗词鉴赏', progress: 0  },
  { id: '20', title: '莫失莫忘',      author: '石黑一雄',         cover: '', category: '文学小说', progress: 12, lastReadAt: _now - 30 * 60 * 1000, format: 'pdf', file: '/books/never-let-me-go.pdf', totalPages: 304 },
];

export const useBooksStore = create<BooksState>((set) => ({
  books: seedBooks,

  addBook: (bookData) => {
    const newBook: LibraryBook = {
      ...bookData,
      id: Date.now().toString(),
    };
    set((state) => ({ books: [newBook, ...state.books] }));
  },

  updateBook: (id, patch) => {
    set((state) => ({
      books: state.books.map((book) =>
        book.id === id ? { ...book, ...patch } : book
      ),
    }));
  },

  deleteBook: (id) => {
    set((state) => ({
      books: state.books.filter((book) => book.id !== id),
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
