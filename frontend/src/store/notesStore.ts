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

function apiHighlightToFrontend(hl: any, bookTitle?: string): ReaderHighlight {
  return {
    id: String(hl.id),
    bookId: String(hl.bookId),
    bookTitle: bookTitle || '',
    page: hl.page,
    text: hl.text,
    color: (hl.color === '#FEF08A' ? 'yellow' : hl.color === '#BBF7D0' ? 'green' : hl.color === '#BFDBFE' ? 'blue' : hl.color === '#FECACA' ? 'pink' : 'yellow') as HighlightColor,
    note: hl.note || undefined,
    tags: Array.isArray(hl.tags) ? hl.tags : [],
    createdAt: hl.createdAt ? hl.createdAt * 1000 : Date.now(),
    updatedAt: hl.updatedAt ? hl.updatedAt * 1000 : Date.now(),
  };
}

function colorToHex(color: HighlightColor): string {
  const map: Record<HighlightColor, string> = {
    yellow: '#FEF08A',
    green: '#BBF7D0',
    blue: '#BFDBFE',
    pink: '#FECACA',
  };
  return map[color] || '#FEF08A';
}

interface NotesState {
  highlights: ReaderHighlight[];
  initialized: boolean;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  add: (h: Omit<ReaderHighlight, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  update: (id: string, patch: Partial<Omit<ReaderHighlight, 'id' | 'createdAt'>>) => Promise<void>;
  remove: (id: string) => Promise<ReaderHighlight | undefined>;
  restore: (h: ReaderHighlight) => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  highlights: [],
  initialized: false,

  init: async () => {
    if (get().initialized) return;
    await get().refresh();
  },

  refresh: async () => {
    try {
      const data = await apiGet<any[]>('/api/highlights');
      set({ highlights: data.map((h) => apiHighlightToFrontend(h)), initialized: true });
    } catch (err) {
      console.error('Failed to refresh highlights:', err);
      set({ initialized: true });
    }
  },

  add: async (h) => {
    const created = await apiPost<any>('/api/highlights', {
      bookId: Number(h.bookId),
      page: h.page,
      text: h.text,
      color: colorToHex(h.color),
      note: h.note || null,
      tags: h.tags || [],
    });
    const hl = apiHighlightToFrontend(created, h.bookTitle);
    set((s) => ({ highlights: [hl, ...s.highlights] }));
    return hl.id;
  },

  update: async (id, patch) => {
    const payload: Record<string, unknown> = {};
    if (patch.page !== undefined) payload.page = patch.page;
    if (patch.text !== undefined) payload.text = patch.text;
    if (patch.color !== undefined) payload.color = colorToHex(patch.color);
    if (patch.note !== undefined) payload.note = patch.note;
    if (patch.tags !== undefined) payload.tags = patch.tags;

    await apiPut(`/api/highlights/${Number(id)}`, payload);
    set((s) => ({
      highlights: s.highlights.map((h) =>
        h.id === id ? { ...h, ...patch, updatedAt: Date.now() } : h
      ),
    }));
  },

  remove: async (id) => {
    const target = get().highlights.find((h) => h.id === id);
    await apiDelete(`/api/highlights/${Number(id)}`);
    set((s) => ({ highlights: s.highlights.filter((h) => h.id !== id) }));
    return target;
  },

  restore: (h) => {
    set((s) => ({ highlights: [h, ...s.highlights] }));
  },
}));
