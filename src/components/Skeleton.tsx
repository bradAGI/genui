export function RenderSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="shimmer h-7 w-1/2 rounded-lg" />
      <div className="shimmer h-4 w-3/4 rounded" />
      <div className="grid grid-cols-3 gap-3 pt-2">
        <div className="shimmer h-28 rounded-xl" />
        <div className="shimmer h-28 rounded-xl" />
        <div className="shimmer h-28 rounded-xl" />
      </div>
      <div className="shimmer h-40 rounded-xl" />
    </div>
  );
}

export function ThinkingDot() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-[var(--color-fg-muted)]">
      <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
      <span>rendering…</span>
    </div>
  );
}
