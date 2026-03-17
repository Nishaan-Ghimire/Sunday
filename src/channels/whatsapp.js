// Sunday — WhatsApp Channel (via whatsapp-web.js)

import { BaseChannel } from './base.js';
import { logger } from '../core/logger.js';

const log = logger.child('whatsapp');

export class WhatsAppChannel extends BaseChannel {
  constructor() {
    super('whatsapp');
    this.client = null;
  }

  async start() {
    try {
      const { Client, LocalAuth } = await import('whatsapp-web.js');
      const qrcode = await import('qrcode-terminal');

      this.client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      });

      this.client.on('qr', (qr) => {
        log.channel('WhatsApp QR code — scan with your phone:');
        qrcode.default.generate(qr, { small: true });
      });

      this.client.on('ready', () => {
        log.channel('WhatsApp connected!');
        this.running = true;
      });

      this.client.on('auth_failure', (msg) => {
        log.error(`WhatsApp auth failed: ${msg}`);
      });

      this.client.on('disconnected', (reason) => {
        log.warn(`WhatsApp disconnected: ${reason}`);
        this.running = false;
      });

      this.client.on('message', async (msg) => {
        // Only handle private messages, not group messages
        if (msg.isGroupMsg) return;

        const content = msg.body;
        if (!content) return;

        const conversationId = `whatsapp-${msg.from}`;

        try {
          const result = await this.agent.processMessage({
            content,
            conversationId,
            channel: 'whatsapp',
            userId: msg.from,
          });

          await msg.reply(result.response);
        } catch (err) {
          log.error(`WhatsApp message error: ${err.message}`);
          await msg.reply('⚠️ Something went wrong. Please try again.');
        }
      });

      await this.client.initialize();
    } catch (err) {
      log.error(`WhatsApp startup failed: ${err.message}`);
    }
  }

  async stop() {
    if (this.client) {
      await this.client.destroy();
      this.running = false;
      log.channel('WhatsApp disconnected');
    }
    super.stop();
  }
}

export default WhatsAppChannel;
