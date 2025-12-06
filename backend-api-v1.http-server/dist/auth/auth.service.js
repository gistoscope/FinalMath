import jwt from "jsonwebtoken";
const SECRET_KEY = process.env.JWT_SECRET || process.env.SECRET_KEY || "default_insecure_secret";
import { logger } from "../logger.js";
import { jsonStorage } from "../storage/JsonFileStorage";
const USERS_FILE = "users.json";
class AuthService {
    constructor() {
        this.users = new Map();
        this.initialized = false;
        this.initPromise = null;
        // We can't await in constructor, so we rely on init() or lazy loading.
        // For this demo, we'll trigger init but not await it here.
        // In a real app, we'd await this during server startup.
    }
    async init() {
        if (this.initialized)
            return;
        if (this.initPromise)
            return this.initPromise;
        this.initPromise = (async () => {
            const users = await jsonStorage.load(USERS_FILE);
            if (users) {
                for (const user of users) {
                    this.users.set(user.username, user);
                }
            }
            else {
                // Seed default users if file doesn't exist
                // We can't call this.register here because it awaits init() -> deadlock
                // So we manually add and save later
                this.users.set("student1", { id: "user-seed-1", username: "student1", password: "pass", role: "student" });
                this.users.set("teacher1", { id: "user-seed-2", username: "teacher1", password: "pass", role: "teacher" });
                await this.saveUsers();
            }
            this.initialized = true;
        })();
        return this.initPromise;
    }
    async register(username, password, role) {
        // Ensure loaded
        await this.init();
        if (this.users.has(username)) {
            throw new Error("Username already exists");
        }
        const user = {
            id: `user-${Date.now()}-${Math.random()}`,
            username,
            password,
            role,
        };
        this.users.set(username, user);
        await this.saveUsers();
        return user;
    }
    async login(username, password) {
        if (!this.initialized)
            await this.init();
        const user = this.users.get(username);
        if (!user || user.password !== password) {
            logger.warn({ username }, "Login failed: invalid credentials");
            return null;
        }
        return {
            userId: user.id,
            username: user.username,
            role: user.role,
        };
    }
    async saveUsers() {
        const users = Array.from(this.users.values());
        await jsonStorage.save(USERS_FILE, users);
    }
    // Verify JWT and return payload
    validateToken(tokenString) {
        try {
            const decoded = jwt.verify(tokenString, SECRET_KEY);
            return {
                userId: decoded.userId,
                username: decoded.username,
                role: decoded.role
            };
        }
        catch (error) {
            logger.warn({ err: error }, "Token validation failed");
            return null;
        }
    }
    generateTokenString(token) {
        return jwt.sign(token, SECRET_KEY, { expiresIn: '1h' });
    }
}
export const authService = new AuthService();
