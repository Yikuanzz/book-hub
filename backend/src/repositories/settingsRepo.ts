import { db } from '../db/connection.js';
import type { AIProvider } from '../types/index.js';

export const settingsRepo = {
  getAll(): Record<string, string> {
    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  },

  set(key: string, value: string): void {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  },

  setMany(entries: Record<string, string>): void {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(entries)) {
      stmt.run(key, value);
    }
  },

  findAllProviders(): AIProvider[] {
    const rows = db.prepare('SELECT * FROM ai_providers').all() as Array<Record<string, unknown>>;
    return rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      baseUrl: row.base_url as string,
      apiKey: row.api_key as string,
      model: row.model as string,
      temperature: row.temperature as number,
      maxTokens: row.max_tokens as number,
      isActive: Boolean(row.is_active),
    }));
  },

  getActiveProvider(): AIProvider | undefined {
    const row = db.prepare('SELECT * FROM ai_providers WHERE is_active = 1 LIMIT 1').get() as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return {
      id: row.id as string,
      name: row.name as string,
      baseUrl: row.base_url as string,
      apiKey: row.api_key as string,
      model: row.model as string,
      temperature: row.temperature as number,
      maxTokens: row.max_tokens as number,
      isActive: true,
    };
  },

  createProvider(provider: Omit<AIProvider, 'id'> & { id?: string }): AIProvider {
    const id = provider.id || `ai-${Date.now()}`;
    db.prepare(`
      INSERT INTO ai_providers (id, name, base_url, api_key, model, temperature, max_tokens, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, provider.name, provider.baseUrl, provider.apiKey, provider.model, provider.temperature, provider.maxTokens, provider.isActive ? 1 : 0);
    return { ...provider, id };
  },

  updateProvider(id: string, data: Partial<Omit<AIProvider, 'id'>>): void {
    const sets: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
    if (data.baseUrl !== undefined) { sets.push('base_url = ?'); values.push(data.baseUrl); }
    if (data.apiKey !== undefined) { sets.push('api_key = ?'); values.push(data.apiKey); }
    if (data.model !== undefined) { sets.push('model = ?'); values.push(data.model); }
    if (data.temperature !== undefined) { sets.push('temperature = ?'); values.push(data.temperature); }
    if (data.maxTokens !== undefined) { sets.push('max_tokens = ?'); values.push(data.maxTokens); }
    if (data.isActive !== undefined) { sets.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }
    if (sets.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE ai_providers SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  },

  deleteProvider(id: string): void {
    db.prepare('DELETE FROM ai_providers WHERE id = ?').run(id);
  },

  activateProvider(id: string): void {
    db.prepare('UPDATE ai_providers SET is_active = 0').run();
    db.prepare('UPDATE ai_providers SET is_active = 1 WHERE id = ?').run(id);
  },

  seedProviders(): void {
    const count = db.prepare('SELECT COUNT(*) as c FROM ai_providers').get() as { c: number };
    if (count.c > 0) return;
    const providers = [
      { id: 'openai-1', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 2048, isActive: true },
      { id: 'ollama-1', name: 'Ollama 本地', baseUrl: 'http://localhost:11434/v1', apiKey: 'ollama', model: 'llama3.1:8b', temperature: 0.7, maxTokens: 4096, isActive: false },
    ];
    for (const p of providers) {
      db.prepare(`INSERT INTO ai_providers (id, name, base_url, api_key, model, temperature, max_tokens, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(p.id, p.name, p.baseUrl, p.apiKey, p.model, p.temperature, p.maxTokens, p.isActive ? 1 : 0);
    }
  },
};
