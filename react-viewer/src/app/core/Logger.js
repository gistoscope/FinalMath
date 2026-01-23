/**
 * Logger.js
 * centralized logging service.
 */

class LoggerService {
  constructor() {
    this.enabled = true;
    this.prefix = "[App]";
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  log(message, ...args) {
    if (!this.enabled) return;
    console.log(`${this.prefix} ${message}`, ...args);
  }

  info(message, ...args) {
    if (!this.enabled) return;
    console.info(`${this.prefix} ${message}`, ...args);
  }

  warn(message, ...args) {
    if (!this.enabled) return;
    console.warn(`${this.prefix} ${message}`, ...args);
  }

  error(message, ...args) {
    if (!this.enabled) return;
    console.error(`${this.prefix} ${message}`, ...args);
  }
}

export const Logger = new LoggerService();
