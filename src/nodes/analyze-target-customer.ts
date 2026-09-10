import type { ResearchState } from "../graph/state.js";
import { TargetCustomerSchema } from "../schemas/target-customer.js";
import { ANALYZE_TARGET_CUSTOMER_PROMPT } from "../prompts/analyze-target-customer.js";
import { callIntelliModelWithRetry, unwrapIfNested } from "../llm/llm-utils.js";

// ─── IntelliModel alias normalisation ─────────────────────────────────────────────────
// IntelliModel uses inconsistent field names depending on the run.
// Map every known alias to the canonical TargetCustomerSchema field name.

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

/** Coerce a value to a string array, handling single strings, nulls, and missing values. */
function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

/**
 * Normalise one raw IntelliModel object into the shape TargetCustomerSchema expects.
 * IntelliModel aliases observed in practice:
 *   roles         → "job_titles", "job_roles", "target_roles", "positions"
 *   confidence    → "level_of_confidence", "confidence_score", "certainty"
 *   assumptions   → "key_assumptions", "caveats", "notes"
 *   companyTypes  → "company_types", "organization_types", "org_types"
 *   companySize   → "company_size", "organization_size", "size"
 *   buyingContext → "buying_context", "purchase_context", "trigger_events"
 *   exclusions    → "exclusion_list", "excluded", "exclude"
 */
function normaliseIntelliModelTargetCustomer(raw: unknown): Record<string, unknown> {
  const obj = unwrapIfNested(raw) as Record<string, any>;
  
  // Sometimes IntelliModel nests confidence and assumptions
  const confAssumpt = obj.confidence_and_assumptions || {};
  const confidenceVal = pickField(obj, "confidence", "level_of_confidence", "confidence_score", "certainty") 
    ?? pickField(confAssumpt, "confidence", "level_of_confidence");
  const assumptionsVal = pickField(obj, "assumptions", "key_assumptions", "caveats", "notes")
    ?? pickField(confAssumpt, "assumptions", "key_assumptions");

  return {
    industry:     String(pickField(obj, "industry", "sector", "domain", "industry_or_domain", "industry_domain") ?? "unknown").trim(),
    roles:        coerceStringArray(pickField(obj, "roles", "job_titles", "job_roles", "target_roles", "positions", "actual_people", "target_people", "actual_people_we_want_to_reach")),
    geography:    coerceStringArray(pickField(obj, "geography", "geographies", "regions", "locations", "countries", "geographic_market", "target_geography")),
    companyTypes: coerceStringArray(pickField(obj, "companyTypes", "company_types", "organization_types", "org_types", "types_of_organizations", "types_of_organisations")),
    companySize:  coerceStringArray(pickField(obj, "companySize", "company_size", "organization_size", "size", "likely_company_size")),
    problems:     coerceStringArray(pickField(obj, "problems", "pain_points", "challenges", "issues", "operational_problems")),
    goals:        coerceStringArray(pickField(obj, "goals", "objectives", "desired_outcomes", "outcomes")),
    buyingContext:coerceStringArray(pickField(obj, "buyingContext", "buying_context", "purchase_context", "trigger_events", "triggers", "situations_causing_solution_search", "trigger_situations", "situations_triggering_solution_search")),
    exclusions:   coerceStringArray(pickField(obj, "exclusions", "exclusion_list", "excluded", "exclude", "excluded_people_and_discussions", "excluded_people_and_topics")),
    confidence:   coerceFloat(confidenceVal, 0.7),
    assumptions:  coerceStringArray(assumptionsVal),
  };
}

import { Spinner } from "../utils/spinner.js";

// ─── Node ─────────────────────────────────────────────────────────────────────

export async function analyzeTargetCustomer(state: ResearchState): Promise<Partial<ResearchState>> {
  console.log("=================================");
  console.log("Step 1: Analyze Target Customer");
  console.log("=================================");

  const systemPrompt = ANALYZE_TARGET_CUSTOMER_PROMPT.replace("{userInput}", state.userInput);
  const spinner = new Spinner("Analyzing target customer profile...");
  spinner.start();

  let targetCustomer;
  try {
    targetCustomer = await callIntelliModelWithRetry(
      systemPrompt,
      "Return ONLY a raw JSON object matching the schema. No markdown, no code fences, no explanation.",
      TargetCustomerSchema,
      (raw) => {
        // console.log("[DEBUG] analyzeTargetCustomer raw parsedJson:", JSON.stringify(raw, null, 2));
        return normaliseIntelliModelTargetCustomer(raw);
      }
    );
    spinner.stop(`Target customer identified: ${targetCustomer.industry} — roles: ${targetCustomer.roles.join(", ")}`);
  } catch (error) {
    spinner.stop();
    console.error("❌ Failed to analyze target customer.");
    throw error;
  }

  return { targetCustomer };
}
