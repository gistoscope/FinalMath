import { injectable } from "tsyringe";
export type UserRole = "student" | "teacher";
export interface User {
  id: string;
  username: string;
  password: string; // In-memory, plain text for demo
  role: UserRole;
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
  private users: Array<User> = [
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
  constructor() {}

  /**
   * Find one user by query.
   * Adapts the specific query pattern used by AuthService to legacy logic.
   */
  async findOne(query: UserQuery): Promise<User | null> {
    let username: string | undefined;
    let id: string | undefined;

    // Handle OR conditions (e.g. username OR email)
    if (query.OR && Array.isArray(query.OR)) {
      for (const condition of query.OR) {
        if (condition.username) username = condition.username;
        // Legacy system does not support email lookup
      }
    }

    // Direct lookup
    if (query.username) username = query.username;
    if (query.id) id = query.id;

    let legacyUser;
    if (username) {
      legacyUser = await this.getUserByUsername(username);
    } else if (id) {
      legacyUser = await this.getUserById(id);
    }

    if (!legacyUser) return null;

    return this.mapLegacyUser(legacyUser);
  }

  /**
   * Create a new user
   */
  async createUser(dto: CreateUserDto): Promise<User> {
    const { username, password } = dto;

    const user: User = {
      id: this.generateUserId(),
      username,
      password,
      role: "student",
    };
    this.users.push(user);
    return user;
  }

  /**
   * Helper to adapt legacy user to src_new User interface
   */
  private mapLegacyUser(u: any): any {
    return {
      id: u.id,
      username: u.username,
      email: "", // Not available in legacy
      password: u.password,
      isVerified: true, // Legacy users are always verified
      role: {
        id: "legacy-role",
        role: u.role,
      },
    };
  }

  async findAll(): Promise<User[]> {
    return this.users;
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const updateData = this.users.map((a) => {
      if (a.id === id) {
        return { ...a, ...data };
      }
      return a;
    });
    this.users = updateData;
    return this.getUserById(id);
  }

  async delete(id: string): Promise<boolean> {
    this.users = this.users.filter((a) => a.id === id);
    return true;
  }

  async getUserById(id: string): Promise<User | null> {
    const findUser = this.users.find((a) => a.id === id);
    if (!findUser) throw new Error("User not found!");
    return findUser;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const findUser = this.users.find((a) => a.username === username);
    if (!findUser) throw new Error("User not found!");
    return findUser;
  }

  generateUserId() {
    return `user-${Date.now()}-${Math.random()}`;
  }
}
