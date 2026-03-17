// Sunday — Shell Executor with Safety Controls

import { exec } from 'child_process';
import { logger } from '../core/logger.js';
import config from '../../config/default.js';

const log = logger.child('shell');

class ShellExecutor {
  constructor() {
    this.config = config.shell;
  }

  /**
   * Check if a command is safe to execute
   */
  isSafe(command) {
    if (!this.config.enabled) {
      return { safe: false, reason: 'Shell execution is disabled' };
    }

    const cmd = command.trim().toLowerCase();
    const firstWord = cmd.split(/\s+/)[0];

    if (this.config.mode === 'allowlist') {
      // In allowlist mode, only explicitly allowed commands can run
      const allowed = this.config.allowlist.some(a =>
        firstWord === a.toLowerCase() || cmd.startsWith(a.toLowerCase())
      );
      if (!allowed) {
        return {
          safe: false,
          reason: `Command "${firstWord}" is not in the allowlist. Allowed: ${this.config.allowlist.join(', ')}`,
        };
      }
    }

    // Check blocklist (applies in both modes as a safety net)
    for (const blocked of this.config.blocklist) {
      const b = blocked.toLowerCase();
      if (cmd.includes(b) || cmd.startsWith(b)) {
        return {
          safe: false,
          reason: `Command blocked for safety: matches "${blocked}"`,
        };
      }
    }

    // Additional heuristic safety checks
    if (cmd.includes('> /dev/') && !cmd.includes('/dev/null')) {
      return { safe: false, reason: 'Writing to device files is not allowed' };
    }

    if (/\|\s*(sh|bash|zsh)\s*$/.test(cmd)) {
      return { safe: false, reason: 'Piping to shell is not allowed' };
    }

    if (cmd.includes('$(') || cmd.includes('`')) {
      // Allow command substitution but log a warning
      log.warn('Command contains substitution — proceed with caution');
    }

    return { safe: true };
  }

  /**
   * Execute a command with safety checks and timeout
   */
  async execute(command) {
    const check = this.isSafe(command);
    if (!check.safe) {
      log.warn(`Blocked: ${command} — ${check.reason}`);
      return {
        success: false,
        blocked: true,
        error: check.reason,
        command,
      };
    }

    log.shell(`Executing: ${command}`);

    return new Promise((resolve) => {
      const child = exec(command, {
        timeout: this.config.timeout,
        maxBuffer: 1024 * 1024, // 1MB output limit
        cwd: process.env.HOME,
        env: { ...process.env },
      }, (error, stdout, stderr) => {
        if (error) {
          if (error.killed) {
            resolve({
              success: false,
              error: `Command timed out after ${this.config.timeout / 1000}s`,
              command,
              stdout: stdout?.trim() || '',
              stderr: stderr?.trim() || '',
            });
          } else {
            resolve({
              success: false,
              error: error.message,
              exitCode: error.code,
              command,
              stdout: stdout?.trim() || '',
              stderr: stderr?.trim() || '',
            });
          }
        } else {
          resolve({
            success: true,
            command,
            stdout: stdout?.trim() || '',
            stderr: stderr?.trim() || '',
          });
        }
      });
    });
  }

  /**
   * Get current config for display
   */
  getConfig() {
    return {
      enabled: this.config.enabled,
      mode: this.config.mode,
      timeout: this.config.timeout,
      blocklist: this.config.blocklist,
      allowlist: this.config.allowlist,
    };
  }
}

export const shellExecutor = new ShellExecutor();
export default ShellExecutor;
