import type { ResearchState } from "../graph/state.js";
import { SearchQuerySchema, type SearchQuery } from "../schemas/search-query.js";

// ─── The 16 intent-based keyword prefixes ────────────────────────────────────
// These modifiers surface real customer pain points in autocomplete suggestions.
// They are deliberately problem/frustration oriented rather than product oriented.

const KEYWORD_PREFIXES: string[] = [
  "problems with",
  "challenges in",
  "how to improve",
  "best way to handle",
  "common mistakes in",
  "tools for",
  "tips for",
  "how to manage",
  "software for",
  "automation for",
  "cost of",
  "complaints about",
  "difficulty with",
  "alternatives to",
  "guide to",
  "how do you deal with",
];

// ─── URL builders ─────────────────────────────────────────────────────────────

/** Build a Google Suggest URL using the Chrome client (returns real Chrome autocomplete results). */
function buildGoogleSuggestUrl(query: string): string {
  return `https://suggestqueries.google.com/complete/search?client=chrome&hl=en&gl=uk&q=${encodeURIComponent(query)}`;
}

/** Build a Bing Suggest URL using the qsonhs endpoint (returns JSON suggestions). */
function buildBingSuggestUrl(query: string): string {
  return `https://api.bing.com/qsonhs.aspx?q=${encodeURIComponent(query)}`;
}

/** Build a YouTube Suggest URL using the youtube client with ds=yt dataset filter. */
function buildYoutubeSuggestUrl(query: string): string {
  return `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}`;
}

// ─── Query builders ───────────────────────────────────────────────────────────

/** Create all 16 prefix+keyword search queries for a single keyword. */
function buildQueriesForKeyword(keyword: string): SearchQuery[] {
  return KEYWORD_PREFIXES.map((prefix) => {
    const fullQuery = `${prefix} ${keyword}`;
    return SearchQuerySchema.parse({
      keyword,
      prefix,
      fullQuery,
      googleUrl:  buildGoogleSuggestUrl(fullQuery),
      bingUrl:    buildBingSuggestUrl(fullQuery),
      youtubeUrl: buildYoutubeSuggestUrl(fullQuery),
    });
  });
}

/** Extract the raw keywords to search from the targetCustomer (industry + roles). */
function extractKeywordsFromTargetCustomer(targetCustomer: ResearchState["targetCustomer"]): string[] {
  if (!targetCustomer) return [];
  return [targetCustomer.industry, ...targetCustomer.roles];
}

import { Spinner } from "../utils/spinner.js";

// ─── Node ─────────────────────────────────────────────────────────────────────

export async function generateSearchQueries(state: ResearchState): Promise<Partial<ResearchState>> {
  console.log("=================================");
  console.log("Step 2: Generate Search Queries");
  console.log("=================================");

  if (!state.targetCustomer) throw new Error("generateSearchQueries requires targetCustomer in state");

  const spinner = new Spinner("Generating search queries...");
  spinner.start();

  const keywords      = extractKeywordsFromTargetCustomer(state.targetCustomer);
  const searchQueries = keywords.flatMap(buildQueriesForKeyword);

  spinner.stop(`Generated ${searchQueries.length} search queries from ${keywords.length} keywords`);
  
  console.log(`\n🔑 Keywords identified from Target Customer:`);
  keywords.forEach((kw, i) => console.log(`   ${i + 1}. ${kw}`));

  console.log(`\n📝 Full Queries (First 10 of ${searchQueries.length}):`);
  searchQueries.slice(0, 10).forEach((q, i) => console.log(`   ${i + 1}. ${q.fullQuery}`));
  if (searchQueries.length > 10) console.log(`   ... and ${searchQueries.length - 10} more.`);
  
  return { searchQueries };
}
