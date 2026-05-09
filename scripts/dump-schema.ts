import { zodToJsonSchema } from "zod-to-json-schema";
import { TurnResponseSchema } from "../src/lib/dsl";

const s = zodToJsonSchema(TurnResponseSchema, { target: "jsonSchema7" }) as Record<string, unknown>;
const json = JSON.stringify(s);
console.log("ROOT TYPE:", s.type);
console.log("ROOT $ref:", s.$ref);
console.log("HAS DEFS?", !!s.definitions);
console.log("LEN:", json.length);
console.log("EMPTY OBJECTS COUNT:", (json.match(/:\s*\{\}/g) || []).length);
console.log("$REF COUNT:", (json.match(/"\$ref":/g) || []).length);
const refs = json.match(/"\$ref":"[^"]+"/g) || [];
console.log("FIRST 5 REFS:", refs.slice(0, 5));
console.log("--- TAIL 600 ---");
console.log(json.slice(-600));
