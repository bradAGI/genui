"use client";
import { useState } from "react";
import { ChatInput } from "@/components/ChatInput";
import { Renderer } from "@/components/genui/Renderer";
import { RenderSkeleton, ThinkingDot } from "@/components/Skeleton";
import { Hero } from "@/components/Hero";
import { GroundingToggle } from "@/components/ProviderPicker";
import { RotateCcw, AlertTriangle } from "lucide-react";
import type { UINode } from "@/lib/dsl";

interface AgentState {
  ui?: UINode;
  caption?: string;
  durationMs?: number;
  grounded?: boolean;
  citations?: { title?: string; url: string }[];
  error?: string;
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string>("");
  const [grounded, setGrounded] = useState<boolean>(true);
  const [agent, setAgent] = useState<AgentState | null>(null);
  const [lastInput, setLastInput] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function send(input: { message?: string; action?: string; payload?: Record<string, unknown> }) {
    if (busy) return;
    setBusy(true);
    setLastInput(input.message ?? `▷ ${input.action}`);

    try {
      const res = await fetch("/api/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...input, sessionId, grounded }),
      });
      const data = await res.json();

      if (data.sessionId) setSessionId(data.sessionId);

      if (!res.ok) {
        setAgent({ error: data.error ?? `${res.status}` });
      } else {
        setAgent({
          ui: data.ui,
          caption: data.caption,
          durationMs: data.durationMs,
          grounded: data.grounded,
          citations: data.citations,
        });
      }
    } catch (e) {
      setAgent({ error: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setAgent(null);
    setLastInput("");
    setSessionId("");
  }

  const hasContent = agent !== null || busy;

  return (
    <main className="flex h-screen flex-col">
      <header className="flex shrink-0 items-center justify-between border-b bg-[var(--color-bg)]/80 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            aria-label="Home"
            className="-ml-1 inline-flex items-center gap-2 rounded-md px-1 py-0.5 transition hover:bg-[var(--color-surface-2)]"
          >
            <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
            <span className="text-sm font-semibold tracking-tight">GenUI</span>
            <span className="text-xs text-[var(--color-fg-muted)]">· agent-rendered</span>
          </button>
          {lastInput && (
            <span className="ml-3 hidden truncate max-w-[40vw] rounded-md bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[var(--color-fg-muted)] md:inline">
              {lastInput}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {sessionId && (
            <span className="hidden font-mono text-[10px] text-[var(--color-fg-muted)] md:inline">
              {sessionId.slice(0, 8)}
            </span>
          )}
          <GroundingToggle grounded={grounded} onToggle={setGrounded} disabled={busy} />
          {hasContent && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            >
              <RotateCcw className="h-3 w-3" /> new session
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8">
        <div className="mx-auto max-w-4xl">
          {!hasContent && (
            <div className="pt-12">
              <Hero onPick={(msg) => send({ message: msg })} />
            </div>
          )}

          {busy && (
            <div className="flex flex-col gap-3">
              <ThinkingDot />
              <RenderSkeleton />
            </div>
          )}

          {!busy && agent && <AgentView agent={agent} onAction={(a, p) => send({ action: a, payload: p })} />}
        </div>
      </div>

      {agent === null && (
        <div className="shrink-0 border-t bg-[var(--color-bg)]/95 px-4 py-3 backdrop-blur md:px-8">
          <div className="mx-auto max-w-4xl">
            <ChatInput
              onSend={(msg) => send({ message: msg })}
              busy={busy}
              placeholder="Describe what you want to see…"
            />
          </div>
        </div>
      )}
    </main>
  );
}

function AgentView({
  agent,
  onAction,
}: {
  agent: AgentState;
  onAction: (action: string, payload?: Record<string, unknown>) => void;
}) {
  if (agent.error) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="font-mono text-xs">{agent.error}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {agent.caption && (
        <div className="text-xs uppercase tracking-wider text-[var(--color-fg-muted)]">{agent.caption}</div>
      )}
      {agent.ui && <Renderer node={agent.ui} ctx={{ onAction, busy: false }} />}
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-[var(--color-fg-muted)]">
        {agent.durationMs && <span>rendered in {(agent.durationMs / 1000).toFixed(1)}s</span>}
        {agent.grounded && (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300">
            ● grounded · {agent.citations?.length ?? 0} sources
          </span>
        )}
        {agent.citations && agent.citations.length > 0 && (
          <details className="ml-1">
            <summary className="cursor-pointer hover:text-[var(--color-fg)]">sources</summary>
            <ul className="mt-1 ml-3 list-disc">
              {agent.citations.slice(0, 8).map((c, i) => (
                <li key={i}>
                  <a href={c.url} target="_blank" rel="noreferrer" className="text-[var(--color-accent)] hover:underline">
                    {c.title || c.url.replace(/^https?:\/\//, "").slice(0, 50)}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
