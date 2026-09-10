import type { ResearchState } from "../graph/state.js";
import type { SuggestResult } from "../schemas/search-query.js";
import { TopicsSchema, type Topic } from "../schemas/topic.js";
import { DISCOVER_TOPICS_PROMPT } from "../prompts/discover-topics.js";
import { callIntelliModelWithRetry, extractArray } from "../llm/llm-utils.js";

// ─── Prompt builders ──────────────────────────────────────────────────────────

/** Format all suggest results into a readable block to include in the LLM prompt. */
function formatSuggestResultsForPrompt(suggestResults: SuggestResult[]): string {
  return suggestResults.map((result) => {
    const googleLines  = result.googleSuggests.map((s) => `  - ${s}`).join("\n");
    const bingLines    = result.bingSuggests.map((s) => `  - ${s}`).join("\n");
    const youtubeLines = result.youtubeSuggests.map((s) => `  - ${s}`).join("\n");
    return [
      `Query: "${result.query}"`,
      `Google Suggest:\n${googleLines || "  (no results)"}`,
      `Bing Suggest:\n${bingLines    || "  (no results)"}`,
      `YouTube Suggest:\n${youtubeLines || "  (no results)"}`,
    ].join("\n");
  }).join("\n\n---\n\n");
}

/** Build the full system prompt, injecting target customer and suggest data. */
function buildEnrichedTopicPrompt(
  userInput: string,
  targetCustomer: unknown,
  suggestResultsText: string
): string {
  return DISCOVER_TOPICS_PROMPT
    .replace("{userInput}", userInput)
    .replace("{targetCustomer}", JSON.stringify(targetCustomer, null, 2))
    + `\n\nAUTOCOMPLETE RESEARCH DATA\n\nThe following autocomplete suggestions were collected from Google, Bing, and YouTube.\nUse these as evidence of what real people are actually searching for.\nPrioritise topics that appear across multiple engines and multiple query variations.\n\n${suggestResultsText}`;
}

// ─── IntelliModel output normalisation ────────────────────────────────────────────────
// IntelliModel uses inconsistent field names across runs.
// This function maps every known alias to the canonical field name so Zod
// never receives undefined fields regardless of what IntelliModel decided to call them.

const VALID_CATEGORIES = new Set([
  "problem", "pain", "workflow", "question", "event",
  "frustration", "tool", "trend", "regulation", "other",
]);

/** Pick the first defined value from a list of candidate field names on an object. */
function pickField(raw: Record<string, any>, ...candidates: string[]): any {
  for (const fieldName of candidates) {
    if (raw[fieldName] !== undefined && raw[fieldName] !== null) return raw[fieldName];
  }
  return undefined;
}

/** Coerce a value to a 0–1 float, falling back to defaultValue if not parseable. */
function coerceFloat(value: unknown, defaultValue: number): number {
  const parsed = parseFloat(String(value));
  return isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : defaultValue;
}

/** Coerce a value to a string array, handling strings, nulls, and missing values. */
function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

/**
 * Normalise one raw IntelliModel topic object into the shape the TopicSchema expects.
 * Handles all known field-name aliases IntelliModel has been observed to use.
 */
function normaliseIntelliModelTopicItem(raw: any): Record<string, unknown> {
  // If IntelliModel returns strings instead of objects, coerce the string into an object
  if (typeof raw === "string") {
    raw = { name: raw, description: raw };
  }

  // IntelliModel aliases seen in practice:
  //   name:              "topic", "topic_name", "title", "name"
  //   description:       "summary", "topic_description", "detail", "description"
  //   category:          "type", "topic_type", "category"
  //   relatedTerms:      "keywords", "related_terms", "terms", "tags", "relatedTerms"
  //   customerRelevance: "relevance", "customer_relevance", "relevance_score", "customerRelevance"
  //   initialConfidence: "confidence", "initial_confidence", "confidence_score", "initialConfidence"
  //   reasoning:         "reason", "rationale", "explanation", "reasoning"

  const resolvedDescription = String(pickField(raw, "description", "summary", "topic_description", "detail", "topic_detail") ?? "").trim();
  const resolvedName        = String(pickField(raw, "name", "topic", "topic_name", "title", "hypothesis") ?? resolvedDescription).trim();
  const resolvedCategory    = String(pickField(raw, "category", "type", "topic_type", "dimension") ?? "other").trim().toLowerCase();
  const resolvedReasoning   = String(pickField(raw, "reasoning", "reason", "rationale", "explanation") ?? "").trim();
  const resolvedRelated     = coerceStringArray(pickField(raw, "relatedTerms", "related_terms", "keywords", "terms", "tags"));
  const resolvedRelevance   = coerceFloat(pickField(raw, "customerRelevance", "relevance", "customer_relevance", "relevance_score"), 0.5);
  const resolvedConfidence  = coerceFloat(pickField(raw, "initialConfidence", "confidence", "initial_confidence", "confidence_score"), 0.5);

  const safeId = (String(pickField(raw, "id") ?? resolvedName))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    id:                safeId || "topic",
    name:              resolvedName,
    description:       resolvedDescription,
    category:          VALID_CATEGORIES.has(resolvedCategory) ? resolvedCategory : "other",
    relatedTerms:      Array.from(new Set(resolvedRelated)),
    customerRelevance: resolvedRelevance,
    initialConfidence: resolvedConfidence,
    reasoning:         resolvedReasoning,
  };
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/** Deduplicate and normalise: filter nulls → alias-normalise → remove duplicate names. */
function deduplicateTopics(rawItems: any[]): Topic[] {
  const seenNames = new Set<string>();
  return rawItems
    .filter((item) => item && typeof item === "object")   // drop null / non-object items
    .map(normaliseIntelliModelTopicItem)
    .filter((normalisedTopic) => {
      const lowerName = (normalisedTopic.name as string).toLowerCase();
      return lowerName && !seenNames.has(lowerName) && seenNames.add(lowerName);
    }) as Topic[];
}

import { Spinner } from "../utils/spinner.js";

// ─── Node ─────────────────────────────────────────────────────────────────────

export async function discoverTopics(state: ResearchState): Promise<Partial<ResearchState>> {
  console.log("=================================");
  console.log("Step 4: Discover Topics");
  console.log("=================================");

  if (!state.targetCustomer) throw new Error("discoverTopics requires targetCustomer in state");

  const suggestResultsText = state.suggestResults?.length
    ? formatSuggestResultsForPrompt(state.suggestResults as SuggestResult[])
    : "(No autocomplete data available — reasoning from target customer only)";

  const systemPrompt = buildEnrichedTopicPrompt(
    state.userInput,
    state.targetCustomer,
    suggestResultsText
  );

  const spinner = new Spinner("Analyzing data and discovering topics...");
  spinner.start();

  let result;
  try {
    result = await callIntelliModelWithRetry(
      systemPrompt,
      "Return ONLY a raw JSON object with a 'topics' key containing an array of topic objects. No markdown, no code fences.",
      TopicsSchema,
      (parsedJson) => {
        // console.log("[DEBUG] discoverTopics raw parsedJson:", JSON.stringify(parsedJson, null, 2));
        const rawArray        = extractArray(parsedJson);
        const normalisedArray = rawArray.map(normaliseIntelliModelTopicItem);
        return { topics: normalisedArray };
      }
    );
  } catch (error) {
    spinner.stop();
    console.error("❌ Failed to discover topics.");
    throw error;
  }

  const topics = deduplicateTopics(result.topics as any[]);

  spinner.stop(`Discovered ${topics.length} unique topics`);
  return { topics };
}
