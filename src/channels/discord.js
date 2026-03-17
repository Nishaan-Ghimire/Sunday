// Sunday — Discord Channel

import { BaseChannel } from './base.js';
import { logger } from '../core/logger.js';

const log = logger.child('discord');

export class DiscordChannel extends BaseChannel {
  constructor() {
    super('discord');
    this.client = null;
  }

  async start() {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      log.warn('Discord bot token not set — skipping');
      return;
    }

    try {
      const { Client, GatewayIntentBits, Partials } = await import('discord.js');

      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.DirectMessages,
        ],
        partials: [Partials.Channel],
      });

      this.client.once('ready', () => {
        log.channel(`Discord connected as ${this.client.user.tag}`);
        this.running = true;
      });

      this.client.on('messageCreate', async (message) => {
        // Ignore bot's own messages
        if (message.author.bot) return;

        // Only respond to DMs or when mentioned
        const isDM = !message.guild;
        const isMentioned = message.mentions.has(this.client.user);

        if (!isDM && !isMentioned) return;

        // Strip mention from content
        let content = message.content;
        if (isMentioned) {
          content = content.replace(/<@!?\d+>/g, '').trim();
        }

        if (!content) return;

        // Use channel+user as conversation ID
        const conversationId = `discord-${message.channel.id}`;

        try {
          await message.channel.sendTyping();

          const result = await this.agent.processMessage({
            content,
            conversationId,
            channel: 'discord',
            userId: message.author.id,
          });

          // Discord has a 2000 char limit
          const response = result.response;
          if (response.length <= 2000) {
            await message.reply(response);
          } else {
            // Split into chunks
            const chunks = response.match(/.{1,1990}/gs) || [];
            for (const chunk of chunks) {
              await message.channel.send(chunk);
            }
          }
        } catch (err) {
          log.error(`Discord message error: ${err.message}`);
          await message.reply('⚠️ Something went wrong. Please try again.');
        }
      });

      await this.client.login(token);
    } catch (err) {
      log.error(`Discord startup failed: ${err.message}`);
    }
  }

  async stop() {
    if (this.client) {
      this.client.destroy();
      this.running = false;
      log.channel('Discord disconnected');
    }
    super.stop();
  }
}

export default DiscordChannel;
