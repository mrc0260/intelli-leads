import { createResearchGraph } from "./graph/graph.js";
import type { Topic } from "./schemas/topic.js";

const TEST_CASES = [
  "1. Find UK property managers who might need custom software.",
  "2. Find restaurant owners in Italy discussing operational problems.",
  "3. Find US dental clinic owners discussing administrative problems.",
  "4. Find independent financial advisers in the UK discussing client-management problems.",
  "5. Find logistics company managers in Germany discussing fleet-management problems."
];

/** Print all discovered topics for a single test case result. */
function printDiscoveredTopics(topics: Topic[]): void {
  console.log(`\n--- DISCOVERED TOPICS (${topics.length}) ---`);
  topics.forEach((topic: Topic, topicIndex: number) => {
    console.log(`\nTopic ${topicIndex + 1}: ${topic.name} (${topic.category})`);
    console.log(`Description: ${topic.description}`);
    console.log(`Relevance: ${topic.customerRelevance}, Confidence: ${topic.initialConfidence}`);
    console.log(`Terms: ${topic.relatedTerms.join(", ")}`);
  });
}

/** Run the research pipeline for a single user input and print the result. */
async function runSingleTestCase(researchPipeline: ReturnType<typeof createResearchGraph>, userInput: string): Promise<void> {
  console.log("\n\n######################################################################");
  console.log(`TESTING USER INPUT:`);
  console.log(userInput);
  console.log("######################################################################\n");

  try {
    const researchResult = await researchPipeline.invoke({
      userInput,
      iteration: 0,
      maxIterations: 3,
      topics: [],
      searchQueries: [],
      candidatePosts: [],
      analyzedPosts: [],
      opportunities: []
    });

    console.log("\n--- TARGET CUSTOMER ---");
    console.log(JSON.stringify(researchResult.targetCustomer, null, 2));
    printDiscoveredTopics(researchResult.topics);

  } catch (testError: any) {
    console.error(`Test failed for input: ${userInput}`);
    console.error(testError);
  }
}

/** Run all test cases sequentially through the research pipeline. */
async function runAllTests(): Promise<void> {
  const researchPipeline = createResearchGraph();
  for (const userInput of TEST_CASES) {
    await runSingleTestCase(researchPipeline, userInput);
  }
}

runAllTests().catch(console.error);
