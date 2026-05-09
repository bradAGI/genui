import { zodToJsonSchema } from "zod-to-json-schema";
import { TurnResponseSchema } from "./dsl";

// Anthropic's --json-schema requires the root object to declare `type: "object"`
// directly (not via $ref). Omitting `name` produces an inlined root schema with
// proper $ref references for recursive containers (e.g. items: {$ref: "#/properties/ui"}).
const raw = zodToJsonSchema(TurnResponseSchema, { target: "jsonSchema7" }) as Record<string, unknown>;
delete raw["$schema"];
export const turnJsonSchema = raw;
export const turnJsonSchemaString = JSON.stringify(turnJsonSchema);
