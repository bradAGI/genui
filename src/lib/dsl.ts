import { z } from "zod";

const baseProps = { id: z.string().optional() };

// Coerce common model-output drift to the canonical field names.
// Models occasionally pick close-but-wrong names (e.g. `direction` instead of
// `dir`); fixing once here is cheaper than fighting the prompt.
function coerceAliases(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const o = input as Record<string, unknown>;
  if (o.type === "text" && typeof o.markdown === "string" && typeof o.text !== "string") {
    return { ...o, text: o.markdown };
  }
  if (o.type === "badge" && typeof o.label === "string" && typeof o.text !== "string") {
    return { ...o, text: o.label };
  }
  if (o.type === "stack" && typeof o.direction === "string" && typeof o.dir !== "string") {
    return { ...o, dir: o.direction };
  }
  if (o.type === "grid" && typeof o.columns === "number" && typeof o.cols !== "number") {
    return { ...o, cols: o.columns };
  }
  if (o.type === "heading" && typeof o.level === "number") {
    return { ...o, level: `h${o.level}` };
  }
  if (o.type === "stat") {
    const m = STAT_TONE_ALIAS[String(o.tone ?? "")];
    if (m) return { ...o, tone: m };
  }
  if (o.type === "card") {
    const t = String(o.tone ?? "");
    if (t && !CARD_TONE_VALID.has(t)) {
      return { ...o, tone: CARD_TONE_ALIAS[t] ?? "default" };
    }
  }
  if (o.type === "badge") {
    const t = String(o.tone ?? "");
    if (t && !BADGE_TONE_VALID.has(t)) {
      return { ...o, tone: BADGE_TONE_ALIAS[t] ?? "neutral" };
    }
  }
  if (o.type === "button" && typeof o.action !== "string") {
    return { ...o, action: typeof o.label === "string" ? `click:${o.label.toLowerCase().replace(/\s+/g, "_")}` : "click" };
  }
  if (o.type === "icon" && typeof o.name !== "string") {
    return { ...o, name: "circle" };
  }
  return o;
}

const STAT_TONE_ALIAS: Record<string, string> = {
  success: "positive", good: "positive", up: "positive", info: "neutral",
  warn: "negative", warning: "negative", danger: "negative", bad: "negative", down: "negative",
};
const CARD_TONE_VALID = new Set(["default", "accent", "muted"]);
const CARD_TONE_ALIAS: Record<string, string> = {
  primary: "accent", success: "accent", info: "default", warn: "muted", danger: "muted", neutral: "default",
};
const BADGE_TONE_VALID = new Set(["info", "success", "warn", "danger", "neutral"]);
const BADGE_TONE_ALIAS: Record<string, string> = {
  primary: "info", positive: "success", negative: "danger", warning: "warn", error: "danger", default: "neutral",
};

// ---------------- Recursive type ----------------

export type UINode =
  | { id?: string; type: "heading"; level: "h1" | "h2" | "h3"; text: string }
  | { id?: string; type: "text"; text: string; muted?: boolean }
  | { id?: string; type: "markdown"; content: string }
  | { id?: string; type: "badge"; text: string; tone?: "info" | "success" | "warn" | "danger" | "neutral" }
  | { id?: string; type: "stat"; label: string; value: string; delta?: string; tone?: "positive" | "negative" | "neutral" }
  | { id?: string; type: "divider" }
  | { id?: string; type: "image"; src: string; alt: string; rounded?: boolean }
  | {
      id?: string;
      type: "button";
      label: string;
      action: string;
      payload?: Record<string, string | number | boolean>;
      variant?: "primary" | "secondary" | "ghost" | "destructive";
    }
  | { id?: string; type: "input"; name: string; label?: string; placeholder?: string; value?: string; inputType?: "text" | "number" | "email" | "url" | "password" }
  | { id?: string; type: "textarea"; name: string; label?: string; placeholder?: string; value?: string; rows?: number }
  | { id?: string; type: "select"; name: string; label?: string; value?: string; options: { label: string; value: string }[] }
  | { id?: string; type: "slider"; name: string; label?: string; min: number; max: number; step?: number; value: number; unit?: string }
  | { id?: string; type: "checkbox"; name: string; label: string; checked?: boolean }
  | { id?: string; type: "chart"; kind: "bar" | "line" | "pie" | "area"; title?: string; data: { label: string; value: number }[] }
  | { id?: string; type: "table"; headers: string[]; rows: string[][] }
  | { id?: string; type: "html"; content: string; height?: number }
  | { id?: string; type: "icon"; name: string; size?: number; tone?: "default" | "accent" | "muted" | "success" | "warn" | "danger" }
  | { id?: string; type: "progress"; value: number; max?: number; label?: string; tone?: "default" | "accent" | "success" | "warn" | "danger" }
  | { id?: string; type: "stack"; dir?: "row" | "col"; gap?: number; align?: "start" | "center" | "end" | "stretch"; justify?: "start" | "center" | "end" | "between"; wrap?: boolean; children: UINode[] }
  | { id?: string; type: "card"; title?: string; subtitle?: string; tone?: "default" | "accent" | "muted"; children: UINode[] }
  | { id?: string; type: "form"; action: string; submitLabel?: string; children: UINode[] }
  | { id?: string; type: "grid"; cols: number; gap?: number; children: UINode[] }
  | { id?: string; type: "tabs"; defaultIndex?: number; tabs: { label: string; children: UINode[] }[] }
  | { id?: string; type: "modal"; trigger: UINode; title?: string; children: UINode[] };

// Forward-declared lazy ref for container children. Resolves to nodeSchema (defined below).
// Cast to ZodType<UINode> because z.preprocess wraps the discriminated union in
// ZodEffects, which has a slightly different (but compatible) generic signature.
const nodeRef = z.lazy(() => nodeSchema) as unknown as z.ZodType<UINode>;

// ---------------- Leaf schemas ----------------

const headingS = z.object({
  ...baseProps,
  type: z.literal("heading"),
  level: z.enum(["h1", "h2", "h3"]),
  text: z.string(),
});

const textS = z.object({
  ...baseProps,
  type: z.literal("text"),
  text: z.string(),
  muted: z.boolean().optional(),
});

const markdownS = z.object({
  ...baseProps,
  type: z.literal("markdown"),
  content: z.string(),
});

const badgeS = z.object({
  ...baseProps,
  type: z.literal("badge"),
  text: z.string(),
  tone: z.enum(["info", "success", "warn", "danger", "neutral"]).optional(),
});

const statS = z.object({
  ...baseProps,
  type: z.literal("stat"),
  label: z.string(),
  value: z.string(),
  delta: z.string().optional(),
  tone: z.enum(["positive", "negative", "neutral"]).optional(),
});

const dividerS = z.object({
  ...baseProps,
  type: z.literal("divider"),
});

const imageS = z.object({
  ...baseProps,
  type: z.literal("image"),
  src: z.string(),
  alt: z.string(),
  rounded: z.boolean().optional(),
});

const buttonS = z.object({
  ...baseProps,
  type: z.literal("button"),
  label: z.string(),
  action: z.string().describe("Free-text intent string sent back to the agent when clicked."),
  payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  variant: z.enum(["primary", "secondary", "ghost", "destructive"]).optional(),
});

const inputS = z.object({
  ...baseProps,
  type: z.literal("input"),
  name: z.string(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  value: z.string().optional(),
  inputType: z.enum(["text", "number", "email", "url", "password"]).optional(),
});

const textareaS = z.object({
  ...baseProps,
  type: z.literal("textarea"),
  name: z.string(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  value: z.string().optional(),
  rows: z.number().optional(),
});

const selectS = z.object({
  ...baseProps,
  type: z.literal("select"),
  name: z.string(),
  label: z.string().optional(),
  value: z.string().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })),
});

const sliderS = z.object({
  ...baseProps,
  type: z.literal("slider"),
  name: z.string(),
  label: z.string().optional(),
  min: z.number(),
  max: z.number(),
  step: z.number().optional(),
  value: z.number(),
  unit: z.string().optional(),
});

const checkboxS = z.object({
  ...baseProps,
  type: z.literal("checkbox"),
  name: z.string(),
  label: z.string(),
  checked: z.boolean().optional(),
});

const chartS = z.object({
  ...baseProps,
  type: z.literal("chart"),
  kind: z.enum(["bar", "line", "pie", "area"]),
  title: z.string().optional(),
  data: z.array(z.object({ label: z.string(), value: z.number() })),
});

const tableS = z.object({
  ...baseProps,
  type: z.literal("table"),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

const htmlS = z.object({
  ...baseProps,
  type: z.literal("html"),
  content: z.string().describe("Raw HTML rendered in a sandboxed iframe."),
  height: z.number().optional(),
});

const iconS = z.object({
  ...baseProps,
  type: z.literal("icon"),
  name: z.string().describe("Lucide icon name in kebab-case, e.g. 'check', 'arrow-right', 'sparkles'."),
  size: z.number().optional(),
  tone: z.enum(["default", "accent", "muted", "success", "warn", "danger"]).optional(),
});

const progressS = z.object({
  ...baseProps,
  type: z.literal("progress"),
  value: z.number(),
  max: z.number().optional(),
  label: z.string().optional(),
  tone: z.enum(["default", "accent", "success", "warn", "danger"]).optional(),
});

// ---------------- Container schemas (lazy children) ----------------

const stackS = z.object({
  ...baseProps,
  type: z.literal("stack"),
  dir: z.enum(["row", "col"]).optional(),
  gap: z.number().optional(),
  align: z.enum(["start", "center", "end", "stretch"]).optional(),
  justify: z.enum(["start", "center", "end", "between"]).optional(),
  wrap: z.boolean().optional(),
  children: z.array(nodeRef),
});

const cardS = z.object({
  ...baseProps,
  type: z.literal("card"),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  tone: z.enum(["default", "accent", "muted"]).optional(),
  children: z.array(nodeRef),
});

const formS = z.object({
  ...baseProps,
  type: z.literal("form"),
  action: z.string(),
  submitLabel: z.string().optional(),
  children: z.array(nodeRef),
});

const gridS = z.object({
  ...baseProps,
  type: z.literal("grid"),
  cols: z.number(),
  gap: z.number().optional(),
  children: z.array(nodeRef),
});

const tabsS = z.object({
  ...baseProps,
  type: z.literal("tabs"),
  defaultIndex: z.number().optional(),
  tabs: z.array(z.object({ label: z.string(), children: z.array(nodeRef) })),
});

const modalS = z.object({
  ...baseProps,
  type: z.literal("modal"),
  trigger: nodeRef,
  title: z.string().optional(),
  children: z.array(nodeRef),
});

// ---------------- Union ----------------

const nodeSchema = z.preprocess(
  coerceAliases,
  z.discriminatedUnion("type", [
    headingS, textS, markdownS, badgeS, statS, dividerS, imageS,
    buttonS, inputS, textareaS, selectS, sliderS, checkboxS,
    chartS, tableS, htmlS, iconS, progressS,
    stackS, cardS, formS, gridS, tabsS, modalS,
  ])
);

export const UINodeSchema: z.ZodType<UINode> = nodeRef;

export const TurnResponseSchema = z.object({
  ui: nodeRef,
  caption: z.string().optional().describe("Optional one-line caption shown above the rendered UI."),
});

export type TurnResponse = z.infer<typeof TurnResponseSchema>;
