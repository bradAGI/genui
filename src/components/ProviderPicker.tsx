"use client";
import { Globe, Database } from "lucide-react";
import { cn } from "@/lib/cn";

export function GroundingToggle({
  grounded,
  onToggle,
  disabled,
}: {
  grounded: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(!grounded)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border bg-[var(--color-surface)] px-2 py-1 text-xs transition disabled:opacity-50",
        grounded
          ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
          : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
      )}
      title={grounded ? "Live web grounding ON" : "Click to enable Google Search grounding"}
    >
      {grounded ? <Globe className="h-3 w-3" /> : <Database className="h-3 w-3" />}
      <span>{grounded ? "live web" : "model only"}</span>
    </button>
  );
}
