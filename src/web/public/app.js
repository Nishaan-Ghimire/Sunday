// Sunday AI — Frontend Application

class SundayApp {
  constructor() {
    this.ws = null;
    this.conversationId = null;
    this.conversations = [];
    this.reconnectTimer = null;
    this.status = {};

    this.init();
  }

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.connectWebSocket();
    this.loadConversations();
    this.loadStatus();

    // Auto-resize textarea
    this.messageInput.addEventListener('input', () => this.autoResize());
  }

  cacheDOM() {
    this.messagesEl = document.getElementById('messages');
    this.messageInput = document.getElementById('message-input');
    this.sendBtn = document.getElementById('send-btn');
    this.newChatBtn = document.getElementById('new-chat-btn');
    this.conversationList = document.getElementById('conversation-list');
    this.chatTitle = document.getElementById('chat-title');
    this.welcomeScreen = document.getElementById('welcome-screen');
    this.typingIndicator = document.getElementById('typing-indicator');
    this.settingsBtn = document.getElementById('settings-btn');
    this.settingsModal = document.getElementById('settings-modal');
    this.closeSettings = document.getElementById('close-settings');
    this.providerSelector = document.getElementById('provider-selector');
    this.activeProviderLabel = document.getElementById('active-provider-label');
    this.sidebarToggle = document.getElementById('sidebar-toggle');
    this.sidebar = document.getElementById('sidebar');
    this.channelStatus = document.getElementById('channel-status');
  }

  bindEvents() {
    // Send message
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // New chat
    this.newChatBtn.addEventListener('click', () => this.newConversation());

    // Settings
    this.settingsBtn.addEventListener('click', () => this.openSettings());
    this.closeSettings.addEventListener('click', () => this.closeSettingsModal());
    this.settingsModal.querySelector('.modal-overlay').addEventListener('click', () => this.closeSettingsModal());

    // Provider chips
    this.providerSelector.querySelectorAll('.provider-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const provider = chip.dataset.provider;
        if (!chip.classList.contains('unavailable')) {
          this.switchProvider(provider);
        }
      });
    });

    // Mobile sidebar toggle
    this.sidebarToggle.addEventListener('click', () => {
      this.sidebar.classList.toggle('open');
    });

    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 &&
          this.sidebar.classList.contains('open') &&
          !this.sidebar.contains(e.target) &&
          e.target !== this.sidebarToggle) {
        this.sidebar.classList.remove('open');
      }
    });

    // Setting provider select
    document.getElementById('setting-provider').addEventListener('change', (e) => {
      this.switchProvider(e.target.value);
    });
  }

  // =================== WebSocket ===================

  connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('☀️ Connected to Sunday');
      if (this.conversationId) {
        this.ws.send(JSON.stringify({
          type: 'set_conversation',
          conversationId: this.conversationId
        }));
      }
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleWSMessage(data);
    };

    this.ws.onclose = () => {
      console.log('Disconnected — reconnecting in 3s...');
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this.connectWebSocket(), 3000);
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }

  handleWSMessage(data) {
    switch (data.type) {
      case 'response':
        this.hideTyping();
        this.addMessage('assistant', data.content, data.provider);
        if (data.conversationId && data.conversationId !== this.conversationId) {
          this.conversationId = data.conversationId;
        }
        this.loadConversations();
        break;

      case 'typing':
        data.active ? this.showTyping() : this.hideTyping();
        break;

      case 'system':
        // System messages — don't display in chat
        break;

      case 'conversation_set':
        this.conversationId = data.conversationId;
        break;

      case 'error':
        this.hideTyping();
        this.addMessage('system', `⚠️ ${data.message}`);
        break;
    }
  }

  // =================== Messaging ===================

  sendMessage() {
    const content = this.messageInput.value.trim();
    if (!content) return;

    // Hide welcome screen
    if (this.welcomeScreen) {
      this.welcomeScreen.style.display = 'none';
    }

    // Add user message to UI
    this.addMessage('user', content);

    // Send via WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'chat',
        content,
        conversationId: this.conversationId,
      }));
    }

    // Clear input
    this.messageInput.value = '';
    this.messageInput.style.height = 'auto';

    // Show typing
    this.showTyping();
  }

  addMessage(role, content, provider = null) {
    // Remove welcome screen if present
    if (this.welcomeScreen && this.welcomeScreen.parentNode) {
      this.welcomeScreen.style.display = 'none';
    }

    const msgEl = document.createElement('div');
    msgEl.className = `message ${role}`;

    let html = '';
    if (provider && role === 'assistant' && provider !== 'system' && provider !== 'error' && provider !== 'shell') {
      html += `<span class="provider-tag">${provider}</span>`;
    }

    html += this.renderMarkdown(content);
    msgEl.innerHTML = html;
    this.messagesEl.appendChild(msgEl);
    this.scrollToBottom();
  }

  renderMarkdown(text) {
    // Simple markdown renderer
    let html = this.escapeHtml(text);

    // Code blocks (``` ... ```)
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Headers
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');

    // Tables
    html = this.renderTables(html);

    // Unordered lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    // Clean up extra <br> after block elements
    html = html.replace(/<\/(pre|ul|h[234]|table)><br>/g, '</$1>');
    html = html.replace(/<br><(pre|ul|h[234]|table)/g, '<$1');

    return html;
  }

  renderTables(html) {
    const tableRegex = /(\|.+\|)\n(\|[-:\s|]+\|)\n((?:\|.+\|\n?)+)/g;
    return html.replace(tableRegex, (match, header, separator, body) => {
      const headers = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
      const rows = body.trim().split('\n').map(row => {
        const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  scrollToBottom() {
    requestAnimationFrame(() => {
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    });
  }

  showTyping() {
    this.typingIndicator.classList.remove('hidden');
    this.scrollToBottom();
  }

  hideTyping() {
    this.typingIndicator.classList.add('hidden');
  }

  autoResize() {
    this.messageInput.style.height = 'auto';
    this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 150) + 'px';
  }

  // =================== Conversations ===================

  async loadConversations() {
    try {
      const res = await fetch('/api/conversations');
      this.conversations = await res.json();
      this.renderConversations();
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }

  renderConversations() {
    if (this.conversations.length === 0) {
      this.conversationList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💬</div>
          <span>No conversations yet</span>
        </div>`;
      return;
    }

    this.conversationList.innerHTML = this.conversations.map(c => {
      const isActive = c.id === this.conversationId ? 'active' : '';
      const icon = c.channel === 'discord' ? '💜' :
                   c.channel === 'telegram' ? '✈️' :
                   c.channel === 'whatsapp' ? '💚' : '💬';
      return `
        <div class="conversation-item ${isActive}" data-id="${c.id}">
          <span class="conv-icon">${icon}</span>
          <span class="conv-title">${this.escapeHtml(c.title)}</span>
          <button class="conv-delete" data-id="${c.id}" title="Delete">&times;</button>
        </div>`;
    }).join('');

    // Bind click events
    this.conversationList.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('conv-delete')) return;
        this.loadConversation(item.dataset.id);
      });
    });

    this.conversationList.querySelectorAll('.conv-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.deleteConversation(btn.dataset.id);
      });
    });
  }

  async loadConversation(id) {
    this.conversationId = id;

    // Hide welcome, clear messages
    if (this.welcomeScreen) this.welcomeScreen.style.display = 'none';
    this.messagesEl.innerHTML = '';

    try {
      const res = await fetch(`/api/conversations/${id}/messages`);
      const messages = await res.json();

      messages.forEach(msg => {
        this.addMessage(msg.role, msg.content, msg.provider);
      });

      // Update selected conversation in sidebar
      this.conversationList.querySelectorAll('.conversation-item').forEach(el => {
        el.classList.toggle('active', el.dataset.id === id);
      });

      // Update title
      const conv = this.conversations.find(c => c.id === id);
      if (conv) this.chatTitle.textContent = conv.title;

      // Tell WebSocket about the conversation switch
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'set_conversation',
          conversationId: id,
        }));
      }

      // Close sidebar on mobile
      this.sidebar.classList.remove('open');
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  }

  async deleteConversation(id) {
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (this.conversationId === id) {
        this.newConversation();
      }
      await this.loadConversations();
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  }

  newConversation() {
    this.conversationId = null;
    this.chatTitle.textContent = 'Sunday AI';
    this.messagesEl.innerHTML = '';
    if (this.welcomeScreen) this.welcomeScreen.style.display = '';
    this.messagesEl.appendChild(this.welcomeScreen);
    this.renderConversations();
    this.messageInput.focus();
    this.sidebar.classList.remove('open');
  }

  // =================== Status & Providers ===================

  async loadStatus() {
    try {
      const res = await fetch('/api/status');
      this.status = await res.json();
      this.updateProviderUI();
      this.updateChannelStatus();
      this.updateActiveProviderLabel();
    } catch (err) {
      console.error('Failed to load status:', err);
    }

    // Refresh every 30 seconds
    setInterval(() => this.loadStatus(), 30000);
  }

  updateProviderUI() {
    if (!this.status.providers) return;

    this.providerSelector.querySelectorAll('.provider-chip').forEach(chip => {
      const name = chip.dataset.provider;
      const info = this.status.providers[name];
      if (!info) return;

      chip.classList.toggle('active', info.active);
      chip.classList.toggle('unavailable', !info.available);
    });
  }

  updateActiveProviderLabel() {
    if (!this.status.providers) return;

    const active = Object.entries(this.status.providers).find(([, p]) => p.active);
    if (active) {
      this.activeProviderLabel.textContent = `${active[0]} · ${active[1].model}`;
    }
  }

  updateChannelStatus() {
    if (!this.status.channels) return;

    const icons = {
      web: '🌐',
      discord: '💜',
      telegram: '✈️',
      whatsapp: '💚',
    };

    this.channelStatus.innerHTML = Object.entries(this.status.channels).map(([name, ch]) => `
      <div class="channel-status-item">
        <span class="channel-dot ${ch.running ? 'online' : 'offline'}"></span>
        <span>${icons[name] || '📡'} ${ch.name}</span>
      </div>
    `).join('');
  }

  async switchProvider(name) {
    try {
      const res = await fetch('/api/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: name }),
      });

      if (res.ok) {
        await this.loadStatus();
        this.addMessage('system', `✅ Switched to **${name}**`);
      } else {
        const err = await res.json();
        this.addMessage('system', `⚠️ ${err.error}`);
      }
    } catch (err) {
      this.addMessage('system', `❌ Failed to switch provider: ${err.message}`);
    }
  }

  // =================== Settings ===================

  openSettings() {
    this.settingsModal.classList.remove('hidden');

    // Populate settings
    if (this.status.providers) {
      const active = Object.entries(this.status.providers).find(([, p]) => p.active);
      if (active) {
        document.getElementById('setting-provider').value = active[0];
      }
    }

    if (this.status.shell) {
      document.getElementById('setting-shell-mode').value = this.status.shell.mode;
      const badge = document.getElementById('shell-status-badge');
      if (this.status.shell.enabled) {
        badge.className = 'badge badge-green';
        badge.textContent = 'Enabled';
      } else {
        badge.className = 'badge badge-red';
        badge.textContent = 'Disabled';
      }
    }

    if (this.status.channels) {
      const icons = { web: '🌐', discord: '💜', telegram: '✈️', whatsapp: '💚' };
      document.getElementById('settings-channels').innerHTML = Object.entries(this.status.channels).map(([name, ch]) => `
        <div class="channel-card ${ch.running ? 'active' : ''}">
          <div class="channel-name">${icons[name] || ''} ${ch.name}</div>
          <div class="channel-state">${ch.running ? '🟢 Connected' : '⚫ Offline'}</div>
        </div>
      `).join('');
    }

    if (this.status.stats) {
      document.getElementById('memory-stats').innerHTML = `
        <span>💬 ${this.status.stats.conversations} conversations</span>
        <span>📝 ${this.status.stats.messages} messages</span>
      `;
    }
  }

  closeSettingsModal() {
    this.settingsModal.classList.add('hidden');
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  window.app = new SundayApp();
});
