/**
 * Server Entry Point
 *
 * CLI entry point for the Backend API server.
 */
import "reflect-metadata";
import { container } from "tsyringe";
import { Application } from "./Application.js";
import { resolveDependencies } from "./registry.js";

export async function main(): Promise<void> {
  try {
    resolveDependencies();
    const app = container.resolve(Application);

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
