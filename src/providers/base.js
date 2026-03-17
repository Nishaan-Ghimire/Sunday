// Sunday — Base AI Provider Interface

export class BaseProvider {
  constructor(name) {
    this.name = name;
    this.available = false;
  }

  /**
   * Check if the provider is configured and ready
   */
  isAvailable() {
    return this.available;
  }

  /**
   * Send a chat request
   * @param {Array} messages - [{role: 'user'|'assistant'|'system', content: '...'}]
   * @param {Object} options - {model, temperature, maxTokens}
   * @returns {Promise<string>} Response text
   */
  async chat(messages, options = {}) {
    throw new Error(`${this.name}: chat() not implemented`);
  }

  /**
   * Get provider info for status display
   */
  getInfo() {
    return {
      name: this.name,
      available: this.available,
      model: this.model || 'unknown',
    };
  }
}

export default BaseProvider;
