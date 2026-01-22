/**
 * StorageService Interface
 *
 * Abstract storage interface for persistence.
 */

export interface StorageService {
  /**
   * Load data from storage.
   */
  load<T>(key: string): Promise<T | null>;

  /**
   * Save data to storage.
   */
  save<T>(key: string, data: T): Promise<void>;

  /**
   * Delete data from storage.
   */
  delete(key: string): Promise<boolean>;

  /**
   * Check if key exists.
   */
  exists(key: string): Promise<boolean>;
}
