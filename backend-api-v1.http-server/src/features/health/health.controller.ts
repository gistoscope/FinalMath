/**
 * Health Controller
 *
 * Handles health check endpoints.
 */

import { Request, Response } from "express";
import { autoInjectable } from "tsyringe";

import { Controller } from "../../core/decorator/controller.decorator";
import { GET } from "../../core/decorator/routes.decorator";

@autoInjectable()
@Controller("/")
export class HealthController {
  constructor() {}

  /**
   * GET /health
   *
   * Basic health check endpoint.
   */
  @GET("/health")
  async healthCheck(_req: Request, res: Response) {
    return res.status(200).json({ message: "UP" });
  }

  /**
   * GET /
   *
   * Root endpoint.
   */
  @GET("/")
  async root(_req: Request, res: Response) {
    return res.status(200).json({
      message: "You are good to go",
    });
  }
}
