import { create } from 'zustand';

export interface AIProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

interface SettingsState {
  aiProviders: AIProvider[];
  activeAIProviderId: string | null;
  addProvider: (p: Omit<AIProvider, 'id'>) => void;
  updateProvider: (id: string, patch: Partial<Omit<AIProvider, 'id'>>) => void;
  removeProvider: (id: string) => void;
  setActiveProvider: (id: string | null) => void;
}

// seed data
const seedProviders: AIProvider[] = [
  {
    id: 'openai-1',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-proj-...',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2048,
  },
  {
    id: 'ollama-1',
    name: 'Ollama 本地',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: 'ollama',
    model: 'llama3.1:8b',
    temperature: 0.7,
    maxTokens: 4096,
  },
];

export const useSettingsStore = create<SettingsState>((set) => ({
  aiProviders: seedProviders,
  activeAIProviderId: seedProviders[0].id,
  addProvider: (p) => {
    const newId = `ai-${Date.now()}`;
    set((s) => ({ aiProviders: [...s.aiProviders, { ...p, id: newId }] }));
  },
  updateProvider: (id, patch) => {
    set((s) => ({ aiProviders: s.aiProviders.map((p) => p.id === id ? { ...p, ...patch } : p) }));
  },
  removeProvider: (id) => {
    set((s) => ({
      aiProviders: s.aiProviders.filter((p) => p.id !== id),
      activeAIProviderId: s.activeAIProviderId === id ? null : s.activeAIProviderId,
    }));
  },
  setActiveProvider: (id) => {
    set(() => ({ activeAIProviderId: id }));
  },
}));
