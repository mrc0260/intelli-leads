import { intelliModelLLM } from "../llm/intelliModel.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { ZodSchema } from "zod";

// ─── JSON extraction helpers ──────────────────────────────────────────────────

/** Locate the start/end indices of the outermost JSON object or array in text. */
function findJsonBoundaries(text: string): [number, number, "obj" | "arr"] | null {
  const firstBraceIndex    = text.indexOf("{");
  const firstBracketIndex  = text.indexOf("[");
  const lastBraceIndex     = text.lastIndexOf("}");
  const lastBracketIndex   = text.lastIndexOf("]");

  const arrayComesFirst = firstBracketIndex !== -1 && (firstBraceIndex === -1 || firstBracketIndex < firstBraceIndex);
  if (arrayComesFirst)         return [firstBracketIndex, lastBracketIndex, "arr"];
  if (firstBraceIndex !== -1)  return [firstBraceIndex,   lastBraceIndex,   "obj"];
  return null;
}

/** Strip markdown code fences and parse the first JSON value found in the text. */
export function extractJson(text: string): unknown {
  const fenceMatch        = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidateText     = fenceMatch?.[1] ?? text;   // ?.[1] safely handles undefined under noUncheckedIndexedAccess
  const jsonBoundaries    = findJsonBoundaries(candidateText);
  if (!jsonBoundaries)    throw new Error("No JSON found in LLM response");
  return JSON.parse(candidateText.slice(jsonBoundaries[0], jsonBoundaries[1] + 1));
}

// ─── Shape normalisation helpers ──────────────────────────────────────────────

/** Unwrap `{ someWrapperKey: {...} }` → `{...}` when the LLM adds an outer wrapper key. */
export function unwrapIfNested(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return obj;
  const [onlyKey, ...remainingKeys] = Object.keys(obj as Record<string, unknown>);
  if (remainingKeys.length !== 0 || !onlyKey) return obj;  // must have exactly one key
  const innerValue = (obj as Record<string, unknown>)[onlyKey];
  return typeof innerValue === "object" && innerValue !== null && !Array.isArray(innerValue)
    ? innerValue
    : obj;
}

/** Return the first array found — handles `[...]`, `{topics:[...]}`, `{items:[...]}`, etc. */
export function extractArray(parsedResponse: unknown): unknown[] {
  if (Array.isArray(parsedResponse)) return parsedResponse;
  if (typeof parsedResponse === "object" && parsedResponse !== null) {
    for (const propertyValue of Object.values(parsedResponse as Record<string, unknown>))
      if (Array.isArray(propertyValue)) return propertyValue as unknown[];
  }
  throw new Error("Could not find an array in LLM response");
}

// ─── Retry orchestration ──────────────────────────────────────────────────────

/** Build the message array for IntelliModel, appending a correction message on retries. */
function buildIntelliModelMessages(systemPrompt: string, userInstruction: string, previousError: string | null) {
  return [
    new SystemMessage(systemPrompt),
    new HumanMessage(userInstruction),
    ...(previousError
      ? [new HumanMessage(`Previous attempt failed: ${previousError}. Please fix and retry.`)]
      : [])
  ];
}

/** Invoke IntelliModel once, extract JSON from the response, apply a transform, then validate via Zod. */
async function invokeIntelliModelAndValidate<T>(
  systemPrompt: string,
  userInstruction: string,
  schema: ZodSchema<T>,
  transformBeforeValidation: (parsedJson: unknown) => unknown,
  previousError: string | null
): Promise<T> {
  const intelliModelResponse      = await intelliModelLLM.invoke(buildIntelliModelMessages(systemPrompt, userInstruction, previousError));
  const responseText      = typeof intelliModelResponse.content === "string" ? intelliModelResponse.content : JSON.stringify(intelliModelResponse.content);
  const parsedJson        = extractJson(responseText);
  const transformedJson   = transformBeforeValidation(parsedJson);
  return schema.parse(transformedJson);
}

/**
 * Call IntelliModel with automatic retries, JSON extraction, shape normalisation, and Zod validation.
 * @param transformBeforeValidation  Optional function to reshape the parsed JSON before Zod validates it.
 */
export async function callIntelliModelWithRetry<T>(
  systemPrompt: string,
  userInstruction: string,
  schema: ZodSchema<T>,
  transformBeforeValidation: (parsedJson: unknown) => unknown = (parsedJson) => parsedJson,
  maxAttempts = 3
): Promise<T> {
  let previousError: string | null = null;

  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber++) {
    try {
      return await invokeIntelliModelAndValidate(systemPrompt, userInstruction, schema, transformBeforeValidation, previousError);
    } catch (invocationError: any) {
      console.warn(`[callIntelliModelWithRetry] Attempt ${attemptNumber} failed:`, invocationError.message);
      previousError = invocationError.message;
    }
  }

  throw new Error(`LLM call failed after ${maxAttempts} attempts: ${previousError}`);
}
