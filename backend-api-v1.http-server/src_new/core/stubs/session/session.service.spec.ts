import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonStorage } from "../storage/JsonFileStorage";
import { SessionService } from "./session.service";

// Mock the jsonStorage dependency
vi.mock("../storage/JsonFileStorage", () => ({
  jsonStorage: {
    load: vi.fn(),
    save: vi.fn(),
  },
}));

describe("SessionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a new session", async () => {
    const session = await SessionService.createSession("s1", "u1", "student");
    expect(session).toBeDefined();
    expect(session.id).toBe("s1");
    expect(session.userId).toBe("u1");
    expect(jsonStorage.save).toHaveBeenCalled();
  });

  it("should retrieve existing session", async () => {
    // First create to populate internal map (since it's a singleton with state)
    // Or better, we trust internal map or mock load behavior.
    // For simplicity, let's just re-create.
    await SessionService.createSession("s2", "u2", "student");
    const session = await SessionService.getSession("s2");
    expect(session).toBeDefined();
    expect(session?.id).toBe("s2");
  });
});
