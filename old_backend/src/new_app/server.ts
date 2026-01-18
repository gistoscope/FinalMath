/**
 * Server Entry Point
 *
 * CLI entry point for the Backend API server.
 */

import { createApplication } from "./Application.js";

function getPortFromEnv(): number {
  const raw = process.env.ENGINE_HTTP_PORT ?? process.env.PORT ?? "4201";
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 4201;
  }
  return parsed;
}

export async function main(): Promise<void> {
  const port = getPortFromEnv();

  try {
    const app = await createApplication({
      port,
      dataDir: "data",
      coursesDir: "config/courses",
      log: console.log,
    });

    await app.start();

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.log("\n[Server] Shutting down...");
      await app.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("[Server] Received SIGTERM, shutting down...");
      await app.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error("[Server] Failed to start:", error);
    process.exit(1);
  }
}

// Execute when run directly
main();
