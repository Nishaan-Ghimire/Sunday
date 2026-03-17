// Sunday — Logger with emoji prefixes

const LEVELS = {
  debug: { emoji: '🔍', color: '\x1b[90m' },
  info:  { emoji: '☀️', color: '\x1b[36m' },
  warn:  { emoji: '⚠️', color: '\x1b[33m' },
  error: { emoji: '❌', color: '\x1b[31m' },
  success: { emoji: '✅', color: '\x1b[32m' },
  channel: { emoji: '📡', color: '\x1b[35m' },
  provider: { emoji: '🤖', color: '\x1b[34m' },
  shell: { emoji: '🐚', color: '\x1b[33m' },
  memory: { emoji: '🧠', color: '\x1b[90m' },
};

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

class Logger {
  constructor(prefix = 'sunday') {
    this.prefix = prefix;
  }

  _log(level, ...args) {
    const { emoji, color } = LEVELS[level] || LEVELS.info;
    const timestamp = new Date().toLocaleTimeString();
    const tag = `${color}${BOLD}[${this.prefix}]${RESET}`;
    console.log(`${emoji} ${tag} ${color}${args.join(' ')}${RESET}`);
  }

  debug(...args) { this._log('debug', ...args); }
  info(...args) { this._log('info', ...args); }
  warn(...args) { this._log('warn', ...args); }
  error(...args) { this._log('error', ...args); }
  success(...args) { this._log('success', ...args); }
  channel(...args) { this._log('channel', ...args); }
  provider(...args) { this._log('provider', ...args); }
  shell(...args) { this._log('shell', ...args); }
  memory(...args) { this._log('memory', ...args); }

  child(prefix) {
    return new Logger(`${this.prefix}:${prefix}`);
  }
}

export const logger = new Logger('sunday');
export default Logger;
