import fs from "fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JsonFileStorage } from "./JsonFileStorage";

vi.mock("fs/promises", () => ({
  default: {
    access: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
  },
}));

describe("JsonFileStorage", () => {
  let storage: JsonFileStorage;

  beforeEach(() => {
    storage = new JsonFileStorage("test-data");
    vi.clearAllMocks();
  });

  it("should save data", async () => {
    (fs.access as any).mockRejectedValue(new Error("ENOENT")); // Directory doesn't exist

    await storage.save("test.json", { key: "value" });

    expect(fs.mkdir).toHaveBeenCalled(); // Should attempt to create dir
    expect(fs.writeFile).toHaveBeenCalled();
  });

  it("should load data", async () => {
    (fs.access as any).mockResolvedValue(undefined); // Directory exists
    (fs.readFile as any).mockResolvedValue('{"key": "value"}');

    const data = await storage.load("test.json");
    expect(data).toEqual({ key: "value" });
  });

  it("should return null on load error", async () => {
    (fs.access as any).mockResolvedValue(undefined);
    (fs.readFile as any).mockRejectedValue(new Error("ENOENT"));

    const data = await storage.load("missing.json");
    expect(data).toBeNull();
  });
});
