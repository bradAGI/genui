"use client";
import { useState, useCallback, FormEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { UINode } from "@/lib/dsl";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import * as Icons from "lucide-react";
import type { LucideProps } from "lucide-react";

const PIE_COLORS = ["#ff6b35", "#ffa657", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6"];

export interface RendererContext {
  onAction: (action: string, payload?: Record<string, unknown>) => void;
  busy?: boolean;
}

interface FormState {
  values: Record<string, string | number | boolean>;
  setValue: (name: string, value: string | number | boolean) => void;
}

const FormStateContext = (() => {
  // Lightweight per-form context via closures — avoid React.createContext to keep this file small
  return null;
})();

export function Renderer({ node, ctx }: { node: UINode; ctx: RendererContext }) {
  return <NodeView node={node} ctx={ctx} formState={null} />;
}

function NodeView({
  node,
  ctx,
  formState,
}: {
  node: UINode;
  ctx: RendererContext;
  formState: FormState | null;
}): ReactNode {
  switch (node.type) {
    case "stack": {
      const dir = node.dir ?? "col";
      return (
        <div
          className={cn(
            "flex",
            dir === "col" ? "flex-col" : "flex-row",
            node.wrap && "flex-wrap",
            alignClass(node.align),
            justifyClass(node.justify)
          )}
          style={{ gap: `${(node.gap ?? 3) * 4}px` }}
        >
          {node.children.map((c, i) => (
            <NodeView key={c.id ?? i} node={c} ctx={ctx} formState={formState} />
          ))}
        </div>
      );
    }

    case "grid":
      return (
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${node.cols}, minmax(0, 1fr))`,
            gap: `${(node.gap ?? 4) * 4}px`,
          }}
        >
          {node.children.map((c, i) => (
            <NodeView key={c.id ?? i} node={c} ctx={ctx} formState={formState} />
          ))}
        </div>
      );

    case "card":
      return (
        <div
          className={cn(
            "rounded-2xl border bg-[var(--color-surface)] p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]",
            node.tone === "accent" && "border-[var(--color-accent)]/40 bg-gradient-to-br from-[var(--color-accent)]/10 to-transparent",
            node.tone === "muted" && "bg-[var(--color-surface-2)]"
          )}
        >
          {node.title && <div className="mb-1 text-base font-semibold tracking-tight">{node.title}</div>}
          {node.subtitle && (
            <div className="mb-3 text-sm text-[var(--color-fg-muted)]">{node.subtitle}</div>
          )}
          <div className="flex flex-col gap-3">
            {node.children.map((c, i) => (
              <NodeView key={c.id ?? i} node={c} ctx={ctx} formState={formState} />
            ))}
          </div>
        </div>
      );

    case "heading": {
      const sizes = {
        h1: "text-3xl font-semibold tracking-tight",
        h2: "text-2xl font-semibold tracking-tight",
        h3: "text-lg font-semibold",
      } as const;
      const cls = sizes[node.level];
      if (node.level === "h1") return <h1 className={cls}>{node.text}</h1>;
      if (node.level === "h2") return <h2 className={cls}>{node.text}</h2>;
      return <h3 className={cls}>{node.text}</h3>;
    }

    case "text":
      return <p className={cn("text-sm leading-relaxed", node.muted && "text-[var(--color-fg-muted)]")}>{node.text}</p>;

    case "markdown":
      return <MarkdownView content={node.content} />;

    case "badge":
      return (
        <span
          className={cn(
            "inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
            toneClass(node.tone)
          )}
        >
          {node.text}
        </span>
      );

    case "stat":
      return (
        <div className="flex flex-col gap-1">
          <div className="text-xs uppercase tracking-wider text-[var(--color-fg-muted)]">{node.label}</div>
          <div className="text-2xl font-semibold tracking-tight">{node.value}</div>
          {node.delta && (
            <div
              className={cn(
                "text-xs",
                node.tone === "positive" && "text-emerald-400",
                node.tone === "negative" && "text-rose-400",
                node.tone === "neutral" && "text-[var(--color-fg-muted)]"
              )}
            >
              {node.delta}
            </div>
          )}
        </div>
      );

    case "divider":
      return <hr className="border-[var(--color-border)]" />;

    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={node.src}
          alt={node.alt}
          className={cn("max-w-full", node.rounded !== false && "rounded-lg")}
          loading="lazy"
        />
      );

    case "html":
      return (
        <iframe
          sandbox="allow-same-origin"
          srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;color:#f4f4f5;background:transparent;font-family:ui-sans-serif,system-ui,sans-serif}</style></head><body>${node.content}</body></html>`}
          className="w-full rounded-lg border"
          style={{ height: node.height ?? 400, background: "transparent" }}
        />
      );

    case "button":
      return (
        <button
          type="button"
          onClick={() => ctx.onAction(node.action, node.payload)}
          disabled={ctx.busy}
          className={cn(
            "inline-flex w-fit items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
            buttonClass(node.variant)
          )}
        >
          {node.label}
        </button>
      );

    case "input":
      return (
        <label className="flex flex-col gap-1.5">
          {node.label && <span className="text-xs font-medium text-[var(--color-fg-muted)]">{node.label}</span>}
          <input
            type={node.inputType ?? "text"}
            name={node.name}
            placeholder={node.placeholder}
            defaultValue={node.value}
            onChange={(e) => formState?.setValue(node.name, e.target.value)}
            className="rounded-lg border bg-[var(--color-surface-2)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
          />
        </label>
      );

    case "textarea":
      return (
        <label className="flex flex-col gap-1.5">
          {node.label && <span className="text-xs font-medium text-[var(--color-fg-muted)]">{node.label}</span>}
          <textarea
            name={node.name}
            placeholder={node.placeholder}
            defaultValue={node.value}
            rows={node.rows ?? 3}
            onChange={(e) => formState?.setValue(node.name, e.target.value)}
            className="rounded-lg border bg-[var(--color-surface-2)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
          />
        </label>
      );

    case "select":
      return (
        <label className="flex flex-col gap-1.5">
          {node.label && <span className="text-xs font-medium text-[var(--color-fg-muted)]">{node.label}</span>}
          <select
            name={node.name}
            defaultValue={node.value}
            onChange={(e) => formState?.setValue(node.name, e.target.value)}
            className="rounded-lg border bg-[var(--color-surface-2)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
          >
            {node.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      );

    case "slider":
      return (
        <SliderControl node={node} formState={formState} />
      );

    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name={node.name}
            defaultChecked={node.checked}
            onChange={(e) => formState?.setValue(node.name, e.target.checked)}
            className="h-4 w-4 rounded border bg-[var(--color-surface-2)] accent-[var(--color-accent)]"
          />
          <span>{node.label}</span>
        </label>
      );

    case "form":
      return <FormView node={node} ctx={ctx} />;

    case "chart":
      return <ChartView node={node} />;

    case "table":
      return (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-2)] text-left">
              <tr>
                {node.headers.map((h) => (
                  <th key={h} className="px-3 py-2 font-medium text-[var(--color-fg-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {node.rows.map((row, i) => (
                <tr key={i} className="border-t">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "icon":
      return <IconView name={node.name} size={node.size} tone={node.tone} />;

    case "progress": {
      const max = node.max ?? 100;
      const pct = Math.max(0, Math.min(100, (node.value / max) * 100));
      return (
        <div className="flex flex-col gap-1.5">
          {node.label && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--color-fg-muted)]">{node.label}</span>
              <span className="font-mono">{Math.round(pct)}%</span>
            </div>
          )}
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
            <div
              className={cn("h-full rounded-full transition-all", progressClass(node.tone))}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      );
    }

    case "tabs":
      return <TabsView node={node} ctx={ctx} formState={formState} />;

    case "modal":
      return <ModalView node={node} ctx={ctx} formState={formState} />;

    default: {
      const exhaustive: never = node;
      void exhaustive;
      return <div className="text-rose-400 text-xs">unknown node</div>;
    }
  }
}

function FormView({ node, ctx }: { node: Extract<UINode, { type: "form" }>; ctx: RendererContext }) {
  const [values, setValues] = useState<Record<string, string | number | boolean>>(() =>
    collectInitialValues(node.children)
  );
  const setValue = useCallback((name: string, value: string | number | boolean) => {
    setValues((v) => ({ ...v, [name]: value }));
  }, []);
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ctx.onAction(node.action, values);
  };
  const formState: FormState = { values, setValue };
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {node.children.map((c, i) => (
        <NodeView key={c.id ?? i} node={c} ctx={ctx} formState={formState} />
      ))}
      <button
        type="submit"
        disabled={ctx.busy}
        className={cn("mt-1 inline-flex w-fit items-center rounded-lg px-4 py-2 text-sm font-medium", buttonClass("primary"))}
      >
        {node.submitLabel ?? "Submit"}
      </button>
    </form>
  );
}

function SliderControl({
  node,
  formState,
}: {
  node: Extract<UINode, { type: "slider" }>;
  formState: FormState | null;
}) {
  const [val, setVal] = useState<number>(node.value);
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[var(--color-fg-muted)]">{node.label}</span>
        <span className="font-mono text-[var(--color-fg)]">
          {val}{node.unit ? ` ${node.unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={node.min}
        max={node.max}
        step={node.step ?? 1}
        defaultValue={node.value}
        onChange={(e) => {
          const n = Number(e.target.value);
          setVal(n);
          formState?.setValue(node.name, n);
        }}
        className="accent-[var(--color-accent)]"
      />
    </label>
  );
}

function ChartView({ node }: { node: Extract<UINode, { type: "chart" }> }) {
  return (
    <div className="flex flex-col gap-2">
      {node.title && <div className="text-sm font-medium">{node.title}</div>}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartInner(node)}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function chartInner(node: Extract<UINode, { type: "chart" }>) {
  const tickStyle = { fill: "#a1a1aa", fontSize: 11 };
  const tooltipStyle = { background: "#1c1c21", border: "1px solid #2a2a31", borderRadius: 8, color: "#f4f4f5" };
  if (node.kind === "bar") {
    return (
      <BarChart data={node.data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a31" />
        <XAxis dataKey="label" tick={tickStyle} />
        <YAxis tick={tickStyle} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="value" fill="#ff6b35" radius={[6, 6, 0, 0]} />
      </BarChart>
    );
  }
  if (node.kind === "line") {
    return (
      <LineChart data={node.data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a31" />
        <XAxis dataKey="label" tick={tickStyle} />
        <YAxis tick={tickStyle} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="value" stroke="#ff6b35" strokeWidth={2} dot={{ fill: "#ff6b35" }} />
      </LineChart>
    );
  }
  if (node.kind === "area") {
    return (
      <AreaChart data={node.data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a31" />
        <XAxis dataKey="label" tick={tickStyle} />
        <YAxis tick={tickStyle} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="value" stroke="#ff6b35" fill="#ff6b35" fillOpacity={0.3} />
      </AreaChart>
    );
  }
  return (
    <PieChart>
      <Pie data={node.data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={90} paddingAngle={2}>
        {node.data.map((_, i) => (
          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
        ))}
      </Pie>
      <Tooltip contentStyle={tooltipStyle} />
    </PieChart>
  );
}

function TabsView({
  node,
  ctx,
  formState,
}: {
  node: Extract<UINode, { type: "tabs" }>;
  ctx: RendererContext;
  formState: FormState | null;
}) {
  const [active, setActive] = useState(node.defaultIndex ?? 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 border-b">
        {node.tabs.map((t, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm transition",
              i === active
                ? "border-[var(--color-accent)] text-[var(--color-fg)]"
                : "border-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {node.tabs[active]?.children.map((c, i) => (
          <NodeView key={c.id ?? i} node={c} ctx={ctx} formState={formState} />
        ))}
      </div>
    </div>
  );
}

function ModalView({
  node,
  ctx,
  formState,
}: {
  node: Extract<UINode, { type: "modal" }>;
  ctx: RendererContext;
  formState: FormState | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        <NodeView node={node.trigger} ctx={ctx} formState={formState} />
      </div>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border bg-[var(--color-surface)] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {node.title && <div className="mb-3 text-base font-semibold">{node.title}</div>}
            <div className="flex flex-col gap-3">
              {node.children.map((c, i) => (
                <NodeView key={c.id ?? i} node={c} ctx={ctx} formState={formState} />
              ))}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-lg border px-3 py-2 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function IconView({ name, size, tone }: { name: string; size?: number; tone?: string }) {
  const pascal = name
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  const Component = (Icons as unknown as Record<string, React.ComponentType<LucideProps>>)[pascal];
  if (!Component) return <span className="text-xs text-[var(--color-fg-muted)]">[{name}]</span>;
  return <Component size={size ?? 18} className={iconToneClass(tone)} />;
}

function iconToneClass(tone?: string) {
  switch (tone) {
    case "accent": return "text-[var(--color-accent)]";
    case "muted": return "text-[var(--color-fg-muted)]";
    case "success": return "text-emerald-400";
    case "warn": return "text-amber-400";
    case "danger": return "text-rose-400";
    default: return "text-[var(--color-fg)]";
  }
}

function progressClass(tone?: string) {
  switch (tone) {
    case "success": return "bg-emerald-500";
    case "warn": return "bg-amber-500";
    case "danger": return "bg-rose-500";
    case "accent": return "bg-[var(--color-accent)]";
    default: return "bg-[var(--color-accent)]";
  }
}

function MarkdownView({ content }: { content: string }) {
  // Tiny inline markdown — bold, italic, code, links, line breaks. Keep it lean.
  const html = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-[var(--color-surface-2)] px-1 py-0.5 font-mono text-xs">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[var(--color-accent)] underline">$1</a>')
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");
  return <div className="text-sm leading-relaxed [&_p]:mb-2" dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }} />;
}

function collectInitialValues(nodes: UINode[]): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  const walk = (n: UINode) => {
    if (n.type === "input" || n.type === "textarea") out[n.name] = n.value ?? "";
    else if (n.type === "select") out[n.name] = n.value ?? n.options[0]?.value ?? "";
    else if (n.type === "slider") out[n.name] = n.value;
    else if (n.type === "checkbox") out[n.name] = n.checked ?? false;
    else if ("children" in n && Array.isArray(n.children)) n.children.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}

function alignClass(a?: string) {
  return a === "center" ? "items-center" : a === "end" ? "items-end" : a === "stretch" ? "items-stretch" : "items-start";
}
function justifyClass(j?: string) {
  return j === "center" ? "justify-center" : j === "end" ? "justify-end" : j === "between" ? "justify-between" : "justify-start";
}
function toneClass(tone?: string) {
  switch (tone) {
    case "success": return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
    case "warn": return "bg-amber-500/10 text-amber-300 border-amber-500/30";
    case "danger": return "bg-rose-500/10 text-rose-300 border-rose-500/30";
    case "info": return "bg-sky-500/10 text-sky-300 border-sky-500/30";
    default: return "bg-[var(--color-surface-2)] text-[var(--color-fg-muted)]";
  }
}
function buttonClass(v?: string) {
  switch (v) {
    case "secondary": return "bg-[var(--color-surface-2)] text-[var(--color-fg)] border hover:bg-[var(--color-surface)]";
    case "ghost": return "bg-transparent text-[var(--color-fg)] hover:bg-[var(--color-surface-2)]";
    case "destructive": return "bg-rose-500/90 text-white hover:bg-rose-500";
    default: return "bg-[var(--color-accent)] text-black hover:bg-[var(--color-accent-2)]";
  }
}
