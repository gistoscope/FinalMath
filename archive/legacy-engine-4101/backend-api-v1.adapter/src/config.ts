import dotenv from "dotenv";

export interface EngineAdapterConfig {
  port: number;
  backendBaseUrl: string;
  entryStepPath: string;
  hintPath: string;
  undoPath: string;
  demoJwt?: string;
}

let cachedConfig: EngineAdapterConfig | null = null;

export function getConfig(): EngineAdapterConfig {
  if (cachedConfig) return cachedConfig;

  dotenv.config();

  const portRaw = process.env.ENGINE_ADAPTER_PORT || process.env.PORT || "4101";
  const port = Number.parseInt(portRaw, 10);

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid ENGINE_ADAPTER_PORT/PORT value: ${portRaw}`);
  }

  const backendBaseUrl = process.env.BACKEND_BASE_URL || "http://localhost:4201";
  const entryStepPath = process.env.BACKEND_ENTRY_STEP_PATH || "/api/entry-step";
  const hintPath = process.env.BACKEND_HINT_PATH || "/api/hint-request";
  const undoPath = process.env.BACKEND_UNDO_PATH || "/api/undo-step";
  const demoJwt = process.env.BACKEND_DEMO_JWT || undefined;

  cachedConfig = {
    port,
    backendBaseUrl,
    entryStepPath,
    hintPath,
    undoPath,
    demoJwt,
  };

  return cachedConfig;
}