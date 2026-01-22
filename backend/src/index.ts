/**
 * new_app Module Index
 *
 * Main entry point for the reorganized backend application.
 * Exports all layers following Separation of Concerns principle.
 */

// Core Business Logic (Pure Domain Logic)
export * from "./core/index.js";

// Application Modules (Feature Containers)
export * from "./modules/index.js";

// HTTP Layer (Controllers, Routes, Middleware)
export * from "./http/index.js";

// Types (Global Type Definitions)
export * from "./types/index.js";

// Debug (Diagnostic Tools)
export * from "./debug/index.js";

// Application Bootstrap
export { Application, createApplication } from "./Application";
