/**
 * app.ts
 *
 * This file re-exports the HTTP server components from the refactored module.
 * The implementation has been split into separate files for better organization:
 *
 * - http/EngineHttpServer.ts - Main server class
 * - http/middleware/CorsMiddleware.ts - CORS handling
 * - http/routes/ApiRouter.ts - API route handlers
 * - http/routes/DebugRouter.ts - Debug route handlers
 * - http/utils/HttpUtils.ts - HTTP utilities
 *
 * See ./http/index.ts for the full module exports.
 */

// Re-export all public APIs for backward compatibility
export {
  createEngineHttpServer,
  type IEngineHttpServer as EngineHttpServer,
  type EngineHttpServerOptions,
} from "./http/index.js";
