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

export interface AIProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

function apiProviderToFrontend(p: any): AIProvider {
  return {
    id: String(p.id),
    name: p.name,
    baseUrl: p.baseUrl || p.base_url || '',
    apiKey: p.apiKey || p.api_key || '',
    model: p.model,
    temperature: p.temperature ?? 0.7,
    maxTokens: p.maxTokens || p.max_tokens || 2048,
  };
}

interface SettingsState {
  aiProviders: AIProvider[];
  activeAIProviderId: string | null;
  initialized: boolean;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  addProvider: (p: Omit<AIProvider, 'id'>) => Promise<void>;
  updateProvider: (id: string, patch: Partial<Omit<AIProvider, 'id'>>) => Promise<void>;
  removeProvider: (id: string) => Promise<void>;
  setActiveProvider: (id: string | null) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  aiProviders: [],
  activeAIProviderId: null,
  initialized: false,

  init: async () => {
    if (get().initialized) return;
    await get().refresh();
  },

  refresh: async () => {
    try {
      const providers = await apiGet<any[]>('/api/settings/ai-providers');
      const active = providers.find((p) => p.isActive || p.is_active);
      set({
        aiProviders: providers.map(apiProviderToFrontend),
        activeAIProviderId: active ? String(active.id) : null,
        initialized: true,
      });
    } catch (err) {
      console.error('Failed to refresh settings:', err);
      set({ initialized: true });
    }
  },

  addProvider: async (p) => {
    const created = await apiPost<any>('/api/settings/ai-providers', {
      name: p.name,
      baseUrl: p.baseUrl,
      apiKey: p.apiKey,
      model: p.model,
      temperature: p.temperature,
      maxTokens: p.maxTokens,
    });
    set((s) => ({
      aiProviders: [...s.aiProviders, apiProviderToFrontend(created)],
    }));
  },

  updateProvider: async (id, patch) => {
    const payload: Record<string, unknown> = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.baseUrl !== undefined) payload.baseUrl = patch.baseUrl;
    if (patch.apiKey !== undefined) payload.apiKey = patch.apiKey;
    if (patch.model !== undefined) payload.model = patch.model;
    if (patch.temperature !== undefined) payload.temperature = patch.temperature;
    if (patch.maxTokens !== undefined) payload.maxTokens = patch.maxTokens;

    await apiPut(`/api/settings/ai-providers/${id}`, payload);
    set((s) => ({
      aiProviders: s.aiProviders.map((p) =>
        p.id === id ? { ...p, ...patch } : p
      ),
    }));
  },

  removeProvider: async (id) => {
    await apiDelete(`/api/settings/ai-providers/${id}`);
    set((s) => ({
      aiProviders: s.aiProviders.filter((p) => p.id !== id),
      activeAIProviderId: s.activeAIProviderId === id ? null : s.activeAIProviderId,
    }));
  },

  setActiveProvider: async (id) => {
    if (id) {
      await apiPut(`/api/settings/ai-providers/${id}/activate`, {});
    }
    set(() => ({ activeAIProviderId: id }));
  },
}));
