import type { ResearchState } from "../graph/state.js";
import type { SearchQuery } from "../schemas/search-query.js";
import { SuggestResultSchema, type SuggestResult } from "../schemas/search-query.js";

// ─── Suggest API fetchers ─────────────────────────────────────────────────────

/** Fetch Google autocomplete suggestions for a query URL. Returns empty array on failure. */
async function fetchGoogleSuggestions(googleUrl: string): Promise<string[]> {
  try {
    const response = await fetch(googleUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    const data = await response.json() as [string, string[]];
    return data[1] ?? [];
  } catch {
    return [];
  }
}

/** Fetch Bing autocomplete suggestions for a query URL. Returns empty array on failure. */
async function fetchBingSuggestions(bingUrl: string): Promise<string[]> {
  try {
    const response = await fetch(bingUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    const data = await response.json() as [string, string[]];
    return data[1] ?? [];
  } catch {
    return [];
  }
}

/** Fetch YouTube autocomplete suggestions for a query URL. Returns empty array on failure. */
async function fetchYoutubeSuggestions(youtubeUrl: string): Promise<string[]> {
  try {
    const response = await fetch(youtubeUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    const data = await response.json() as [string, string[]];
    return data[1] ?? [];
  } catch {
    return [];
  }
}

// ─── Per-query fetcher ────────────────────────────────────────────────────────

/** Fetch suggestions from all three engines in parallel for a single search query. */
async function fetchSuggestionsForQuery(searchQuery: SearchQuery): Promise<SuggestResult> {
  const [googleSuggests, bingSuggests, youtubeSuggests] = await Promise.all([
    fetchGoogleSuggestions(searchQuery.googleUrl),
    fetchBingSuggestions(searchQuery.bingUrl),
    fetchYoutubeSuggestions(searchQuery.youtubeUrl),
  ]);

  return SuggestResultSchema.parse({
    query:           searchQuery.fullQuery,
    googleSuggests,
    bingSuggests,
    youtubeSuggests,
  });
}

import { Spinner } from "../utils/spinner.js";

// ─── Node ─────────────────────────────────────────────────────────────────────

export async function fetchSuggestResults(state: ResearchState): Promise<Partial<ResearchState>> {
  console.log("=================================");
  console.log("Step 3: Fetch Autocomplete Suggestions");
  console.log("=================================");

  if (!state.searchQueries?.length) throw new Error("fetchSuggestResults requires searchQueries in state");

  const spinner = new Spinner("Fetching autocomplete suggestions from Google, Bing, and YouTube...");
  spinner.start();

  // Fetch all queries in parallel — suggest APIs are fast and lightweight
  const suggestResults = await Promise.all(
    (state.searchQueries as SearchQuery[]).map(fetchSuggestionsForQuery)
  );

  const totalSuggestions = suggestResults.reduce(
    (total, result) => total + result.googleSuggests.length + result.bingSuggests.length + result.youtubeSuggests.length,
    0
  );

  spinner.stop(`Fetched ${totalSuggestions} autocomplete suggestions across ${suggestResults.length} queries`);

  console.log(`\n💡 Sample Suggestions (First 10):`);
  const allSuggests = suggestResults.flatMap(r => [...r.googleSuggests, ...r.bingSuggests, ...r.youtubeSuggests]);
  const uniqueSuggests = [...new Set(allSuggests)];
  uniqueSuggests.slice(0, 10).forEach((s, i) => console.log(`   ${i + 1}. ${s}`));

  return { suggestResults };
}
