import {
  instrumentLocally,
  instrumentViaBackend,
  syncLegacyStableIdState,
} from "../../app/utils/instrumentation";

export interface InstrumentationState {
  isLoading: boolean;
  instrumentedLatex: string;
  error: string | null;
  isStable: boolean;
}

export class MathInstrumentationService {
  private state: InstrumentationState;

  constructor(initialLatex: string = "") {
    this.state = {
      isLoading: false,
      instrumentedLatex: initialLatex,
      error: null,
      isStable: false,
    };
  }

  // --- Public API ---

  public getState() {
    return this.state;
  }

  public async process(latex: string) {
    if (!latex) return;

    const local = instrumentLocally(latex);

    if (local.success) {
      this.updateState({
        isLoading: false,
        instrumentedLatex: local.latex,
        error: null,
        isStable: true,
      });

      syncLegacyStableIdState(latex, local);
      return;
    }

    this.updateState({ isLoading: true });

    console.log(
      `[MathService] Local failed (${local.reason}) -> calling backend`,
    );

    try {
      const backend = await instrumentViaBackend(latex);

      this.updateState({
        isLoading: false,
        instrumentedLatex: backend.latex,
        error: backend.success
          ? null
          : backend.reason || "Instrumentation failed",
        isStable: backend.success,
      });

      syncLegacyStableIdState(latex, backend);
    } catch (error) {
      console.error("Backend instrumentation failed:", error);
      this.updateState({
        isLoading: false,
        error: "Network error",
        isStable: false,
      });
    }
  }

  // --- Private Helpers ---

  private updateState(updates: Partial<InstrumentationState>) {
    this.state = { ...this.state, ...updates };
  }
}
