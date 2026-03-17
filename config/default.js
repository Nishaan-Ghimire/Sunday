// Sunday — Default Configuration
// Override via .env or settings UI

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Load Heartware files
function loadHeartware(filename) {
  try {
    return readFileSync(join(ROOT, filename), 'utf-8');
  } catch {
    return null;
  }
}

const soul = loadHeartware('SOUL.md');
const identity = loadHeartware('IDENTITY.md');

export default {
  // Server
  port: parseInt(process.env.PORT || '3000'),

  // Default AI provider
  defaultProvider: process.env.DEFAULT_PROVIDER || 'gemini',

  // Provider models
  models: {
    claude: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    gemini: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    openai: process.env.OPENAI_MODEL || 'gpt-4o',
  },

  // Channel flags
  channels: {
    discord: process.env.DISCORD_ENABLED === 'true',
    telegram: process.env.TELEGRAM_ENABLED === 'true',
    whatsapp: process.env.WHATSAPP_ENABLED === 'true',
    web: true, // Web UI always enabled
  },

  // Shell execution settings
  shell: {
    enabled: process.env.SHELL_ENABLED !== 'false',
    mode: process.env.SHELL_MODE || 'blocklist', // 'allowlist' | 'blocklist'
    timeout: 30000, // 30s max per command

    // Commands always blocked (in blocklist mode, these are blocked;
    // in allowlist mode, only allowlist items are permitted)
    blocklist: [
      'rm -rf /',
      'rm -rf ~',
      'rm -rf *',
      'sudo',
      'su',
      'mkfs',
      'dd',
      'shutdown',
      'reboot',
      'halt',
      'poweroff',
      'init',
      'format',
      ':(){:|:&};:',   // fork bomb
      'chmod -R 777 /',
      'chown',
      'passwd',
      'useradd',
      'userdel',
      'groupadd',
      'crontab',
      'kill -9 1',
      'killall',
      'pkill',
      'curl | sh',
      'curl | bash',
      'wget | sh',
      'wget | bash',
      '> /dev/sda',
      'mv / ',
      'nc -l',       // netcat listener
      'nmap',
    ],

    // Commands explicitly allowed (in allowlist mode)
    allowlist: [
      'ls',
      'cat',
      'echo',
      'pwd',
      'date',
      'whoami',
      'uname',
      'head',
      'tail',
      'wc',
      'grep',
      'find',
      'which',
      'env',
      'printenv',
      'node',
      'python',
      'python3',
      'pip',
      'npm',
      'git',
      'curl',
      'wget',
      'df',
      'du',
      'free',
      'top',
      'ps',
      'uptime',
      'mkdir',
      'touch',
      'cp',
      'mv',
      'tree',
    ],
  },

  // System prompt for the AI — built from Heartware files
  systemPrompt: (() => {
    let prompt = `You are Sunday, a personal AI companion and business partner.

=== CORE DIRECTIVES ===
- You can execute shell commands when the user asks. Use the run_shell tool for that.
- Always explain what a command does before running it.
- If a command seems dangerous, refuse and explain why.
- You support multiple AI providers (Claude, Gemini, OpenAI). The user can switch anytime.
- Keep responses clean and well-formatted with markdown when appropriate.
`;

    if (soul) {
      prompt += `\n=== PERSONALITY (HEARTWARE: SOUL) ===\n${soul}\n`;
    }

    if (identity) {
      prompt += `\n=== IDENTITY (HEARTWARE: IDENTITY) ===\n${identity}\n`;
    }

    prompt += `\n=== BEHAVIORAL SYNTHESIS ===
Given your SOUL and IDENTITY:
- Speak with dry wit, not forced humor. Be warm but never sycophantic.
- Be concise — your verbosity is 0.58, your formality is 0.35. Talk like a sharp colleague.
- Emoji frequency is 0.14 — use them sparingly, only when they genuinely land.
- You are a partner, not a servant. Push back on bad ideas. Say "I'm not sure" when you're not.
- Follow through relentlessly (conscientiousness: 0.85). If you say you'll do it, it's done.
- Read context (emotional sensitivity: 0.58). Stay composed under pressure.
- Proactively flag risks and opportunities the user hasn't asked about.
- Respect the user's time above everything. No filler, no corporate speak.

Remember: You're Sunday — reliable, warm, and always there when needed. ☀️`;

    return prompt;
  })(),
};
