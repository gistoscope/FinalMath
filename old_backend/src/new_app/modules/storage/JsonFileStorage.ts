/**
 * JsonFileStorage Class
 *
 * File-based storage implementation using JSON files.
 *
 * Responsibilities:
 *  - Read/write JSON files
 *  - Handle file system operations
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { StorageService } from "./StorageService.js";

export interface JsonFileStorageConfig {
  dataDir?: string;
}

/**
 * JsonFileStorage - File-based storage implementation
 */
export class JsonFileStorage implements StorageService {
  private readonly dataDir: string;

  constructor(config?: JsonFileStorageConfig) {
    this.dataDir = config?.dataDir || path.join(process.cwd(), "data");
  }

  /**
   * Ensure the data directory exists.
   */
  private async ensureDir(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch {
      // Directory may already exist
    }
  }

  private getFilePath(key: string): string {
    return path.join(this.dataDir, key);
  }

  /**
   * Load data from a JSON file.
   */
  async load<T>(key: string): Promise<T | null> {
    try {
      const filePath = this.getFilePath(key);
      const content = await fs.readFile(filePath, "utf-8");
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  /**
   * Save data to a JSON file.
   */
  async save<T>(key: string, data: T): Promise<void> {
    await this.ensureDir();
    const filePath = this.getFilePath(key);
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, content, "utf-8");
  }

  /**
   * Delete a JSON file.
   */
  async delete(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a file exists.
   */
  async exists(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a singleton instance (for backward compatibility)
 */
export const jsonStorage = new JsonFileStorage();
