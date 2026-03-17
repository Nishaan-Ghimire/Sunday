// Sunday — Telegram Channel

import { BaseChannel } from './base.js';
import { logger } from '../core/logger.js';

const log = logger.child('telegram');

export class TelegramChannel extends BaseChannel {
  constructor() {
    super('telegram');
    this.bot = null;
  }

  async start() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      log.warn('Telegram bot token not set — skipping');
      return;
    }

    try {
      const TelegramBot = (await import('node-telegram-bot-api')).default;

      this.bot = new TelegramBot(token, { polling: true });

      this.bot.on('polling_error', (err) => {
        log.error(`Telegram polling error: ${err.message}`);
      });

      // Handle /start command
      this.bot.onText(/\/start/, async (msg) => {
        await this.bot.sendMessage(
          msg.chat.id,
          '☀️ *Hey! I\'m Sunday, your personal AI assistant.*\n\nJust send me a message and I\'ll help you out!\n\nType /help for available commands.',
          { parse_mode: 'Markdown' }
        );
      });

      // Handle all messages
      this.bot.on('message', async (msg) => {
        if (!msg.text || msg.text.startsWith('/start')) return;

        const chatId = msg.chat.id;
        const conversationId = `telegram-${chatId}`;

        try {
          // Send typing indicator
          await this.bot.sendChatAction(chatId, 'typing');

          const result = await this.agent.processMessage({
            content: msg.text,
            conversationId,
            channel: 'telegram',
            userId: msg.from.id.toString(),
          });

          // Telegram has a 4096 char limit
          const response = result.response;
          if (response.length <= 4096) {
            await this.bot.sendMessage(chatId, response, {
              parse_mode: 'Markdown',
            }).catch(() => {
              // Fallback without markdown if parsing fails
              this.bot.sendMessage(chatId, response);
            });
          } else {
            const chunks = response.match(/.{1,4090}/gs) || [];
            for (const chunk of chunks) {
              await this.bot.sendMessage(chatId, chunk).catch(() => {});
            }
          }
        } catch (err) {
          log.error(`Telegram message error: ${err.message}`);
          await this.bot.sendMessage(chatId, '⚠️ Something went wrong. Please try again.');
        }
      });

      this.running = true;
      log.channel('Telegram bot connected');
    } catch (err) {
      log.error(`Telegram startup failed: ${err.message}`);
    }
  }

  async stop() {
    if (this.bot) {
      this.bot.stopPolling();
      this.running = false;
      log.channel('Telegram bot disconnected');
    }
    super.stop();
  }
}

export default TelegramChannel;
