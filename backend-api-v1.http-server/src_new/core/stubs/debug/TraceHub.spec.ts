import { beforeEach, describe, expect, it } from "vitest";
import { TraceHub } from "./TraceHub";

describe("TraceHub", () => {
  beforeEach(() => {
    TraceHub.reset();
  });

  it("should emit events and retrieve them", () => {
    TraceHub.emit({
      module: "test",
      event: "TEST_EVENT",
      data: { foo: "bar" },
    });

    const events = TraceHub.dump();
    expect(events).toHaveLength(1);
    expect(events[0].module).toBe("test");
    expect(events[0].event).toBe("TEST_EVENT");
    expect(events[0].data).toEqual({ foo: "bar" });
    expect(events[0].ts).toBeDefined();
    expect(events[0].traceId).toBe("unknown"); // default
  });

  it("should respect context setter", () => {
    TraceHub.setContext("trace-123", "step-456");

    TraceHub.emit({
      module: "test",
      event: "CTX_EVENT",
    });

    const events = TraceHub.dump();
    expect(events[0].traceId).toBe("trace-123");
    expect(events[0].stepId).toBe("step-456");
  });

  it("should clear context", () => {
    TraceHub.setContext("trace-123");
    TraceHub.clearContext();

    TraceHub.emit({
      module: "test",
      event: "NO_CTX",
    });

    const events = TraceHub.dump();
    expect(events[0].traceId).toBe("unknown");
  });

  it("should filter by traceId", () => {
    TraceHub.emit({ module: "m", event: "e1", traceId: "t1" });
    TraceHub.emit({ module: "m", event: "e2", traceId: "t2" });
    TraceHub.emit({ module: "m", event: "e3", traceId: "t1" });

    const t1Events = TraceHub.getByTraceId("t1");
    expect(t1Events).toHaveLength(2);
    expect(t1Events.map((e) => e.event)).toEqual(["e1", "e3"]);
  });

  it("should return last N events", () => {
    for (let i = 0; i < 5; i++) {
      TraceHub.emit({ module: "m", event: `e${i}` });
    }

    const last3 = TraceHub.getLastN(3);
    expect(last3).toHaveLength(3);
    expect(last3.map((e) => e.event)).toEqual(["e2", "e3", "e4"]);
  });

  it("should capture ring buffer behavior (mocked size)", () => {
    // Mock maxSize to small number to test verify ring behavior
    (TraceHub as any).maxSize = 3;

    TraceHub.emit({ module: "m", event: "1" });
    TraceHub.emit({ module: "m", event: "2" });
    TraceHub.emit({ module: "m", event: "3" });
    TraceHub.emit({ module: "m", event: "4" });

    expect(TraceHub.count()).toBe(3);
    const events = TraceHub.dump();
    expect(events.map((e) => e.event)).toEqual(["2", "3", "4"]);
  });
});
