import { Annotation } from "@langchain/langgraph";
import type { TargetCustomer } from "../schemas/target-customer.js";
import type { Topic } from "../schemas/topic.js";
import type { SearchQuery, SuggestResult } from "../schemas/search-query.js";
import type { LinkedInPost } from "../schemas/linkedin-post.js";

// Placeholder types for nodes not yet implemented
type AnalyzedPost = any;
type Opportunity  = any;

/** Always replaces the existing array with the incoming one (no merging). */
const replaceArray = <T>(_existingItems: T[], incomingItems: T[]) => incomingItems;

/** Appends new items to the existing array (accumulates across retries). */
const appendArray = <T>(existingItems: T[], incomingItems: T[]) => [...existingItems, ...incomingItems];

export const ResearchStateAnnotation = Annotation.Root({
  /** The raw natural-language request typed by the user at startup. */
  userInput:      Annotation<string>(),

  /** Minimum number of comments a post must have to be saved. */
  minComments:    Annotation<number>(),

  /** Structured customer profile produced by analyzeTargetCustomer. */
  targetCustomer: Annotation<TargetCustomer | null>(),

  /** 16-prefix × keyword search queries with 3 engine URL variants each. */
  searchQueries:  Annotation<SearchQuery[]>({ reducer: replaceArray }),

  /** Autocomplete suggestions fetched from Google, Bing, and YouTube. */
  suggestResults: Annotation<SuggestResult[]>({ reducer: replaceArray }),

  /** Customer-problem topics discovered by the LLM from suggest data. */
  topics:         Annotation<Topic[]>({ reducer: replaceArray }),

  /** LinkedIn posts found while searching for each topic. */
  candidatePosts: Annotation<LinkedInPost[]>({ reducer: replaceArray }),

  /** Post URLs that we have already saved or processed — tells the browser to skip them. */
  skippedPostUrls: Annotation<string[]>({ reducer: appendArray }),

  iteration:      Annotation<number>(),
  maxIterations:  Annotation<number>(),
});

export type ResearchState = typeof ResearchStateAnnotation.State;
