import type { IncomingMessage, ServerResponse } from "node:http";
import { injectable } from "tsyringe";

@injectable()
export class LoggerMiddleware {
  private readonly log: (message: string) => void = console.log;
  private readonly enabled: boolean = true;

  logRequest(req: IncomingMessage): number {
    if (!this.enabled) {
      return Date.now();
    }

    const method = req.method || "GET";
    const url = req.url || "/";
    this.log(`[HTTP] --> ${method} ${url}`);

    return Date.now();
  }

  logResponse(
    req: IncomingMessage,
    res: ServerResponse,
    startTime: number,
  ): void {
    if (!this.enabled) {
      return;
    }

    const method = req.method || "GET";
    const url = req.url || "/";
    const status = res.statusCode;
    const duration = Date.now() - startTime;

    this.log(`[HTTP] <-- ${method} ${url} ${status} (${duration}ms)`);
  }
}
