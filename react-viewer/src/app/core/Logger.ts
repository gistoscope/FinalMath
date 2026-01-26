// core/Logger.ts
// centralized logging service.

class LoggerService {
  private enabled: boolean = true;
  private prefix: string = "[App]";

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  log(message: string, ...args: any[]) {
    if (!this.enabled) return;
    console.log(`${this.prefix} ${message}`, ...args);
  }

  info(message: string, ...args: any[]) {
    if (!this.enabled) return;
    console.info(`${this.prefix} ${message}`, ...args);
  }

  warn(message: string, ...args: any[]) {
    if (!this.enabled) return;
    console.warn(`${this.prefix} ${message}`, ...args);
  }

  error(message: string, ...args: any[]) {
    if (!this.enabled) return;
    console.error(`${this.prefix} ${message}`, ...args);
  }
}

export const Logger = new LoggerService();
