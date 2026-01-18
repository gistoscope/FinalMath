/**
 * AuthService Class
 *
 * Handles user authentication and authorization.
 *
 * Responsibilities:
 *  - User registration and login
 *  - JWT token generation and validation
 *  - User session management
 */

import jwt from "jsonwebtoken";
import { inject, injectable } from "tsyringe";
import { JWT_SECRET, JWT_SECRET_EXPIRY } from "../../registry.js";
import type { AuthToken, User, UserRole } from "../../types/user.types.js";
import type { StorageService } from "../storage/StorageService.js";

const USERS_FILE = "users.json";

/**
 * AuthService - Manages user authentication
 */
@injectable()
export class AuthService {
  private readonly log: (message: string) => void = console.log;

  private users: Map<string, User> = new Map();
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(
    @inject(JWT_SECRET) private readonly secretKey: string,
    @inject(JWT_SECRET_EXPIRY) private readonly tokenExpiry: string,
    private readonly storage: StorageService,
  ) {}

  /**
   * Initialize the auth service by loading users from storage.
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.loadUsers();
    return this.initPromise;
  }

  private async loadUsers(): Promise<void> {
    try {
      const users = await this.storage.load<User[]>(USERS_FILE);
      if (users) {
        for (const user of users) {
          this.users.set(user.username, user);
        }
      } else {
        // Seed default users
        await this.seedDefaultUsers();
      }
      this.initialized = true;
    } catch (error) {
      this.log(`[AuthService] Failed to load users: ${error}`);
      this.initialized = true;
    }
  }

  private async seedDefaultUsers(): Promise<void> {
    const defaultUsers: User[] = [
      {
        id: "user-seed-1",
        username: "student1",
        password: "pass",
        role: "student",
      },
      {
        id: "user-seed-2",
        username: "teacher1",
        password: "pass",
        role: "teacher",
      },
    ];

    for (const user of defaultUsers) {
      this.users.set(user.username, user);
    }

    await this.saveUsers();
  }

  /**
   * Register a new user.
   */
  async register(
    username: string,
    password: string,
    role: UserRole,
  ): Promise<User> {
    await this.init();

    if (this.users.has(username)) {
      throw new Error("Username already exists");
    }

    const user: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      username,
      password,
      role,
    };

    this.users.set(username, user);
    await this.saveUsers();

    return user;
  }

  /**
   * Authenticate a user.
   */
  async login(username: string, password: string): Promise<AuthToken | null> {
    await this.init();

    const user = this.users.get(username);
    if (!user || user.password !== password) {
      this.log(
        `[AuthService] Login failed: invalid credentials for ${username}`,
      );
      return null;
    }

    return {
      userId: user.id,
      username: user.username,
      role: user.role,
    };
  }

  /**
   * Generate a JWT token string.
   */
  generateTokenString(token: AuthToken): string {
    return jwt.sign(token, this.secretKey, { expiresIn: this.tokenExpiry });
  }

  /**
   * Validate a JWT token and return the payload.
   */
  validateToken(tokenString: string): AuthToken | null {
    try {
      const decoded = jwt.verify(tokenString, this.secretKey) as AuthToken;
      return {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
      };
    } catch (error) {
      this.log(`[AuthService] Token validation failed: ${error}`);
      return null;
    }
  }

  /**
   * Get a user by username.
   */
  async getUser(username: string): Promise<User | undefined> {
    await this.init();
    return this.users.get(username);
  }

  private async saveUsers(): Promise<void> {
    const users = Array.from(this.users.values());
    await this.storage.save(USERS_FILE, users);
  }
}
