/**
 * User Service
 *
 * Handles user-related operations.
 * This is a placeholder service - the actual implementation would
 * connect to a database or external service.
 */

import { injectable } from "tsyringe";

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  isVerified: boolean;
  role: {
    id: string;
    role: string;
  };
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  role?: string;
}

export interface UserQuery extends Partial<User> {
  OR?: Partial<User>[];
}

@injectable()
export class UserService {
  // In-memory store for demo purposes
  private users: Map<string, User> = new Map();

  constructor() {
    // Initialize with a sample user
    this.users.set("demo-user", {
      id: "demo-user",
      username: "demo",
      email: "demo@example.com",
      password: "$2b$10$...", // hashed
      isVerified: true,
      role: {
        id: "role-1",
        role: "student",
      },
    });
  }

  /**
   * Find one user by query
   */
  async findOne(query: UserQuery): Promise<User | null> {
    for (const user of this.users.values()) {
      let match = true;

      // Handle OR conditions first
      if (query.OR && Array.isArray(query.OR)) {
        match = query.OR.some((condition) => {
          return Object.entries(condition).every(
            ([k, v]) => (user as any)[k] === v
          );
        });
      } else {
        // Regular field matching
        for (const [key, value] of Object.entries(query)) {
          if (key === "OR") continue;
          if ((user as any)[key] !== value) {
            match = false;
            break;
          }
        }
      }
      if (match) return user;
    }
    return null;
  }

  /**
   * Create a new user
   */
  async createUser(dto: CreateUserDto): Promise<User> {
    const id = `user-${Date.now()}`;
    const user: User = {
      id,
      username: dto.username,
      email: dto.email,
      password: dto.password, // Should be hashed
      isVerified: false,
      role: {
        id: "role-default",
        role: dto.role || "student",
      },
    };

    this.users.set(id, user);
    return user;
  }

  /**
   * Find all users
   */
  async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  /**
   * Update a user
   */
  async update(id: string, data: Partial<User>): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;

    const updated = { ...user, ...data };
    this.users.set(id, updated);
    return updated;
  }

  /**
   * Delete a user
   */
  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }
}
