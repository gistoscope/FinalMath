import { getConfig } from "./config";
import type {
  BackendEntryStepResponse,
  BackendHintResponse,
  BackendUndoResponse,
} from "./types";

const JSON_HEADERS = { "Content-Type": "application/json" };

async function postJson<T>(path: string, body: unknown): Promise<{ statusCode: number; json: T }> {
  const config = getConfig();
  const url = new URL(path, config.backendBaseUrl).toString();

  const res = await fetch(url, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });

  const statusCode = res.status;
  const text = await res.text();

  let json: T;
  try {
    json = text ? (JSON.parse(text) as T) : ({} as T);
  } catch (err) {
    throw new Error(`Failed to parse backend JSON at ${url}: ${(err as Error).message}`);
  }

  return { statusCode, json };
}

export async function callEntryStep(body: unknown): Promise<{ statusCode: number; json: BackendEntryStepResponse }> {
  const config = getConfig();
  return postJson<BackendEntryStepResponse>(config.entryStepPath, body);
}

export async function callHint(body: unknown): Promise<{ statusCode: number; json: BackendHintResponse }> {
  const config = getConfig();
  return postJson<BackendHintResponse>(config.hintPath, body);
}

export async function callUndo(body: unknown): Promise<{ statusCode: number; json: BackendUndoResponse }> {
  const config = getConfig();
  return postJson<BackendUndoResponse>(config.undoPath, body);
}