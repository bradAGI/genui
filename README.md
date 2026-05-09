# GenUI · agent-rendered interfaces

![Generative UI hero banner](public/banner.jpg)

A web app where every screen is generated at runtime by Gemini 3 Flash.
There are no pre-built pages — you type, the model renders the UI for the moment.

## The app

![Landing screen](public/screenshot.png)

## A single prompt → a full interactive UI

Prompt: *"Plan a 3-day Tokyo trip for two on a $2k budget."* (10 seconds, 41 nodes:
heading, 4 stat tiles, 3-tab dayplanner, 6 cards, badges, pie chart, slider,
recalculate-plan form — all generated.)

![Rendered Tokyo demo](public/screenshot-rendered.png)

### Tested demo prompts (all 6 from the hero)

| Prompt | Nodes | Rich/Text | Latency |
|---|---|---|---|
| Plan a 3-day Tokyo trip | 41 | 30 / 7 | 9.5s |
| Decide between three job offers | 37 | 28 / 1 | 17.3s |
| Triage my overwhelming day | 31 | 22 / 2 | 14.7s |
| Workout tracker for chest day | 33 | 23 / 0 | 9.9s |
| Year-end Spotify recap | 27 | 19 / 1 | 9.5s |
| Rust study dashboard | 37 | 28 / 3 | 11.5s |

Avg: **25 rich components** vs **2.3 text nodes** per turn.

Built for the **Generative UI Global Hackathon** (track: *No Designer, No Problem*).

## How it works

1. The user types a request (or clicks a generated button).
2. `/api/turn` spawns `claude -p --bare --json-schema <UI-DSL> --resume <session-id>`.
3. Claude returns a JSON tree of UI nodes constrained to the DSL.
4. The client renders the tree via a small React registry.
5. Buttons and form submits POST back to `/api/turn` with their action + payload;
   claude is resumed in the same session and renders the next screen.

The DSL covers ~16 node types (stack, grid, card, heading, text, badge, stat, button,
input, textarea, select, slider, checkbox, form, chart, table, image, markdown, divider).
For anything the DSL can't express, claude can drop a `{type:"html"}` node rendered
in a sandboxed iframe — the open-generative-UI escape hatch.

## Stack

- Next.js 15 (App Router) + React 19
- Tailwind v4
- Recharts (charts)
- `claude` CLI (Claude Code in `--bare --print` mode)
- Zod → JSON Schema → `claude --json-schema` for structured output

No CopilotKit, no Postgres, no Redis. The CLI is the runtime.

## Run

```bash
npm install
npm run dev
# open http://localhost:3010
```

**Requirements**

- `claude` CLI on PATH, logged in (Anthropic subscription via `claude auth` or `ANTHROPIC_API_KEY` in env).
- Optional: `GEMINI_API_KEY` in `.env` to use the Gemini provider toggle (defaults to `gemini-3-flash-preview`).

The route uses `--dangerously-skip-permissions` and `--tools ""` together — all tools are
disabled, so claude is constrained to producing JSON output only. No filesystem access, no shell.

## Where does the data come from?

| Mode | Source | Latency | Citations |
|---|---|---|---|
| **Claude (default)** | Model knowledge — trained on web data through claude's cutoff. | ~30–80s for rich UIs. | none |
| **Gemini (default)** | Model knowledge — gemini-3-flash-preview's training data. | ~5–10s. | none |
| **Gemini + grounding** | Live Google Search results, fetched per turn. | +2-3s. | yes, shown in UI |

For "real" data, set `GEMINI_GROUNDING=true` and use Gemini. The agent will ground its
UI in actual current web results and surface citations under each rendered turn. Without
grounding, both providers happily hallucinate plausible-looking data ("Shibuya Sky tickets — $40")
based on training. That's fine for demos; it's not fine for booking.

## Files

- `src/lib/dsl.ts` — Zod DSL (single source of truth) + alias coercion for model drift
- `src/lib/json-schema.ts` — JSON Schema export (currently unused — see note below)
- `src/lib/system-prompt.ts` — the prompt that teaches the model the DSL
- `src/lib/extract-json.ts` — robust JSON extractor for occasional model drift
- `src/lib/llm.ts` — provider abstraction
- `src/lib/providers/claude.ts` — spawn wrapper around `claude -p`
- `src/lib/providers/gemini.ts` — fetch wrapper around Gemini API
- `src/app/api/turn/route.ts` — server route (one round-trip per turn)
- `src/components/genui/Renderer.tsx` — recursive React renderer
- `src/components/ChatInput.tsx` — bottom input
- `src/components/ProviderPicker.tsx` — header model toggle
- `src/components/Hero.tsx` — landing-screen demo prompts
- `scripts/smoke-claude.ts`, `scripts/smoke-gemini.ts` — provider smoke tests

> **Note on `--json-schema`.** The claude CLI's `--json-schema` flag turned out to be
> soft validation, not enforcement. It silently accepted prose responses. We instead use
> a strict system prompt + `extractJson` fallback + Zod validation at the boundary.
> Same path works for Gemini (whose `responseSchema` is OpenAPI-3, no `$ref`, no recursion).
