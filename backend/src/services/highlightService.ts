import { highlightRepo } from '../repositories/highlightRepo.js';
import type { Highlight } from '../types/index.js';

export const highlightService = {
  list(bookId?: number, tag?: string, search?: string) {
    return highlightRepo.findAll(bookId, tag, search);
  },

  create(data: Omit<Highlight, 'id' | 'createdAt' | 'updatedAt'>) {
    return highlightRepo.create(data);
  },

  update(id: number, data: Partial<Omit<Highlight, 'id' | 'createdAt'>>) {
    highlightRepo.update(id, data);
    return highlightRepo.findById(id);
  },

  delete(id: number) {
    highlightRepo.delete(id);
  },
};
