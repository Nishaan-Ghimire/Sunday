// Sunday — Provider Router

import { ClaudeProvider } from './claude.js';
import { GeminiProvider } from './gemini.js';
import { OpenAIProvider } from './openai.js';
import { logger } from '../core/logger.js';
import config from '../../config/default.js';

const log = logger.child('router');

class ProviderRouter {
  constructor() {
    this.providers = {
      claude: new ClaudeProvider(),
      gemini: new GeminiProvider(),
      openai: new OpenAIProvider(),
    };

    this.activeProvider = config.defaultProvider;

    // Verify default provider is available, fallback if needed
    if (!this.providers[this.activeProvider]?.isAvailable()) {
      const fallback = Object.entries(this.providers).find(([, p]) => p.isAvailable());
      if (fallback) {
        this.activeProvider = fallback[0];
        log.warn(`Default provider "${config.defaultProvider}" unavailable, falling back to "${this.activeProvider}"`);
      } else {
        log.warn('No AI providers configured! Add API keys to .env');
      }
    }

    log.info(`Active provider: ${this.activeProvider}`);
  }

  /**
   * Get the currently active provider
   */
  getActive() {
    return this.providers[this.activeProvider];
  }

  /**
   * Switch the active provider
   */
  setActive(name) {
    if (!this.providers[name]) {
      throw new Error(`Unknown provider: ${name}. Available: ${Object.keys(this.providers).join(', ')}`);
    }
    if (!this.providers[name].isAvailable()) {
      throw new Error(`Provider "${name}" is not configured. Add its API key to .env`);
    }
    this.activeProvider = name;
    log.provider(`Switched to ${name}`);
    return this.providers[name];
  }

  /**
   * Chat using the active provider (or a specified one)
   */
  async chat(messages, options = {}) {
    const providerName = options.provider || this.activeProvider;
    const provider = this.providers[providerName];

    if (!provider?.isAvailable()) {
      throw new Error(`Provider "${providerName}" is not available`);
    }

    log.debug(`Routing to ${providerName}`);
    return provider.chat(messages, options);
  }

  /**
   * Get status of all providers
   */
  getStatus() {
    const status = {};
    for (const [name, provider] of Object.entries(this.providers)) {
      status[name] = {
        ...provider.getInfo(),
        active: name === this.activeProvider,
      };
    }
    return status;
  }

  /**
   * Get available provider names
   */
  getAvailableProviders() {
    return Object.entries(this.providers)
      .filter(([, p]) => p.isAvailable())
      .map(([name]) => name);
  }
}

export const router = new ProviderRouter();
export default ProviderRouter;
