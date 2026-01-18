/**
 * cliEngineHttpServer.ts
 *
 * CLI entry point for the Backend API v1 HTTP server.
 */

import { createEngineHttpServer } from "./app";

function getPortFromEnv(): number {
  const raw = process.env.ENGINE_HTTP_PORT ?? process.env.PORT ?? "4201";

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 4201;
  }

  return parsed;
}

import { authService } from "./auth/auth.service.js";
import { logger } from "./logger.js";
import { makeHandlerDeps } from "./makeHandlerDeps";
import { SessionService } from "./session/session.service.js";

export async function main(): Promise<void> {
  const port = getPortFromEnv();

  try {
    // Initialize Persistency Services
    await authService.init();
    await SessionService.init();

    const handlerDeps = makeHandlerDeps();

    const server = createEngineHttpServer({
      port,
      handlerDeps,
      logger,
    });

    await server.start();
  } catch (error) {
    logger.error({ err: error }, "Failed to start server");
    process.exit(1);
  }
}

// Execute immediately when run via `node --import tsx` or `pnpm tsx`.
// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
