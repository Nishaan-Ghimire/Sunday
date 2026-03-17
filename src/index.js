// Sunday — Entry Point

import 'dotenv/config';
import { agent } from './core/agent.js';
import { logger } from './core/logger.js';
import { createWebServer } from './web/server.js';
import { DiscordChannel } from './channels/discord.js';
import { TelegramChannel } from './channels/telegram.js';
import { WhatsAppChannel } from './channels/whatsapp.js';
import config from '../config/default.js';

const log = logger;

async function boot() {
  console.log('');
  console.log('  ☀️  ╔═══════════════════════════════╗');
  console.log('      ║     S U N D A Y   A I         ║');
  console.log('      ║   Your Personal AI Companion  ║');
  console.log('      ╚═══════════════════════════════╝');
  console.log('');

  // Start web server
  const { server } = createWebServer(agent);
  const port = config.port;

  server.listen(port, () => {
    log.success(`Dashboard: http://localhost:${port}`);
  });

  // Start messaging channels
  if (config.channels.discord) {
    const discord = new DiscordChannel();
    discord.setAgent(agent);
    await discord.start();
  }

  if (config.channels.telegram) {
    const telegram = new TelegramChannel();
    telegram.setAgent(agent);
    await telegram.start();
  }

  if (config.channels.whatsapp) {
    const whatsapp = new WhatsAppChannel();
    whatsapp.setAgent(agent);
    await whatsapp.start();
  }

  log.success('Sunday is ready! ☀️');

  // Graceful shutdown
  const shutdown = async () => {
    log.info('Shutting down...');
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

boot().catch((err) => {
  log.error(`Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
