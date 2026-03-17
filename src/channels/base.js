// Sunday — Base Channel Interface

export class BaseChannel {
  constructor(name) {
    this.name = name;
    this.agent = null;
    this.running = false;
  }

  /**
   * Set the agent reference
   */
  setAgent(agent) {
    this.agent = agent;
  }

  /**
   * Start the channel
   */
  async start() {
    throw new Error(`${this.name}: start() not implemented`);
  }

  /**
   * Stop the channel
   */
  async stop() {
    this.running = false;
  }

  /**
   * Get channel status
   */
  getStatus() {
    return {
      name: this.name,
      running: this.running,
    };
  }
}

export default BaseChannel;
