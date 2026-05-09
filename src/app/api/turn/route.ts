import { NextRequest, NextResponse } from "next/server";
import { runTurn, newSessionId } from "@/lib/llm";
import { TurnResponseSchema } from "@/lib/dsl";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { message, action, payload, sessionId, model, grounded } = body as {
    message?: string;
    action?: string;
    payload?: Record<string, unknown>;
    sessionId?: string;
    model?: string;
    grounded?: boolean;
  };

  const sid = sessionId && sessionId.length > 0 ? sessionId : newSessionId();

  let prompt: string;
  if (action) {
    prompt = `ACTION: ${action}\nPAYLOAD: ${JSON.stringify(payload ?? {})}`;
  } else if (message) {
    prompt = message;
  } else {
    return NextResponse.json({ error: "missing message or action" }, { status: 400 });
  }

  const result = await runTurn({ provider: "gemini", prompt, sessionId: sid, model, grounded });

  if (result.error || !result.json) {
    return NextResponse.json(
      { error: result.error ?? "unknown error", raw: result.raw, durationMs: result.durationMs, sessionId: sid },
      { status: 500 }
    );
  }

  const parsed = TurnResponseSchema.safeParse(result.json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "schema validation failed",
        issues: parsed.error.issues,
        raw: result.json,
        durationMs: result.durationMs,
        sessionId: sid,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ...parsed.data,
    sessionId: sid,
    durationMs: result.durationMs,
    grounded: result.grounded ?? false,
    citations: result.citations ?? [],
  });
}
