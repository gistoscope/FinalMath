/**
 * User-related types
 */

export type UserRole = "student" | "teacher";

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
}

export interface AuthToken {
  userId: string;
  username: string;
  role: UserRole;
}
