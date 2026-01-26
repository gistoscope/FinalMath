// features/trace-hub/TraceIdGenerator.ts
class TraceIdGenerator {
  private currentTraceId: string | null = null;

  generate(): string {
    this.currentTraceId = `tr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
    return this.currentTraceId;
  }

  getCurrent(): string | null {
    return this.currentTraceId;
  }

  clear() {
    this.currentTraceId = null;
  }
}

export { TraceIdGenerator };
