/**
 * Dependency Injection Tokens
 *
 * Symbols used as DI tokens for tsyringe.
 * This file should NOT import any classes to avoid circular dependencies.
 */

// Storage
export const DATA_DIR = Symbol("DATA_DIR");
export const STORAGE_SERVICE = Symbol("STORAGE_SERVICE");

// Courses
export const COURSES_DIR = Symbol("COURSES_DIR");

// Auth
export const JWT_SECRET = Symbol("JWT_SECRET");
export const JWT_SECRET_EXPIRY = Symbol("JWT_SECRET_EXPIRY");

// InvariantLoader
export const INVARIANT_LOADER_BASE_PATH = Symbol("INVARIANT_LOADER_BASE_PATH");

// HttpServer
export const HTTP_SERVER_PORT = Symbol("HTTP_SERVER_PORT");
export const HTTP_SERVER_ROUTERS = Symbol("HTTP_SERVER_ROUTERS");
export const HTTP_SERVER_LOG = Symbol("HTTP_SERVER_LOG");
export const HTTP_SERVER_ENABLE_CORS = Symbol("HTTP_SERVER_ENABLE_CORS");
export const HTTP_SERVER_ENABLE_LOGGING = Symbol("HTTP_SERVER_ENABLE_LOGGING");

// Utils
export const HTTP_UTILS = Symbol("HTTP_UTILS");
