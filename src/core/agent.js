// Sunday — Core Agent Loop

import { router } from '../providers/router.js';
import { memory } from './memory.js';
import { shellExecutor } from '../shell/executor.js';
import { logger } from './logger.js';
import config from '../../config/default.js';
import crypto from 'crypto';

const log = logger.child('agent');

class Agent {
  constructor() {
    this.router = router;
    this.memory = memory;
    this.shell = shellExecutor;
    this.messageHandlers = [];  // Callbacks for channels
  }

  /**
   * Process an incoming message from any channel
   */
  async processMessage({ content, conversationId, channel = 'web', userId = 'user' }) {
    // Ensure conversation exists
    if (!conversationId) {
      conversationId = crypto.randomUUID();
    }
    this.memory.createConversation(conversationId, channel);

    // Store user message
    this.memory.addMessage(conversationId, 'user', content);

    try {
      // Check for special commands
      const specialResponse = await this._handleSpecialCommands(content, conversationId);
      if (specialResponse) {
        this.memory.addMessage(conversationId, 'assistant', specialResponse, 'system');
        return { response: specialResponse, conversationId, provider: 'system' };
      }

      // Check for shell command requests
      const shellMatch = content.match(/^\/(?:run|shell|exec|cmd)\s+(.+)$/i);
      if (shellMatch) {
        return this._handleShellCommand(shellMatch[1], conversationId);
      }

      // Build message context
      const context = this.memory.getRecentContext(conversationId);
      const messages = [
        { role: 'system', content: this._buildSystemPrompt() },
        ...context,
      ];

      // Route to AI provider
      const providerName = this.router.activeProvider;
      const response = await this.router.chat(messages);

      // Check if AI wants to run a shell command
      const shellResponse = await this._handleAIShellRequest(response, conversationId);
      if (shellResponse) {
        this.memory.addMessage(conversationId, 'assistant', shellResponse, providerName);
        return { response: shellResponse, conversationId, provider: providerName };
      }

      // Store assistant response
      this.memory.addMessage(conversationId, 'assistant', response, providerName);

      return { response, conversationId, provider: providerName };
    } catch (error) {
      log.error(`Error processing message: ${error.message}`);
      const errorMsg = `⚠️ Error: ${error.message}`;
      this.memory.addMessage(conversationId, 'assistant', errorMsg, 'error');
      return { response: errorMsg, conversationId, provider: 'error' };
    }
  }

  /**
   * Handle special slash commands
   */
  async _handleSpecialCommands(content, conversationId) {
    const cmd = content.trim().toLowerCase();

    if (cmd === '/help') {
      return `## ☀️ Sunday Commands

| Command | Description |
|---------|-------------|
| \`/help\` | Show this help menu |
| \`/status\` | Show provider & channel status |
| \`/provider <name>\` | Switch AI provider (claude, gemini, openai) |
| \`/run <command>\` | Execute a shell command |
| \`/shell <command>\` | Execute a shell command |
| \`/model\` | Show current model info |
| \`/clear\` | Clear conversation history |
| \`/history\` | Show conversation list |

Just type normally to chat with Sunday! 💬`;
    }

    if (cmd === '/status') {
      const providers = this.router.getStatus();
      const stats = this.memory.getStats();
      const shellConfig = this.shell.getConfig();

      let status = '## ☀️ Sunday Status\n\n';
      status += '### AI Providers\n';
      for (const [name, info] of Object.entries(providers)) {
        const icon = info.available ? (info.active ? '🟢' : '⚪') : '🔴';
        status += `${icon} **${name}** — ${info.model} ${info.active ? '(active)' : ''}\n`;
      }
      status += `\n### Memory\n📊 ${stats.conversations} conversations, ${stats.messages} messages\n`;
      status += `\n### Shell\n🐚 ${shellConfig.enabled ? `Enabled (${shellConfig.mode} mode)` : 'Disabled'}\n`;
      return status;
    }

    if (cmd.startsWith('/provider ')) {
      const name = cmd.split(' ')[1];
      try {
        this.router.setActive(name);
        return `✅ Switched to **${name}** (${this.router.getActive().model})`;
      } catch (e) {
        return `❌ ${e.message}`;
      }
    }

    if (cmd === '/model') {
      const active = this.router.getActive();
      return `🤖 Current provider: **${this.router.activeProvider}**\n📦 Model: \`${active?.model || 'none'}\``;
    }

    if (cmd === '/clear') {
      this.memory.deleteConversation(conversationId);
      return '🧹 Conversation cleared!';
    }

    if (cmd === '/history') {
      const convs = this.memory.listConversations(10);
      if (convs.length === 0) return '📭 No conversations yet!';
      let list = '## 📜 Recent Conversations\n\n';
      for (const c of convs) {
        list += `- **${c.title}** (${c.channel}) — ${c.updated_at}\n`;
      }
      return list;
    }

    return null;
  }

  /**
   * Handle direct shell command execution
   */
  async _handleShellCommand(command, conversationId) {
    const result = await this.shell.execute(command);

    let response;
    if (result.blocked) {
      response = `🚫 **Command Blocked**\n\`\`\`\n${command}\n\`\`\`\n${result.error}`;
    } else if (result.success) {
      response = `🐚 **Shell Output**\n\`\`\`\n$ ${command}\n${result.stdout || '(no output)'}\n\`\`\``;
      if (result.stderr) {
        response += `\n⚠️ **Stderr**\n\`\`\`\n${result.stderr}\n\`\`\``;
      }
    } else {
      response = `❌ **Command Failed**\n\`\`\`\n$ ${command}\n${result.error}\n\`\`\``;
      if (result.stdout) response += `\n**Output:**\n\`\`\`\n${result.stdout}\n\`\`\``;
      if (result.stderr) response += `\n**Stderr:**\n\`\`\`\n${result.stderr}\n\`\`\``;
    }

    this.memory.addMessage(conversationId, 'assistant', response, 'shell');
    return { response, conversationId, provider: 'shell' };
  }

  /**
   * Check if AI response contains a shell command request (via markdown code block with shell/bash tag)
   */
  async _handleAIShellRequest(response, conversationId) {
    // Pattern: look for ```run: <command>``` or ```shell: <command>```
    const match = response.match(/```(?:run|shell|exec):\s*(.+?)```/s);
    if (!match) return null;

    const command = match[1].trim();
    const result = await this.shell.execute(command);

    let shellOutput;
    if (result.blocked) {
      shellOutput = `\n\n🚫 **Blocked:** ${result.error}`;
    } else if (result.success) {
      shellOutput = `\n\n🐚 **Output:**\n\`\`\`\n${result.stdout || '(no output)'}\n\`\`\``;
    } else {
      shellOutput = `\n\n❌ **Error:** ${result.error}`;
    }

    return response + shellOutput;
  }

  /**
   * Build system prompt with current capabilities
   */
  _buildSystemPrompt() {
    let prompt = config.systemPrompt;

    if (this.shell.config.enabled) {
      prompt += `\n\nYou have access to shell execution. To run a command, include it in a fenced code block tagged with "run:". Example:\n\`\`\`run: ls -la\`\`\`\n\nThe command will be executed and output appended to your response. Only use this when the user asks you to run something or when it's genuinely helpful.`;
      prompt += `\n\nShell mode: ${this.shell.config.mode}`;
      if (this.shell.config.mode === 'allowlist') {
        prompt += `\nAllowed commands: ${this.shell.config.allowlist.join(', ')}`;
      }
    }

    prompt += `\n\nCurrent provider: ${this.router.activeProvider}`;
    const stats = this.memory.getStats();
    prompt += `\nMemory: ${stats.conversations} conversations, ${stats.messages} messages`;

    return prompt;
  }

  /**
   * Register a message handler (for channels to receive responses)
   */
  onResponse(handler) {
    this.messageHandlers.push(handler);
  }
}

export const agent = new Agent();
export default Agent;
