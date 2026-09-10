import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ResearchState } from "../graph/state.js";
import type { Interaction, LinkedInPost } from "../schemas/linkedin-post.js";

const OUTPUT_DIRECTORY = resolve(process.cwd(), "output");

type SavedPost = Omit<LinkedInPost, "interactions"> & {
  savedAt: string;
  other_users_interactions: Record<string, Interaction>;
  user_interaction: Record<string, Interaction>;
};

/** Return the output filename for a post. A URL hash keeps it stable across runs. */
function getPostOutputPath(post: LinkedInPost): string {
  const contentToHash = post.postUrl || `${post.authorName}-${post.postText}`;
  const postId = createHash("sha256").update(contentToHash).digest("hex").slice(0, 16);
  return resolve(OUTPUT_DIRECTORY, `linkedin-post-${postId}.txt`);
}

/** Read the URLs already saved locally so the agent does not process a post twice. */
export async function fetchSavedPostUrls(): Promise<string[]> {
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  const files = await readdir(OUTPUT_DIRECTORY, { withFileTypes: true });
  const urls = await Promise.all(
    files
      .filter((file) => file.isFile() && file.name.endsWith(".txt"))
      .map(async (file) => {
        try {
          const savedPost = JSON.parse(await readFile(resolve(OUTPUT_DIRECTORY, file.name), "utf8")) as Partial<SavedPost>;
          return typeof savedPost.postUrl === "string" ? savedPost.postUrl : undefined;
        } catch {
          console.warn(`Skipping unreadable output file: ${file.name}`);
          return undefined;
        }
      }),
  );

  return urls.filter((url): url is string => url !== undefined);
}

function formatPostForOutput(linkedInPost: LinkedInPost): any {
  // We remove internal fields the user doesn't want to see in the final JSON
  const { 
    isSentimentPolarized, 
    sentimentDetails, 
    emotionalCommentCount, 
    totalCommentsAnalyzed, 
    ...cleanPostData 
  } = linkedInPost as any;

  return {
    ...cleanPostData,
    savedAt: new Date().toLocaleString("en-US", { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      timeZoneName: 'short'
    }),
  };
}

/** Save a single post as a human-readable JSON document with a .txt extension. */
async function savePostToOutput(linkedInPost: LinkedInPost): Promise<boolean> {
  const outputPath = getPostOutputPath(linkedInPost);

  try {
    await writeFile(outputPath, `${JSON.stringify(formatPostForOutput(linkedInPost), null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    return true;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  }
}

import { Spinner } from "../utils/spinner.js";

/** Persist eligible LinkedIn posts as .txt files in the local output directory. */
export async function saveReactionsToOutput(state: ResearchState): Promise<Partial<ResearchState>> {
  console.log("=================================");
  console.log("Step 6: Save Reactions to Output");
  console.log("=================================");

  const minComments = state.minComments ?? 0;
  const spinner = new Spinner(`Saving posts with at least ${minComments} comments...`);
  spinner.start();

  // Filter posts mathematically
  const validPosts = ((state.candidatePosts ?? []) as LinkedInPost[]).filter(
    (post) => post.commentCount >= minComments
  );

  const existingUrls = await fetchSavedPostUrls();
  const newPosts = validPosts.filter((post) => {
    const pUrl = post.postUrl || "";
    if (!pUrl) {
      // If the URL is missing, we can't reliably deduplicate it against existing URLs,
      // but we shouldn't automatically mark it as a duplicate of everything.
      return true; // Keep posts with missing URLs
    }
    const isDuplicate = existingUrls.some((url) => url && (pUrl.includes(url) || url.includes(pUrl)));
    if (isDuplicate) console.log(`\nSkipping duplicate: ${post.authorName} — ${pUrl}`);
    return !isDuplicate;
  });

  const saveResults = await Promise.all(newPosts.map(savePostToOutput));
  const savedCount = saveResults.filter(Boolean).length;
  
  spinner.stop(`Saved ${savedCount} reaction records to ${OUTPUT_DIRECTORY}`);
  return {};
}
