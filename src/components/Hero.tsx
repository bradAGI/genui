"use client";
import { Sparkles, Database, Globe } from "lucide-react";

const DEMOS = [
  "Plan a 3-day Tokyo trip for two on a $2k budget",
  "Help me decide between three job offers I'll describe",
  "I'm overwhelmed — help me triage my day",
  "Build me a workout tracker for chest day",
  "Show me a year-end recap of a fictional Spotify listener",
  "I want to learn rust — give me a study dashboard",
];

export function Hero({ onPick }: { onPick: (msg: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border bg-[var(--color-surface-2)] px-3 py-1 text-xs text-[var(--color-fg-muted)]">
          <Sparkles className="h-3 w-3 text-[var(--color-accent)]" />
          generative ui · agent-rendered at runtime
        </div>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
          The agent <span className="text-[var(--color-accent)]">is</span> the frontend.
        </h1>
        <p className="max-w-xl text-sm text-[var(--color-fg-muted)] md:text-base">
          Type anything. The model renders the exact interface for the moment — buttons, forms,
          charts, whatever fits. There are no pre-built pages.
        </p>
      </div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-2 md:grid-cols-2">
        {DEMOS.map((d) => (
          <button
            key={d}
            onClick={() => onPick(d)}
            className="rounded-xl border bg-[var(--color-surface)] px-4 py-3 text-left text-sm transition hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-surface-2)]"
          >
            {d}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-2 text-xs text-[var(--color-fg-muted)]">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <Database className="h-3 w-3" /> model knowledge
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Globe className="h-3 w-3 text-emerald-400" /> live web search (toggle in header)
          </span>
        </div>
        <span className="opacity-70">
          Powered by Gemini 3 Flash with Google Search grounding on by default. Toggle in the header.
        </span>
      </div>
    </div>
  );
}
