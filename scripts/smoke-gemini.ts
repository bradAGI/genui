import { runTurnGemini } from "../src/lib/providers/gemini";

async function main() {
  const sessionId = crypto.randomUUID();
  const prompt = process.argv[2] || "plan a 3-day tokyo trip for two on a $2k budget";

  console.log("PROMPT:", prompt);
  console.log("SESSION:", sessionId);
  console.log("GROUNDING:", process.env.GEMINI_GROUNDING ?? "false");

  const r = await runTurnGemini({ provider: "gemini", prompt, sessionId });
  console.log("DURATION:", r.durationMs, "ms");
  if (r.error) {
    console.log("ERROR:", r.error.slice(0, 600));
    console.log("RAW HEAD:", r.raw.slice(0, 500));
  } else {
    const ui = (r.json as { ui?: { type?: string } }).ui;
    console.log("CAPTION:", (r.json as { caption?: string }).caption);
    console.log("UI.TYPE:", ui?.type);
    console.log("GROUNDED:", r.grounded);
    console.log("CITATIONS:", r.citations?.length ?? 0);
    if (r.citations) {
      r.citations.slice(0, 5).forEach((c, i) =>
        console.log(`  [${i}] ${c.title || ""} — ${c.url}`)
      );
    }
    console.log("UI HEAD:", JSON.stringify(r.json).slice(0, 1500));
  }
}
main();
