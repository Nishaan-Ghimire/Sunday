// Sunday — Anthropic Claude Provider

import { BaseProvider } from './base.js';
import { logger } from '../core/logger.js';
import config from '../../config/default.js';

const log = logger.child('claude');

export class ClaudeProvider extends BaseProvider {
  constructor() {
    super('claude');
    this.apiKey = process.env.CLAUDE_API_KEY;
    this.model = config.models.claude;
    this.baseUrl = 'https://api.anthropic.com/v1/messages';
    this.available = !!this.apiKey;

    if (this.available) {
      log.provider(`Claude ready (${this.model})`);
    }
  }

  async chat(messages, options = {}) {
    if (!this.available) throw new Error('Claude API key not configured');

    const model = options.model || this.model;
    const maxTokens = options.maxTokens || 4096;

    // Separate system message from conversation
    let system = '';
    const conversationMessages = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        system += (system ? '\n' : '') + msg.content;
      } else {
        conversationMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
    }

    // Ensure messages alternate between user/assistant
    const cleaned = [];
    for (const msg of conversationMessages) {
      if (cleaned.length === 0 || cleaned[cleaned.length - 1].role !== msg.role) {
        cleaned.push(msg);
      } else {
        // Merge consecutive same-role messages
        cleaned[cleaned.length - 1].content += '\n' + msg.content;
      }
    }

    const body = {
      model,
      max_tokens: maxTokens,
      messages: cleaned,
    };

    if (system) {
      body.system = system;
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  }
}

export default ClaudeProvider;
