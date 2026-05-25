import { settingsRepo } from '../repositories/settingsRepo.js';
import type { ChatMessage } from '../types/index.js';

export const aiProxyService = {
  async sendMessage(bookTitle: string, currentPage: number, userMessage: string, history: ChatMessage[]): Promise<string> {
    const provider = settingsRepo.getActiveProvider();
    if (!provider) {
      throw new Error('No active AI provider configured');
    }

    const systemPrompt = `你是一位专业的阅读助手。用户正在阅读《${bookTitle}》这本书，当前在第 ${currentPage} 页。请基于书籍内容帮助用户理解、分析和讨论。保持回答简洁、有洞察力。`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: provider.temperature,
        max_tokens: provider.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content || '抱歉，我没有收到回复。';
  },
};
