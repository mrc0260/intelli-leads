# Graph Report - intelli-leads-mrc0260-PUBLIC-repo-OFFICIAL  (2026-09-15)

## Corpus Check
- Corpus is ~8,182 words - fits in a single context window. You may not need a graph.

## Summary
- 363 nodes · 538 edges · 14 communities (13 shown, 1 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Python Dependency Inventory
- Contribution and Security
- TypeScript Research State
- Package Metadata
- Research Pipeline Orchestration
- Browser Search Automation
- Project Architecture Overview
- Search Query Generation
- LLM Topic Processing
- TypeScript Compiler Configuration
- JavaScript Runtime Dependencies
- Customer Analysis Validation
- macOS Dependencies
- Windows Dependencies

## God Nodes (most connected - your core abstractions)
1. `Python dependencies` - 108 edges
2. `README` - 25 edges
3. `Spinner` - 18 edges
4. `compilerOptions` - 18 edges
5. `Contributing` - 14 edges
6. `intelli-leads` - 14 edges
7. `discoverTopics()` - 12 edges
8. `searchLinkedInTopics()` - 12 edges
9. `createResearchGraph()` - 11 edges
10. `ResearchState` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Browser profiles` --semantically_similar_to--> `Dedicated local browser profile`  [INFERRED] [semantically similar]
  CONTRIBUTING.md → README.md
- `Cookies` --semantically_similar_to--> `Session cookies`  [INFERRED] [semantically similar]
  CONTRIBUTING.md → README.md
- `Collected personal data` --semantically_similar_to--> `Personal data`  [INFERRED] [semantically similar]
  CONTRIBUTING.md → README.md
- `npm test` --semantically_similar_to--> `npm test`  [INFERRED] [semantically similar]
  README.md → CONTRIBUTING.md
- `Apache-2.0 license` --semantically_similar_to--> `Apache License 2.0`  [INFERRED] [semantically similar]
  CONTRIBUTING.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Contribution checklist** — contributing_credentials, contributing_browser_profiles, contributing_cookies, contributing_collected_personal_data, contributing_npm_test, contributing_tests, contributing_documentation, contributing_browser_automation, contributing_target_platform_terms, contributing_applicable_law [EXTRACTED 1.00]
- **Application stack** — readme_typescript, readme_python, readme_langgraph_js, readme_browser_use, readme_playwright, readme_intellidesign_intellimodel, readme_openai_compatible_api [EXTRACTED 1.00]
- **Runtime requirements** — readme_node_js, readme_npm, readme_python_3, readme_google_chrome, readme_chromium, readme_intellidesign_intellimodel_api_key [EXTRACTED 1.00]

## Communities (14 total, 1 thin omitted)

### Community 0 - "Python Dependency Inventory"
Cohesion: 0.02
Nodes (102): aiofiles==25.1.0, aiohappyeyeballs==2.7.1, aiohttp==3.14.3, aiosignal==1.4.0, annotated-types==0.8.0, anthropic==0.76.0, anyio==4.12.1, attrs==26.1.0 (+94 more)

### Community 1 - "Contribution and Security"
Cohesion: 0.05
Nodes (48): Apache-2.0 license, Applicable law, Browser automation, Browser profiles, Collected personal data, Contributing, Cookies, Credentials (+40 more)

### Community 2 - "TypeScript Research State"
Cohesion: 0.09
Nodes (27): @langchain/langgraph, zod, AnalyzedPost, Opportunity, ResearchState, ResearchStateAnnotation, formatPostForOutput(), getPostOutputPath() (+19 more)

### Community 3 - "Package Metadata"
Cohesion: 0.07
Nodes (26): author, description, devDependencies, ts-node, @types/node, typescript, keywords, license (+18 more)

### Community 4 - "Research Pipeline Orchestration"
Cohesion: 0.17
Nodes (19): createResearchGraph(), main(), printWelcomeBanner(), promptUserForMinComments(), promptUserForResearchRequest(), runResearchPipeline(), analyzeTargetCustomer(), fetchSuggestResults() (+11 more)

### Community 5 - "Browser Search Automation"
Cohesion: 0.13
Nodes (21): action, BaseModel, BrowserSession, ChatOpenAI, build_linkedin_search_task(), connect_to_running_chrome(), create_intelliModel_llm(), ensure_linkedin_login() (+13 more)

### Community 6 - "Project Architecture Overview"
Cohesion: 0.11
Nodes (20): AI LinkedIn Engagement Agent, browser-use, Generated research results, Git, intelli-leads, IntelliDesign IntelliModel, LangGraph.js, LinkedIn research workflow (+12 more)

### Community 7 - "Search Query Generation"
Cohesion: 0.16
Nodes (16): fetchBingSuggestions(), fetchGoogleSuggestions(), fetchSuggestionsForQuery(), fetchYoutubeSuggestions(), buildBingSuggestUrl(), buildGoogleSuggestUrl(), buildQueriesForKeyword(), buildYoutubeSuggestUrl() (+8 more)

### Community 8 - "LLM Topic Processing"
Cohesion: 0.20
Nodes (16): buildIntelliModelMessages(), callIntelliModelWithRetry(), extractArray(), extractJson(), findJsonBoundaries(), invokeIntelliModelAndValidate(), buildEnrichedTopicPrompt(), coerceFloat() (+8 more)

### Community 9 - "TypeScript Compiler Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, declaration, declarationMap, exactOptionalPropertyTypes, isolatedModules, jsx, module (+10 more)

### Community 10 - "JavaScript Runtime Dependencies"
Cohesion: 0.20
Nodes (10): dependencies, @browserbasehq/stagehand, dotenv, langchain, @langchain/core, @langchain/langgraph, @langchain/mcp-adapters, @langchain/openai (+2 more)

### Community 11 - "Customer Analysis Validation"
Cohesion: 0.43
Nodes (6): unwrapIfNested(), coerceFloat(), coerceStringArray(), normaliseIntelliModelTargetCustomer(), pickField(), ANALYZE_TARGET_CUSTOMER_PROMPT

### Community 12 - "macOS Dependencies"
Cohesion: 0.67
Nodes (3): darwin, pyobjc-core==12.2.2 (darwin only), pyobjc-framework-Cocoa==12.2.2 (darwin only)

## Knowledge Gaps
- **187 isolated node(s):** `name`, `version`, `description`, `main`, `typecheck` (+182 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 211 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Python dependencies` connect `Python Dependency Inventory` to `Contribution and Security`, `macOS Dependencies`, `Windows Dependencies`, `Project Architecture Overview`?**
  _High betweenness centrality (0.198) - this node is a cross-community bridge._
- **Why does `README` connect `Contribution and Security` to `Python Dependency Inventory`, `Project Architecture Overview`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Why does `intelli-leads` connect `Project Architecture Overview` to `Contribution and Security`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _187 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Python Dependency Inventory` be split into smaller, more focused modules?**
  _Cohesion score 0.0196078431372549 - nodes in this community are weakly interconnected._
- **Should `Contribution and Security` be split into smaller, more focused modules?**
  _Cohesion score 0.051418439716312055 - nodes in this community are weakly interconnected._
- **Should `TypeScript Research State` be split into smaller, more focused modules?**
  _Cohesion score 0.08739495798319327 - nodes in this community are weakly interconnected._