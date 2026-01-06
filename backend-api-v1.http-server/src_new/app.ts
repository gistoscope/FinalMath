/**
 * App Configuration
 *
 * Express application setup with middleware and controller registration.
 */

import cors from "cors";
import express, { Express, Response } from "express";
import morgan from "morgan";
import passport from "passport";
import "reflect-metadata";
import { container } from "tsyringe";

import { registerController } from "./core/controller/register-controller";
import { HttpException, ValidationException } from "./core/errors/index";

// Features
import { AuthController } from "./features/auth/auth.controller";
import { AuthMiddleware } from "./features/auth/auth.middleware";
import { DebugController, DebugTraceController } from "./features/debug";
import { EngineController } from "./features/engine";
import { HealthController } from "./features/health";
import { OrchestratorController } from "./features/orchestrator";
import { ReportingController } from "./features/reporting";

/**
 * All registered controllers
 */
const controllers = [
  // Core Engine
  EngineController,

  // Orchestrator V5
  OrchestratorController,

  // Debug endpoints
  DebugController,
  DebugTraceController,

  // Reporting
  ReportingController,

  // Health
  HealthController,

  // Auth
  AuthController,
];

export function createApp() {
  const app: Express = express();

  // CORS Configuration
  app.use(
    cors({
      origin: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    })
  );

  // Logging
  app.use(morgan("dev"));

  // Body Parsing
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Passport Authentication
  const authMiddleware = container.resolve(AuthMiddleware);
  authMiddleware.init(passport);

  // Register all controllers
  registerController(app, controllers);

  // 404 not found handler
  app.use((_req, res: Response) => {
    res.status(404).json({ message: "You requested resource not found!" });
  });

  // Global error handler
  app.use((err: any, _req: any, res: Response, _next: any) => {
    // Handle validation errors
    if (err instanceof ValidationException) {
      return res.status(err.statusCode).json({
        message: err.message,
        errors: err.all,
      });
    }

    // Handle HTTP exceptions
    if (err instanceof HttpException) {
      return res.status(err.statusCode).json({ message: err.message });
    }

    // Log unexpected errors
    console.error("[App] Unexpected error:", err);

    // Return generic error
    res.status(500).json({ message: "Internal Server Error" });
    return;
  });

  return app;
}
