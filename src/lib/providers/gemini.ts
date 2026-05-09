import { SYSTEM_PROMPT } from "../system-prompt";
import { extractJson } from "../extract-json";
import type { RunTurnArgs, RunTurnResult } from "../llm";

interface GeminiContent {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

// In-memory session store. Good enough for hackathon; resets on server reload.
const SESSIONS = new Map<string, GeminiContent[]>();

// Default grounding state. Per-request override via args.grounded.
const GROUNDING_DEFAULT = (process.env.GEMINI_GROUNDING ?? "false").toLowerCase() === "true";

// We deliberately do NOT use Gemini's responseSchema. Two reasons:
//   1. It's an OpenAPI 3 subset that doesn't support $ref, so recursion collapses.
//   2. Stripping $ref to make it accept the schema also collapses recursion.
// Instead we rely on the strict system prompt + JSON extraction. Tradeoff: a tiny
// risk of malformed output that fails Zod validation at the route boundary. Wins:
// full DSL recursion, faster (no schema parser), and consistent behavior with the
// grounding mode (which can't use responseSchema anyway).

export async function runTurnGemini(args: RunTurnArgs & { grounded?: boolean }): Promise<RunTurnResult> {
  const start = Date.now();
  const groundingEnabled = args.grounded ?? GROUNDING_DEFAULT;
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return {
      json: null,
      raw: "",
      durationMs: 0,
      error: "GEMINI_API_KEY (or GOOGLE_API_KEY) not set in env",
    };
  }
  const model = args.model ?? "gemini-3-flash-preview";

  const history = SESSIONS.get(args.sessionId) ?? [];
  const next: GeminiContent[] = [...history, { role: "user", parts: [{ text: args.prompt }] }];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const groundingDirective = `\n\n# Grounding mode is ENABLED\n\nThe google_search tool is available. Before producing your JSON response:\n1. If the user's request involves anything time-sensitive, factual, or current ("today", "now", "latest", "trending", real names, real companies, current prices, recent events), call google_search FIRST to ground your answer in live web data.\n2. Use the search results to fill the UI with real, current values — not training-data fallbacks.\n3. After searching, produce the JSON UI as specified above. Search-then-render, in that order.\n\nDo not skip the search for current-data requests. Searching costs nothing; rendering stale data costs the demo.`;
  const systemText = groundingEnabled ? SYSTEM_PROMPT + groundingDirective : SYSTEM_PROMPT;

  const requestBody: Record<string, unknown> = {
    systemInstruction: { role: "system", parts: [{ text: systemText }] },
    contents: next,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  };

  if (groundingEnabled) {
    requestBody.tools = [{ google_search: {} }];
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });
  } catch (e) {
    return { json: null, raw: "", durationMs: Date.now() - start, error: (e as Error).message };
  }

  const durationMs = Date.now() - start;
  const text = await res.text();

  if (!res.ok) {
    return { json: null, raw: text, durationMs, error: `gemini ${res.status}: ${text.slice(0, 400)}` };
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch (e) {
    return { json: null, raw: text, durationMs, error: `gemini JSON parse: ${(e as Error).message}` };
  }

  const candidate = (body as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      groundingMetadata?: {
        groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
        webSearchQueries?: string[];
      };
    }>;
  })?.candidates?.[0];
  const inner = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!inner) {
    return { json: null, raw: text, durationMs, error: "gemini returned no text content" };
  }
  const chunks = candidate?.groundingMetadata?.groundingChunks ?? [];
  const citations = chunks
    .map((c) => c.web)
    .filter((w): w is { uri: string; title?: string } => !!w?.uri)
    .map((w) => ({ title: w.title, url: w.uri }));
  if (process.env.GEMINI_DEBUG === "true") {
    console.log("[gemini] grounding chunks:", chunks.length);
    console.log("[gemini] webSearchQueries:", candidate?.groundingMetadata?.webSearchQueries);
  }

  const parsed = extractJson(inner);
  if (!parsed) {
    return { json: null, raw: inner, durationMs, error: "could not extract JSON from gemini response" };
  }

  SESSIONS.set(args.sessionId, [
    ...next,
    { role: "model", parts: [{ text: inner }] },
  ]);

  return {
    json: parsed,
    raw: inner,
    durationMs,
    grounded: groundingEnabled,
    citations: groundingEnabled ? citations : undefined,
  };
}

