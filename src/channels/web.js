// Sunday — WebSocket Channel for Web UI

import { BaseChannel } from './base.js';
import { logger } from '../core/logger.js';

const log = logger.child('web');

export class WebChannel extends BaseChannel {
  constructor() {
    super('web');
    this.clients = new Map(); // ws -> { conversationId }
  }

  /**
   * Initialize with an existing WebSocket server instance
   * (Created in server.js alongside the HTTP server)
   */
  init(wss) {
    this.wss = wss;

    wss.on('connection', (ws) => {
      log.channel('Web client connected');
      this.clients.set(ws, { conversationId: null });

      ws.on('message', async (data) => {
        try {
          const msg = JSON.parse(data.toString());
          await this._handleMessage(ws, msg);
        } catch (err) {
          log.error(`WebSocket message error: ${err.message}`);
          ws.send(JSON.stringify({ type: 'error', message: err.message }));
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        log.channel('Web client disconnected');
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'system',
        message: '☀️ Connected to Sunday! Type /help for commands.',
      }));
    });

    this.running = true;
    log.channel('WebSocket channel ready');
  }

  async _handleMessage(ws, msg) {
    switch (msg.type) {
      case 'chat': {
        const conversationId = msg.conversationId || this.clients.get(ws)?.conversationId;

        // Send typing indicator
        ws.send(JSON.stringify({ type: 'typing', active: true }));

        const result = await this.agent.processMessage({
          content: msg.content,
          conversationId,
          channel: 'web',
          userId: 'web-user',
        });

        // Update stored conversation ID
        this.clients.set(ws, { conversationId: result.conversationId });

        // Send response
        ws.send(JSON.stringify({
          type: 'response',
          content: result.response,
          conversationId: result.conversationId,
          provider: result.provider,
        }));

        // Clear typing indicator
        ws.send(JSON.stringify({ type: 'typing', active: false }));
        break;
      }

      case 'set_conversation': {
        this.clients.set(ws, { conversationId: msg.conversationId });
        ws.send(JSON.stringify({
          type: 'conversation_set',
          conversationId: msg.conversationId,
        }));
        break;
      }

      default:
        ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }));
    }
  }

  /**
   * Broadcast to all connected web clients
   */
  broadcast(data) {
    const message = JSON.stringify(data);
    for (const [ws] of this.clients) {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(message);
      }
    }
  }

  async stop() {
    if (this.wss) {
      this.wss.close();
      this.running = false;
    }
    super.stop();
  }
}

export const webChannel = new WebChannel();
export default WebChannel;
