<div align="center">
  <h1>☀️ Sunday AI</h1>
  <p>Your personal autonomous AI companion — lightweight, powerful, and truly yours.</p>
</div>

<br />

**Sunday AI** is a native, self-hosted personal AI assistant inspired by TinyClaw. It's designed to be your business partner and operational co-founder, built with a tiny core, multi-provider support, and a premium web interface.

Unlike corporate AI tools, Sunday operates on your local machine, retains context through an SQLite memory layer, and can interact with your system via a sandboxed shell executor.

---

## ✨ Features

- **Multi-Provider Routing:** Choose between Anthropic `Claude`, Google `Gemini`, or `OpenAI` models. Switch instantly via the UI or slash commands.
- **Heartware Personality Engine:** Deeply integrated deterministic personality traits. Sunday behaves as an organized, direct, and slightly dry business partner.
- **Controlled Shell Execution:** Run bash commands directly from chat `/run ls -la`. Configurable `allowlist` and `blocklist` keeps your system safe.
- **Multi-Channel Support:** 
  - 🌐 **Web UI:** Premium dark-themed dashboard with glassmorphism.
  - 💜 **Discord Bot:** DM or mention Sunday to get help.
  - ✈️ **Telegram Bot:** Full markdown support for Telegram.
  - 💚 **WhatsApp Integration:** Connect via QR code and chat via pure WhatsApp Web.
- **SQLite Memory:** Persistent context tracking. Sunday remembers what you said, reducing cognitive load.
- **Lightweight Core:** Built with Vanilla Node.js, Express, and pure HTML/CSS/JS. No heavy React/Next.js layers or convoluted abstractions.

## 🚀 Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- A terminal

### 2. Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Nishaan-Ghimire/Sunday.git
   cd Sunday
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and configure your API keys. At least one AI provider key is required (Claude, Gemini, or OpenAI).

### 3. Running Sunday

Start the agent and web server:
```bash
npm start
```

For development mode (auto-reloads on file changes):
```bash
npm run dev
```

Open your browser to `http://localhost:3000` to access the Sunday Dashboard.

## 🛠 Configuration & Architecture

### Configuration
Most settings can be managed directly from the Web UI Settings panel, but the base defaults live in `config/default.js`.

### Heartware
Sunday uses the **Heartware** architecture to define its identity deterministically from a numeric seed:
- `SOUL.md`: Big Five personality traits, communication style, and origin story.
- `IDENTITY.md`: Definition of the "assistant + business partner" dual role, values, and interaction boundaries.

### Project Structure
```text
Sunday/
├── .env                # API Keys and flags
├── config/
│   └── default.js      # Shell safety & core configs
├── data/
│   └── sunday.db       # SQLite Persistent Memory
├── src/
│   ├── channels/       # Discord, Telegram, WhatsApp, Web
│   ├── core/           # Agent Loop, Logger, Memory
│   ├── providers/      # Claude, Gemini, OpenAI APIs
│   ├── shell/          # Allowlist/Blocklist command executor
│   └── web/            # Express Server + Frontend SPA
├── IDENTITY.md         # Behavioral definitions
└── SOUL.md             # Personality traits
```

## 🛡️ Shell Security

Sunday includes an integrated terminal. By default, it operates in a strict `blocklist` mode, heavily preventing access to destructive commands like `rm -rf`, `sudo`, `dd`, `mkfs`, etc.

You can customize this in `config/default.js` by switching to `allowlist` mode, where only explicitly Whitelisted commands will run.

## 💬 Commands

Inside any channel (Web, Discord, Telegram, WhatsApp), you can use these slash commands:
- `/help` - Show available commands
- `/status` - Show provider & channel connection status
- `/provider <name>` - Switch AI provider (claude, gemini, openai)
- `/run <command>` - Execute a shell command
- `/model` - Show current model info
- `/clear` - Clear the current conversation history
- `/history` - View recent conversations

---

### License
MIT License. Created by Nishan Ghimire.
