// Sunday — Google Gemini Provider

import { BaseProvider } from './base.js';
import { logger } from '../core/logger.js';
import config from '../../config/default.js';

const log = logger.child('gemini');

export class GeminiProvider extends BaseProvider {
  constructor() {
    super('gemini');
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = config.models.gemini;
    this.available = !!this.apiKey;

    if (this.available) {
      log.provider(`Gemini ready (${this.model})`);
    }
  }

  async chat(messages, options = {}) {
    if (!this.available) throw new Error('Gemini API key not configured');

    const model = options.model || this.model;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    // Convert messages to Gemini format
    let systemInstruction = '';
    const contents = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction += (systemInstruction ? '\n' : '') + msg.content;
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    // Ensure first message is from user
    if (contents.length > 0 && contents[0].role === 'model') {
      contents.unshift({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    // Merge consecutive same-role messages
    const cleaned = [];
    for (const c of contents) {
      if (cleaned.length === 0 || cleaned[cleaned.length - 1].role !== c.role) {
        cleaned.push(c);
      } else {
        cleaned[cleaned.length - 1].parts.push(...c.parts);
      }
    }

    const body = {
      contents: cleaned,
      generationConfig: {
        maxOutputTokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}

export default GeminiProvider;
