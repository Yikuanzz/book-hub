import { create } from 'zustand';

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

export interface ReaderHighlight {
  id: string;
  bookId: string;
  bookTitle: string;
  page: number;
  text: string;
  note?: string;
  tags: string[];
  color: HighlightColor;
  createdAt: number;
  updatedAt: number;
}

interface NotesState {
  highlights: ReaderHighlight[];
  add: (h: Omit<ReaderHighlight, 'id' | 'createdAt' | 'updatedAt'>) => string;
  update: (id: string, patch: Partial<Omit<ReaderHighlight, 'id' | 'createdAt'>>) => void;
  remove: (id: string) => ReaderHighlight | undefined;
  restore: (h: ReaderHighlight) => void;
}

// Mock seed data so NotesPage has content before user creates any
const now = Date.now();
const day = 86_400_000;
const seed: ReaderHighlight[] = [
  {
    id: 'seed-1',
    bookId: '20',
    bookTitle: '莫失莫忘',
    page: 42,
    text: '我们都知道这一切都终将结束，但是又想要假装这一刻是永恒的。',
    note: '石黑一雄惯用的克制叙事，越是平静越是残酷。',
    tags: ['人物', '存在主义'],
    color: 'yellow',
    createdAt: now - 2 * day,
    updatedAt: now - 2 * day,
  },
  {
    id: 'seed-2',
    bookId: '1',
    bookTitle: '百年孤独',
    page: 1,
    text: '多年以后，面对行刑队，奥雷里亚诺·布恩迪亚上校将会回想起父亲带他去见识冰块的那个遥远的下午。',
    note: '经典的三时态开篇，整本书命运感的起点。',
    tags: ['开篇', '叙事技巧'],
    color: 'green',
    createdAt: now - 5 * day,
    updatedAt: now - 5 * day,
  },
  {
    id: 'seed-3',
    bookId: '2',
    bookTitle: '人类简史',
    page: 120,
    text: '金钱是有史以来最普遍也最有效的互信系统。',
    tags: ['货币', '社会'],
    color: 'blue',
    createdAt: now - 9 * day,
    updatedAt: now - 9 * day,
  },
  {
    id: 'seed-4',
    bookId: '5',
    bookTitle: '思考，快与慢',
    page: 88,
    text: '我们对世界的理解，依赖于一个我们以为自己理解的版本。',
    note: '系统一的代价。',
    tags: ['认知偏差'],
    color: 'pink',
    createdAt: now - 12 * day,
    updatedAt: now - 12 * day,
  },
];

export const useNotesStore = create<NotesState>((set, get) => ({
  highlights: seed,
  add: (h) => {
    const id = `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const created: ReaderHighlight = { ...h, id, createdAt: Date.now(), updatedAt: Date.now() };
    set((s) => ({ highlights: [created, ...s.highlights] }));
    return id;
  },
  update: (id, patch) => {
    set((s) => ({
      highlights: s.highlights.map((h) =>
        h.id === id ? { ...h, ...patch, updatedAt: Date.now() } : h
      ),
    }));
  },
  remove: (id) => {
    const target = get().highlights.find((h) => h.id === id);
    set((s) => ({ highlights: s.highlights.filter((h) => h.id !== id) }));
    return target;
  },
  restore: (h) => {
    set((s) => ({ highlights: [h, ...s.highlights] }));
  },
}));
