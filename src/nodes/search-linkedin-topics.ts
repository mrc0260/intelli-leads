import type { ResearchState } from "../graph/state.js";
import type { Topic } from "../schemas/topic.js";
import type { LinkedInPost } from "../schemas/linkedin-post.js";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fetchSavedPostUrls } from "./save-reactions-to-output.js";

const PYTHON_EXECUTABLE         = resolvePythonExecutable();
const LINKEDIN_SEARCH_SCRIPT    = path.resolve(process.cwd(), "src", "run_linkedin_search.py");
const TOPICS_TEMP_FILE          = path.resolve(process.cwd(), "src", ".topics_temp.json");

function resolvePythonExecutable(): string {
  const configuredExecutable = process.env.PYTHON_EXECUTABLE?.trim();
  if (configuredExecutable) return configuredExecutable;

  const virtualEnvironmentExecutable = process.platform === "win32"
    ? path.resolve(process.cwd(), ".venv", "Scripts", "python.exe")
    : path.resolve(process.cwd(), ".venv", "bin", "python");

  if (fs.existsSync(virtualEnvironmentExecutable)) {
    return virtualEnvironmentExecutable;
  }

  return process.platform === "win32" ? "python" : "python3";
}

function writeTopicsToTempFile(topics: Topic[]): void {
  fs.writeFileSync(TOPICS_TEMP_FILE, JSON.stringify(topics, null, 2), "utf-8");
}

function cleanUpTopicsTempFile(): void {
  if (fs.existsSync(TOPICS_TEMP_FILE)) fs.unlinkSync(TOPICS_TEMP_FILE);
}

function parsePostsFromAgentOutput(rawOutput: string): LinkedInPost[] {
  try {
    const match = rawOutput.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("[searchLinkedInTopics] Python browser worker returned no JSON object.");
      return [];
    }
    const parsed = JSON.parse(match[0]);
    return (parsed.posts ?? []) as LinkedInPost[];
  } catch (error) {
    console.error("[searchLinkedInTopics] Error parsing agent output:", error);
    return [];
  }
}

function runLinkedInSearchScript(minComments: number, skippedUrls: string[], onProgress?: (msg: string) => void): Promise<string> {
  return new Promise((resolveWithOutput, rejectWithError) => {
    let collectedOutput = "";
    let collectedStderr = "";
    let settled = false;
    const debugLogStream = fs.createWriteStream("python_browser_debug.log", { flags: "a" });

    const finish = (): boolean => {
      if (settled) return false;
      settled = true;
      cleanUpTopicsTempFile();
      debugLogStream.end();
      return true;
    };

    console.error(`[searchLinkedInTopics] Starting Python browser worker with: ${PYTHON_EXECUTABLE}`);

    const childProcess = spawn(
      PYTHON_EXECUTABLE,
      [LINKEDIN_SEARCH_SCRIPT, TOPICS_TEMP_FILE, String(minComments)],
      {
        shell: false,
        stdio: ["inherit", "pipe", "pipe"],
        env: {
          ...process.env,
          PYTHONUTF8: "1",
          PYTHONIOENCODING: "utf-8",
          PYTHONUNBUFFERED: "1",
          SKIPPED_POST_URLS: JSON.stringify(skippedUrls),
        },
      }
    );

    childProcess.stdout.on("data", (chunk: Buffer) => collectedOutput += chunk.toString("utf-8"));
    
    let stderrBuffer = "";
    childProcess.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf-8");
      collectedStderr += text;
      if (collectedStderr.length > 4000) collectedStderr = collectedStderr.slice(-4000);
      debugLogStream.write(text);
      process.stderr.write(`[python] ${text}`);
      
      // Parse progress for the spinner
      if (onProgress) {
        stderrBuffer += text;
        const lines = stderrBuffer.split("\n");
        // Keep the last incomplete line in the buffer
        stderrBuffer = lines.pop() ?? "";
        
        for (const line of lines) {
          if (line.includes("🎯 Next goal:")) {
            const goalMatch = line.match(/🎯 Next goal:\s*(.*)/);
            if (goalMatch && goalMatch[1]) {
              // Strip ANSI escape codes
              const cleanGoal = goalMatch[1].replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "").trim();
              onProgress(`Agent thinking: ${cleanGoal}`);
            }
          } else if (line.includes("▶️")) {
             const actionMatch = line.match(/▶️.*?([a-zA-Z_]+)\s*:/);
             if (actionMatch && actionMatch[1]) {
               const actionName = actionMatch[1].trim();
               if (actionName === 'click') onProgress("Agent action: Clicking on the page...");
               else if (actionName === 'input' || actionName === 'send_keys') onProgress("Agent action: Typing search query...");
               else if (actionName === 'scroll') onProgress("Agent action: Scrolling down to load more posts...");
               else if (actionName === 'extract') onProgress("Agent action: Extracting posts from the screen...");
               else if (actionName === 'evaluate') onProgress("Agent action: Running Javascript to extract URLs...");
               else if (actionName === 'return_extracted_json') onProgress("Agent action: Returning extracted posts to the pipeline...");
             }
          }
        }
      }
    });
    
    childProcess.on("close", (exitCode, signal) => {
      if (!finish()) return;

      if (exitCode !== 0 || signal) {
        const outputDetails = collectedStderr.trim();
        const details = outputDetails ? `\nLast Python output:\n${outputDetails}` : "";
        rejectWithError(new Error(
          `[searchLinkedInTopics] Python browser worker failed (exit code ${exitCode ?? "unknown"}, signal ${signal ?? "none"}).${details}`,
        ));
        return;
      }

      if (!collectedOutput.trim()) {
        rejectWithError(new Error(
          "[searchLinkedInTopics] Python browser worker exited successfully but returned no post JSON.",
        ));
        return;
      }

      resolveWithOutput(collectedOutput);
    });
    childProcess.on("error", (processError) => {
      if (!finish()) return;
      const errorMessage = `[searchLinkedInTopics] Could not start Python browser worker (${PYTHON_EXECUTABLE}): ${processError.message}`;
      console.error(errorMessage);
      rejectWithError(new Error(errorMessage, { cause: processError }));
    });
  });
}

import { Spinner } from "../utils/spinner.js";

export async function searchLinkedInTopics(state: ResearchState): Promise<Partial<ResearchState>> {
  console.log("=================================");
  console.log("Step 5: Search LinkedIn for Topics");
  console.log("=================================");

  if (!state.topics?.length) throw new Error("searchLinkedInTopics requires topics in state");

  writeTopicsToTempFile(state.topics as Topic[]);
  
  const minComments = state.minComments ?? 0;

  const sessionSkippedUrls = state.skippedPostUrls ?? [];
  const existingFirebaseUrls = await fetchSavedPostUrls();
  const allSkippedUrls = [...new Set([...sessionSkippedUrls, ...existingFirebaseUrls])];

  const spinner = new Spinner(`🤖 Starting browser search...`);
  spinner.start();

  let lastLoggedMsg = "";

  try {
    const rawAgentOutput = await runLinkedInSearchScript(minComments, allSkippedUrls, (msg) => {
      // Prevent line wrapping which breaks the spinner's clearLine()
      const maxLen = process.stdout.columns ? process.stdout.columns - 5 : 80;
      const truncatedMsg = msg.length > maxLen ? msg.substring(0, maxLen - 3) + "..." : msg;

      spinner.updateMessage(truncatedMsg);

      if (lastLoggedMsg !== msg) {
        spinner.logAbove(`   ${msg}`);
        lastLoggedMsg = msg;
      }
    });

    const candidatePosts = parsePostsFromAgentOutput(rawAgentOutput);

    spinner.stop(`Found ${candidatePosts.length} candidate posts across all topics`);
    return { candidatePosts };
  } catch (error) {
    spinner.stop("Browser search failed; see the Python error above");
    throw error;
  }
}
