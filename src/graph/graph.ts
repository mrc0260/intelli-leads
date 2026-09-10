import { StateGraph, END, START } from "@langchain/langgraph";
import { ResearchStateAnnotation }  from "./state.js";
import type { ResearchState }       from "./state.js";
import { analyzeTargetCustomer }    from "../nodes/analyze-target-customer.js";
import { generateSearchQueries }    from "../nodes/generate-search-queries.js";
import { fetchSuggestResults }      from "../nodes/fetch-suggest-results.js";
import { discoverTopics }           from "../nodes/discover-topics.js";
import { searchLinkedInTopics }     from "../nodes/search-linkedin-topics.js";
import { saveReactionsToOutput }    from "../nodes/save-reactions-to-output.js";

/**
 * Full pipeline topology:
 *
 *  START
 *    → analyze_target_customer    LLM:  user input → TargetCustomer JSON
 *    → generate_search_queries    Code: keywords × 16 prefixes × 3 engine URLs
 *    → fetch_suggest_results      HTTP: Google Chrome + Bing + YouTube autocomplete
 *    → discover_topics            LLM:  suggest data + TargetCustomer → Topics
 *    → search_linkedin_topics     Browser: search LinkedIn for each topic → Posts
 *    → save_reactions_to_output   Files: write posts with reactions to output/*.txt
 *  END
 */

export function createResearchGraph() {
  const pipeline = new StateGraph(ResearchStateAnnotation)
    .addNode("analyze_target_customer",   analyzeTargetCustomer)
    .addNode("generate_search_queries",   generateSearchQueries)
    .addNode("fetch_suggest_results",     fetchSuggestResults)
    .addNode("discover_topics",           discoverTopics)
    .addNode("search_linkedin_topics",    searchLinkedInTopics)
    .addNode("save_reactions_to_output",  saveReactionsToOutput);

  pipeline.addEdge(START,                       "analyze_target_customer");
  pipeline.addEdge("analyze_target_customer",   "generate_search_queries");
  pipeline.addEdge("generate_search_queries",   "fetch_suggest_results");
  pipeline.addEdge("fetch_suggest_results",     "discover_topics");
  pipeline.addEdge("discover_topics",           "search_linkedin_topics");
  pipeline.addEdge("search_linkedin_topics",    "save_reactions_to_output");
  pipeline.addEdge("save_reactions_to_output",  END);

  return pipeline.compile();
}
