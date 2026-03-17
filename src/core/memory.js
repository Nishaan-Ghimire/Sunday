// Sunday — SQLite Conversation Memory

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'data', 'sunday.db');

class Memory {
  constructor() {
    // Ensure data directory exists
    const dir = dirname(DB_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this._init();
    logger.memory('Memory initialized');
  }

  _init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT DEFAULT 'New Conversation',
        channel TEXT DEFAULT 'web',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        provider TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      );

      CREATE TABLE IF NOT EXISTS config_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_time ON messages(timestamp);
    `);
  }

  // --- Conversations ---

  createConversation(id, channel = 'web', title = null) {
    const stmt = this.db.prepare(
      'INSERT OR IGNORE INTO conversations (id, channel, title) VALUES (?, ?, ?)'
    );
    stmt.run(id, channel, title || 'New Conversation');
    return id;
  }

  getConversation(id) {
    return this.db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  }

  listConversations(limit = 50) {
    return this.db.prepare(
      'SELECT * FROM conversations ORDER BY updated_at DESC LIMIT ?'
    ).all(limit);
  }

  updateConversationTitle(id, title) {
    this.db.prepare(
      'UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(title, id);
  }

  deleteConversation(id) {
    this.db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(id);
    this.db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
  }

  // --- Messages ---

  addMessage(conversationId, role, content, provider = null) {
    this.db.prepare(
      'INSERT INTO messages (conversation_id, role, content, provider) VALUES (?, ?, ?, ?)'
    ).run(conversationId, role, content, provider);

    // Update conversation timestamp
    this.db.prepare(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(conversationId);

    // Auto-generate title from first user message
    const conv = this.getConversation(conversationId);
    if (conv && conv.title === 'New Conversation' && role === 'user') {
      const title = content.substring(0, 60) + (content.length > 60 ? '...' : '');
      this.updateConversationTitle(conversationId, title);
    }
  }

  getMessages(conversationId, limit = 100) {
    return this.db.prepare(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC LIMIT ?'
    ).all(conversationId, limit);
  }

  getRecentContext(conversationId, limit = 20) {
    const messages = this.db.prepare(
      'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT ?'
    ).all(conversationId, limit);
    return messages.reverse();
  }

  // --- Config Store ---

  getConfig(key) {
    const row = this.db.prepare('SELECT value FROM config_store WHERE key = ?').get(key);
    return row ? JSON.parse(row.value) : null;
  }

  setConfig(key, value) {
    this.db.prepare(
      'INSERT OR REPLACE INTO config_store (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
    ).run(key, JSON.stringify(value));
  }

  // --- Stats ---

  getStats() {
    const convCount = this.db.prepare('SELECT COUNT(*) as count FROM conversations').get();
    const msgCount = this.db.prepare('SELECT COUNT(*) as count FROM messages').get();
    return {
      conversations: convCount.count,
      messages: msgCount.count,
    };
  }

  close() {
    this.db.close();
  }
}

export const memory = new Memory();
export default Memory;
