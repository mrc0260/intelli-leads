import { createResearchGraph } from "./graph/graph.js";
import type { LinkedInPost } from "./schemas/linkedin-post.js";
import * as dotenv from "dotenv";
import * as readline from "readline";
import * as fs from "node:fs";
import * as path from "node:path";

dotenv.config();

// ─── Example shown to the user ───────────────────────────────────────────────

const EXAMPLE_REQUEST =
  `Find potential customers for my property-management software in the UK.\n` +
  `I want to discover topics that property managers are discussing on LinkedIn,\n` +
  `especially operational problems where there are active conversations.`;

// ─── Terminal prompt ──────────────────────────────────────────────────────────

/** Print a formatted banner with example text so the user knows what to type. */
function printWelcomeBanner(): void {
  const horizontalRule = "─".repeat(78);
  console.log(`\n┌${horizontalRule}┐`);
  console.log(`│  🔍  intelli-leads - LinkedIn Research Agent.  (www.intelli-leads.com)       │`);
  console.log(`├${horizontalRule}┤`);
  console.log(`│  Describe the customers you want to find and what topics to research.        │`);
  console.log(`│                                                                              │`);
  console.log(`│  Example:                                                                    │`);
  console.log(`│    "Find potential customers for my property-management software in the UK.  │`);
  console.log(`│     I want to discover topics that property managers are discussing on       │`);
  console.log(`│     LinkedIn, especially operational problems where there are active         │`);
  console.log(`│     conversations."                                                          │`);
  console.log(`│                                                                              │`);
  console.log(`│  Tips:                                                                       │`);
  console.log(`│    • Include the industry and geography                                      │`);
  console.log(`│    • Describe who the customer is                                            │`);
  console.log(`│    • Mention the type of problems or topics you want to find                 │`);
  console.log(`└${horizontalRule}┘\n`);
}

/** Ask the user to type their research request and return the trimmed input. */
async function promptUserForResearchRequest(): Promise<string> {
  const terminal = readline.createInterface({
    input:  process.stdin,
    output: process.stdout,
  });

  return new Promise((resolveWithUserInput) => {
    terminal.question("✏️  Your request (or press Enter to use the example):\n> ", (typedInput) => {
      terminal.close();
      const trimmedInput = typedInput.trim();
      resolveWithUserInput(trimmedInput || EXAMPLE_REQUEST);
    });
  });
}

/** Ask the user how many comments a post must have to be considered (minimum 0). */
async function promptUserForMinComments(): Promise<number> {
  const terminal = readline.createInterface({
    input:  process.stdin,
    output: process.stdout,
  });

  return new Promise((resolveWithMinComments) => {
    terminal.question("💬 Minimum comments needed per post (min. 0, default 0):\n> ", (typedInput) => {
      terminal.close();
      const parsed = parseInt(typedInput.trim(), 10);
      const minComments = (!isNaN(parsed) && parsed >= 0) ? parsed : 0;
      console.log(`   → Using minimum ${minComments} comments per post\n`);
      resolveWithMinComments(minComments);
    });
  });
}

// ─── Markdown export ────────────────────────────────────────────────────────

/** Zero-pad a number to two digits for timestamps. */
function padTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

/** Format a Date as both a filename-safe stamp and a human-readable label. */
function timestampParts(capturedAt: Date): { stamp: string; display: string } {
  const day = `${capturedAt.getFullYear()}-${padTwoDigits(capturedAt.getMonth() + 1)}-${padTwoDigits(capturedAt.getDate())}`;
  const time = `${padTwoDigits(capturedAt.getHours())}-${padTwoDigits(capturedAt.getMinutes())}-${padTwoDigits(capturedAt.getSeconds())}`;
  return { stamp: `${day}_${time}`, display: `${day} ${time.replaceAll("-", ":")}` };
}

/** Turn a block of text into a Markdown blockquote. */
function toMarkdownQuote(text: string): string {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return "> (not provided)";
  return trimmed
    .split(/\r?\n/)
    .map((line) => `> ${line || " "}`)
    .join("\n");
}

/** Build the Markdown document that lists the scraped candidate posts. */
function buildCandidatePostsMarkdown(
  posts: LinkedInPost[],
  userRequest: string,
  minComments: number,
  capturedAt: Date,
): string {
  const { display } = timestampParts(capturedAt);
  const lines: string[] = [
    "# Scraped LinkedIn Posts",
    "",
    `- Captured: ${display}`,
    `- Posts found: ${posts.length}`,
    `- Minimum comments per post: ${minComments}`,
    "",
    "## Original Request",
    "",
    toMarkdownQuote(userRequest),
    "",
    "## Posts",
    "",
  ];

  if (!posts.length) {
    lines.push("No posts were returned.", "");
    return `${lines.join("\n")}\n`;
  }

  posts.forEach((post: LinkedInPost, postIndex: number) => {
    const author = post.authorName || "Unknown author";
    const jobTitle = post.jobTitle || "Unknown role";
    const company = post.company || "Unknown company";
    lines.push(
      `### ${postIndex + 1}. ${author} — ${jobTitle} @ ${company}`,
      "",
      `- Post URL: ${post.postUrl || "Not available"}`,
      `- Author URL: ${post.authorUrl || "Not available"}`,
      `- Location: ${post.location || "Not provided"}`,
      `- Reactions: ${post.reactionCount ?? 0}`,
      `- Comments: ${post.commentCount ?? 0}`,
      `- Discovered: ${post.discoveredAt || display}`,
      "",
    );
  });

  return `${lines.join("\n")}\n`;
}

/** Persist the scraped candidate posts as a Markdown file in the /output folder. */
function saveCandidatePostsToMarkdown(
  posts: LinkedInPost[],
  userRequest: string,
  minComments: number,
): string {
  const outputDirectory = path.resolve(process.cwd(), "output");
  fs.mkdirSync(outputDirectory, { recursive: true });
  const capturedAt = new Date();
  const { stamp } = timestampParts(capturedAt);
  const outputPath = path.join(outputDirectory, `scraped-posts_${stamp}.md`);
  fs.writeFileSync(outputPath, buildCandidatePostsMarkdown(posts, userRequest, minComments, capturedAt), "utf-8");
  return outputPath;
}

// ─── Pipeline runner ──────────────────────────────────────────────────────────

/** Run the full new LangGraph research pipeline and print a structured summary. */
async function runResearchPipeline(userRequest: string, minComments: number): Promise<void> {
  console.log("\n🚀 Starting LinkedIn Research Pipeline");
  console.log(`📋 Research request: ${userRequest}`);
  console.log(`💬 Minimum comments per post: ${minComments}\n`);

  const researchGraph = createResearchGraph();
  const finalState = await researchGraph.invoke({
    // The raw text prompt typed by the user (e.g., "Find UK property managers")
    userInput:      userRequest,
    minComments:    minComments,
    
    // Will be populated by the AI with a structured profile of the ideal customer
    targetCustomer: null,
    
    // A list of search strings generated by the AI to search LinkedIn/Google
    searchQueries:  [],
    
    // Autocomplete/suggest results pulled from search engines to expand the queries
    suggestResults: [],
    
    // A curated list of specific problems/topics the target customer cares about
    topics:         [],
    
    // The raw posts scraped from LinkedIn by the Python browser-use script
    // These are "candidates" because they match the search, but haven't been scored yet
    candidatePosts: [],
    
    // Posts that have been deeply analyzed by the AI for lead quality and engagement
    analyzedPosts:  [],
    
    // Final extracted business opportunities (e.g., people who asked for software)
    opportunities:  [],
    
    // Post URLs rejected by sentiment analysis — browser agent skips these on retry
    skippedPostUrls: [],
    
    // How many times the sentiment → search loop has retried (starts at 0)
    sentimentAttempt: 0,
    
    // Loop counters for the LangGraph pipeline
    iteration:      0,
    maxIterations:  3,
  });

  console.log("\n════════════════════════════════════");
  console.log("🎯 TARGET CUSTOMER");
  console.log("════════════════════════════════════");
  console.log(JSON.stringify(finalState.targetCustomer, null, 2));

  console.log(`\n════════════════════════════════════`);
  console.log(`📌 DISCOVERED TOPICS (${finalState.topics.length})`);
  console.log("════════════════════════════════════");
  finalState.topics.forEach((topic: any, topicIndex: number) => {
    console.log(`\n${topicIndex + 1}. ${topic.name} [${topic.category}]`);
    console.log(`   ${topic.description}`);
    console.log(`   Relevance: ${topic.customerRelevance}  Confidence: ${topic.initialConfidence}`);
  });

  console.log(`\n════════════════════════════════════`);
  console.log(`🔎 SCRAPED POSTS (${finalState.candidatePosts?.length ?? 0})`);
  console.log("════════════════════════════════════");
  (finalState.candidatePosts ?? []).forEach((post: any, postIndex: number) => {
    console.log(`\n${postIndex + 1}. ${post.authorName} — ${post.jobTitle} @ ${post.company}`);
    console.log(`   Reactions: ${post.reactionCount}  Comments: ${post.commentCount}`);
    console.log(`   ${post.postUrl}`);
  });
  const markdownPath = saveCandidatePostsToMarkdown(finalState.candidatePosts ?? [], userRequest, minComments);
  console.log(`\n📝 Scraped posts list saved to ${markdownPath}`);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  printWelcomeBanner();
  const userRequest = await promptUserForResearchRequest();
  const minComments = await promptUserForMinComments();
  await runResearchPipeline(userRequest, minComments);
}

main().catch((pipelineError) => {
  console.error("❌ Pipeline Error:", pipelineError);
  process.exit(1);
});

