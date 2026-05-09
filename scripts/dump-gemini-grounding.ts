// Dump raw Gemini grounded response so we can see where citations actually live.
async function main() {
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY required");

const res = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",
  {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "What are the top 3 AI papers trending this week? Just titles and URLs, brief." }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 1024 },
    }),
  }
);
const body = await res.json();
console.log("STATUS:", res.status);
console.log("CANDIDATE KEYS:", Object.keys(body.candidates?.[0] || {}));
const gm = body.candidates?.[0]?.groundingMetadata;
console.log("groundingMetadata keys:", gm ? Object.keys(gm) : "absent");
if (gm) {
  console.log("groundingChunks count:", gm.groundingChunks?.length ?? 0);
  console.log("groundingChunks[0]:", JSON.stringify(gm.groundingChunks?.[0]));
  console.log("groundingSupports count:", gm.groundingSupports?.length ?? 0);
  console.log("groundingSupports[0]:", JSON.stringify(gm.groundingSupports?.[0]));
  console.log("webSearchQueries:", JSON.stringify(gm.webSearchQueries));
  console.log("searchEntryPoint:", gm.searchEntryPoint ? Object.keys(gm.searchEntryPoint) : "absent");
}
console.log("--- TEXT FIRST 300 ---");
console.log(body.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 300));
}
main();
