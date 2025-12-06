/**
 * Session Service (TzV2+)
 *
 * Responsibilities:
 *  - Store and retrieve StepHistory by sessionId.
 *  - Store user info (userId, role).
 */
import { jsonStorage } from "../storage/JsonFileStorage";
const SESSIONS_FILE = "sessions.json";
export class SessionService {
    static async init() {
        if (this.initialized)
            return;
        const sessions = await jsonStorage.load(SESSIONS_FILE);
        if (sessions) {
            for (const session of sessions) {
                this.sessions.set(session.id, session);
            }
        }
        this.initialized = true;
    }
    static async createSession(sessionId, userId = "anonymous", role = "student") {
        if (!this.initialized)
            await this.init();
        const session = {
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
    static async getSession(sessionId) {
        if (!this.initialized)
            await this.init();
        return this.sessions.get(sessionId);
    }
    static async getHistory(sessionId, userId, role) {
        let session = await this.getSession(sessionId);
        if (!session) {
            session = await this.createSession(sessionId, userId, role);
        }
        else if (userId && session.userId === "anonymous") {
            // Upgrade session if it was anonymous and we now have a user
            session.userId = userId;
            if (role)
                session.role = role;
            await this.saveSessions();
        }
        return session.history;
    }
    static async updateHistory(sessionId, history) {
        const session = await this.getSession(sessionId);
        if (session) {
            session.history = history;
            await this.saveSessions();
        }
        else {
            // Implicit creation if not exists (for now)
            const newSession = await this.createSession(sessionId);
            newSession.history = history;
            // createSession already saves
        }
    }
    static async findAllSessionsByUserId(userId) {
        if (!this.initialized)
            await this.init();
        const result = [];
        for (const session of this.sessions.values()) {
            if (session.userId === userId) {
                result.push(session);
            }
        }
        return result;
    }
    static async saveSessions() {
        const sessions = Array.from(this.sessions.values());
        await jsonStorage.save(SESSIONS_FILE, sessions);
    }
}
SessionService.sessions = new Map();
SessionService.initialized = false;
