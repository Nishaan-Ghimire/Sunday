// Sunday — Express Web Server + API Routes

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from '../core/logger.js';
import { memory } from '../core/memory.js';
import { router as providerRouter } from '../providers/router.js';
import { shellExecutor } from '../shell/executor.js';
import { webChannel } from '../channels/web.js';
import config from '../../config/default.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = logger.child('server');

export function createWebServer(agent) {
  const app = express();
  const server = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ server });

  // Init web channel with WebSocket server
  webChannel.setAgent(agent);
  webChannel.init(wss);

  // Middleware
  app.use(express.json());
  app.use(express.static(join(__dirname, 'public')));

  // --- API Routes ---

  // Status
  app.get('/api/status', (req, res) => {
    const providers = providerRouter.getStatus();
    const stats = memory.getStats();
    const channels = {
      web: { name: 'Web UI', running: true },
      discord: { name: 'Discord', running: config.channels.discord },
      telegram: { name: 'Telegram', running: config.channels.telegram },
      whatsapp: { name: 'WhatsApp', running: config.channels.whatsapp },
    };
    const shell = shellExecutor.getConfig();
    const uptime = process.uptime();

    res.json({ providers, channels, stats, shell, uptime });
  });

  // Conversations
  app.get('/api/conversations', (req, res) => {
    const conversations = memory.listConversations();
    res.json(conversations);
  });

  app.get('/api/conversations/:id/messages', (req, res) => {
    const messages = memory.getMessages(req.params.id);
    res.json(messages);
  });

  app.delete('/api/conversations/:id', (req, res) => {
    memory.deleteConversation(req.params.id);
    res.json({ success: true });
  });

  // Provider management
  app.post('/api/provider', (req, res) => {
    try {
      providerRouter.setActive(req.body.provider);
      res.json({ success: true, provider: req.body.provider });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Config
  app.get('/api/config', (req, res) => {
    res.json({
      defaultProvider: providerRouter.activeProvider,
      models: config.models,
      shell: shellExecutor.getConfig(),
      channels: config.channels,
    });
  });

  app.post('/api/config', (req, res) => {
    const { key, value } = req.body;
    memory.setConfig(key, value);
    res.json({ success: true });
  });

  // Chat via REST (fallback for non-WebSocket clients)
  app.post('/api/chat', async (req, res) => {
    try {
      const result = await agent.processMessage({
        content: req.body.message,
        conversationId: req.body.conversationId,
        channel: 'web',
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Fallback — serve index.html for SPA
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
  });

  return { app, server, wss };
}
