# Graph Report - intelli-leads-mrc0260-PUBLIC-repo-OFFICIAL  (2026-09-15)

## Corpus Check
- 6 files · ~10,263 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 391 nodes · 595 edges · 13 communities (12 shown, 1 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Python Dependency Inventory
- Contribution and Security
- Research Graph State
- Package Metadata
- Browser Automation Worker
- LinkedIn Search Integration
- Topic Discovery and Queries
- Project Architecture Overview
- TypeScript Compiler Configuration
- LLM Utilities and Customer Analysis
- CLI Entry Point
- macOS Dependencies
- Windows Dependencies

## God Nodes (most connected - your core abstractions)
1. `Python dependencies` - 108 edges
2. `README` - 25 edges
3. `compilerOptions` - 18 edges
4. `Spinner` - 17 edges
5. `Contributing` - 14 edges
6. `intelli-leads` - 14 edges
7. `discoverTopics()` - 12 edges
8. `writeLinkedInSearchMarkdown()` - 12 edges
9. `createResearchGraph()` - 10 edges
10. `_log()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Apache-2.0 license` --semantically_similar_to--> `Apache License 2.0`  [INFERRED] [semantically similar]
  CONTRIBUTING.md → README.md
- `npm test` --semantically_similar_to--> `npm test`  [INFERRED] [semantically similar]
  README.md → CONTRIBUTING.md
- `Cookies` --semantically_similar_to--> `Session cookies`  [INFERRED] [semantically similar]
  CONTRIBUTING.md → README.md
- `Browser profiles` --semantically_similar_to--> `Dedicated local browser profile`  [INFERRED] [semantically similar]
  CONTRIBUTING.md → README.md
- `Collected personal data` --semantically_similar_to--> `Personal data`  [INFERRED] [semantically similar]
  CONTRIBUTING.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Contribution checklist** — contributing_credentials, contributing_browser_profiles, contributing_cookies, contributing_collected_personal_data, contributing_npm_test, contributing_tests, contributing_documentation, contributing_browser_automation, contributing_target_platform_terms, contributing_applicable_law [EXTRACTED 1.00]
- **Application stack** — readme_typescript, readme_python, readme_langgraph_js, readme_browser_use, readme_playwright, readme_intellidesign_intellimodel, readme_openai_compatible_api [EXTRACTED 1.00]
- **Runtime requirements** — readme_node_js, readme_npm, readme_python_3, readme_google_chrome, readme_chromium, readme_intellidesign_intellimodel_api_key [EXTRACTED 1.00]

## Communities (13 total, 1 thin omitted)

### Community 0 - "Python Dependency Inventory"
Cohesion: 0.02
Nodes (102): aiofiles==25.1.0, aiohappyeyeballs==2.7.1, aiohttp==3.14.3, aiosignal==1.4.0, annotated-types==0.8.0, anthropic==0.76.0, anyio==4.12.1, attrs==26.1.0 (+94 more)

### Community 1 - "Contribution and Security"
Cohesion: 0.05
Nodes (48): Apache-2.0 license, Applicable law, Browser automation, Browser profiles, Collected personal data, Contributing, Cookies, Credentials (+40 more)

### Community 2 - "Research Graph State"
Cohesion: 0.09
Nodes (33): @langchain/langgraph, createResearchGraph(), AnalyzedPost, Opportunity, ResearchState, ResearchStateAnnotation, analyzeTargetCustomer(), fetchBingSuggestions() (+25 more)

### Community 3 - "Package Metadata"
Cohesion: 0.05
Nodes (36): author, dependencies, @browserbasehq/stagehand, dotenv, langchain, @langchain/core, @langchain/langgraph, @langchain/mcp-adapters (+28 more)

### Community 4 - "Browser Automation Worker"
Cohesion: 0.10
Nodes (34): action, BaseModel, BrowserSession, ChatOpenAI, LogRecord, build_linkedin_search_task(), _canonical_link(), _collect_live_linkedin_urls() (+26 more)

### Community 5 - "LinkedIn Search Integration"
Cohesion: 0.12
Nodes (26): cleanUpTopicsTempFile(), LINKEDIN_SEARCH_SCRIPT, parsePostsFromAgentOutput(), PYTHON_EXECUTABLE, runLinkedInSearchScript(), searchLinkedInTopics(), TOPICS_TEMP_FILE, writeTopicsToTempFile() (+18 more)

### Community 6 - "Topic Discovery and Queries"
Cohesion: 0.16
Nodes (18): extractArray(), buildEnrichedTopicPrompt(), coerceFloat(), coerceStringArray(), deduplicateTopics(), discoverTopics(), formatSuggestResultsForPrompt(), normaliseIntelliModelTopicItem() (+10 more)

### Community 7 - "Project Architecture Overview"
Cohesion: 0.11
Nodes (20): AI LinkedIn Engagement Agent, browser-use, Generated research results, Git, intelli-leads, IntelliDesign IntelliModel, LangGraph.js, LinkedIn research workflow (+12 more)

### Community 8 - "TypeScript Compiler Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, declaration, declarationMap, exactOptionalPropertyTypes, isolatedModules, jsx, module (+10 more)

### Community 9 - "LLM Utilities and Customer Analysis"
Cohesion: 0.20
Nodes (14): zod, buildIntelliModelMessages(), callIntelliModelWithRetry(), extractJson(), findJsonBoundaries(), invokeIntelliModelAndValidate(), unwrapIfNested(), coerceFloat() (+6 more)

### Community 10 - "CLI Entry Point"
Cohesion: 0.60
Nodes (5): main(), printWelcomeBanner(), promptUserForMinComments(), promptUserForResearchRequest(), runResearchPipeline()

### Community 11 - "macOS Dependencies"
Cohesion: 0.67
Nodes (3): darwin, pyobjc-core==12.2.2 (darwin only), pyobjc-framework-Cocoa==12.2.2 (darwin only)

## Knowledge Gaps
- **188 isolated node(s):** `AnalyzedPost`, `Opportunity`, `SavedPost`, `SearchEngine`, `@browserbasehq/stagehand` (+183 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 219 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Python dependencies` connect `Python Dependency Inventory` to `Contribution and Security`, `macOS Dependencies`, `Windows Dependencies`, `Project Architecture Overview`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **Why does `README` connect `Contribution and Security` to `Python Dependency Inventory`, `Project Architecture Overview`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Why does `zod` connect `LLM Utilities and Customer Analysis` to `Research Graph State`, `Package Metadata`, `LinkedIn Search Integration`, `Topic Discovery and Queries`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `AnalyzedPost`, `Opportunity`, `SavedPost` to the rest of the system?**
  _188 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Python Dependency Inventory` be split into smaller, more focused modules?**
  _Cohesion score 0.0196078431372549 - nodes in this community are weakly interconnected._
- **Should `Contribution and Security` be split into smaller, more focused modules?**
  _Cohesion score 0.051418439716312055 - nodes in this community are weakly interconnected._
- **Should `Research Graph State` be split into smaller, more focused modules?**
  _Cohesion score 0.09343200740055504 - nodes in this community are weakly interconnected._