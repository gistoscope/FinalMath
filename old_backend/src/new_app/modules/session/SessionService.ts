/**
 * SessionService Class
 *
 * Manages user sessions and step history.
 *
 * Responsibilities:
 *  - Store and retrieve sessions by sessionId
 *  - Store user info (userId, role)
 *  - Manage step history per session
 */

import type { StepHistory } from "../../core/stepmaster/stepmaster.types.js";
import type { UserRole } from "../../types/user.types.js";
import type { StorageService } from "../storage/StorageService.js";

const SESSIONS_FILE = "sessions.json";

export interface Session {
  id: string;
  userId: string;
  role: UserRole;
  history: StepHistory;
  createdAt: number;
}

export interface SessionServiceConfig {
  storage: StorageService;
  log?: (message: string) => void;
}

/**
 * SessionService - Manages user sessions
 */
export class SessionService {
  private readonly storage: StorageService;
  private readonly log: (message: string) => void;

  private sessions: Map<string, Session> = new Map();
  private initialized = false;

  constructor(config: SessionServiceConfig) {
    this.storage = config.storage;
    this.log = config.log || (() => {});
  }

  /**
   * Initialize the session service.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const sessions = await this.storage.load<Session[]>(SESSIONS_FILE);
      if (sessions) {
        for (const session of sessions) {
          this.sessions.set(session.id, session);
        }
      }
      this.initialized = true;
    } catch (error) {
      this.log(`[SessionService] Failed to load sessions: ${error}`);
      this.initialized = true;
    }
  }

  /**
   * Create a new session.
   */
  async createSession(
    sessionId: string,
    userId: string = "anonymous",
    role: UserRole = "student",
  ): Promise<Session> {
    await this.init();

    const session: Session = {
      id: sessionId,
      userId,
      role,
      history: { entries: [] },
      createdAt: Date.now(),
    };

    this.sessions.set(sessionId, session);
    await this.saveSessions();

    return session;
  }

  /**
   * Get a session by ID.
   */
  async getSession(sessionId: string): Promise<Session | undefined> {
    await this.init();
    return this.sessions.get(sessionId);
  }

  /**
   * Get or create session history.
   */
  async getHistory(
    sessionId: string,
    userId?: string,
    role?: UserRole,
  ): Promise<StepHistory> {
    let session = await this.getSession(sessionId);

    if (!session) {
      session = await this.createSession(sessionId, userId, role);
    } else if (userId && session.userId === "anonymous") {
      // Upgrade session if it was anonymous
      session.userId = userId;
      if (role) session.role = role;
      await this.saveSessions();
    }

    return session.history;
  }

  /**
   * Update session history.
   */
  async updateHistory(sessionId: string, history: StepHistory): Promise<void> {
    let session = await this.getSession(sessionId);

    if (session) {
      session.history = history;
      await this.saveSessions();
    } else {
      const newSession = await this.createSession(sessionId);
      newSession.history = history;
      await this.saveSessions();
    }
  }

  /**
   * Find all sessions by user ID.
   */
  async findSessionsByUserId(userId: string): Promise<Session[]> {
    await this.init();

    const result: Session[] = [];
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        result.push(session);
      }
    }

    return result;
  }

  /**
   * Delete a session.
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    await this.init();

    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      await this.saveSessions();
    }

    return deleted;
  }

  private async saveSessions(): Promise<void> {
    const sessions = Array.from(this.sessions.values());
    await this.storage.save(SESSIONS_FILE, sessions);
  }
}
