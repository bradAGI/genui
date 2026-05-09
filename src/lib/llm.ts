import { runTurnGemini } from "./providers/gemini";

export type Provider = "gemini";

export interface RunTurnArgs {
  provider: Provider;
  prompt: string;
  sessionId: string;
  model?: string;
  grounded?: boolean;
}

export interface RunTurnResult {
  json: unknown;
  raw: string;
  durationMs: number;
  error?: string;
  grounded?: boolean;
  citations?: { title?: string; url: string }[];
}

export async function runTurn(args: RunTurnArgs): Promise<RunTurnResult> {
  return runTurnGemini(args);
}

export const GEMINI_DEFAULT_MODEL = "gemini-3-flash-preview";

export function newSessionId(): string {
  return crypto.randomUUID();
}
