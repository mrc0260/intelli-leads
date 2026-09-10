import { z } from "zod";

/** The three search engines we query for autocomplete suggestions */
export const SearchEngineSchema = z.enum(["google", "bing", "youtube"]);
export type SearchEngine = z.infer<typeof SearchEngineSchema>;

/** A single search query with its URL variations across all three engines */
export const SearchQuerySchema = z.object({
  keyword:       z.string().describe("The raw keyword being searched"),
  prefix:        z.string().describe("The intent modifier prepended to the keyword"),
  fullQuery:     z.string().describe("The complete search phrase sent to autocomplete APIs"),
  googleUrl:     z.string().url().describe("Google Suggest API URL for this query"),
  bingUrl:       z.string().url().describe("Bing Suggest API URL for this query"),
  youtubeUrl:    z.string().url().describe("YouTube Suggest API URL for this query"),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

/** Collected autocomplete suggestions from all three engines for one query */
export const SuggestResultSchema = z.object({
  query:           z.string(),
  googleSuggests:  z.array(z.string()),
  bingSuggests:    z.array(z.string()),
  youtubeSuggests: z.array(z.string()),
});

export type SuggestResult = z.infer<typeof SuggestResultSchema>;
