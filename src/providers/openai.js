// Sunday — OpenAI Provider

import { BaseProvider } from './base.js';
import { logger } from '../core/logger.js';
import config from '../../config/default.js';

const log = logger.child('openai');

export class OpenAIProvider extends BaseProvider {
  constructor() {
    super('openai');
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = config.models.openai;
    this.baseUrl = 'https://api.openai.com/v1/chat/completions';
    this.available = !!this.apiKey;

    if (this.available) {
      log.provider(`OpenAI ready (${this.model})`);
    }
  }

  async chat(messages, options = {}) {
    if (!this.available) throw new Error('OpenAI API key not configured');

    const model = options.model || this.model;

    const body = {
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

export default OpenAIProvider;
