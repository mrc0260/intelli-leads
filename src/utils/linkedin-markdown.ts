import * as fs from "node:fs";
import * as path from "node:path";
import type { LinkedInPost } from "../schemas/linkedin-post.js";

function valueOrEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function escapeMarkdown(value: unknown): string {
  return valueOrEmpty(value).replace(/[\\`*_{}\[\]<>#+.!|]/g, "\\$&");
}

function quoteText(value: unknown): string {
  const text = valueOrEmpty(value);
  if (!text) return "> (not provided)";
  return text.split(/\r?\n/).map((line) => `> ${line || " "}`).join("\n");
}

function linkedinUrl(value: unknown): string | null {
  const rawUrl = valueOrEmpty(value);
  if (!rawUrl) return null;

  try {
    const parsedUrl = new URL(rawUrl);
    const hostname = parsedUrl.hostname.toLowerCase();
    if (parsedUrl.protocol !== "https:" || (hostname !== "linkedin.com" && !hostname.endsWith(".linkedin.com"))) {
      return null;
    }
    return rawUrl;
  } catch {
    return null;
  }
}

function linkedinPostUrl(value: unknown): string | null {
  const url = linkedinUrl(value);
  if (!url) return null;
  const pathname = new URL(url).pathname.toLowerCase();
  return pathname.includes("/feed/update/") || pathname.includes("/posts/") ? url : null;
}

function linkedinProfileUrl(value: unknown): string | null {
  const url = linkedinUrl(value);
  if (!url) return null;
  const pathname = new URL(url).pathname.toLowerCase();
  return pathname.includes("/in/") || pathname.includes("/company/") ? url : null;
}

function linkedinCommentUrl(value: unknown): string | null {
  const url = linkedinUrl(value);
  if (!url) return null;
  const parsedUrl = new URL(url);
  const hasCommentParameter = [...parsedUrl.searchParams.keys()]
    .some((key) => key.toLowerCase().includes("comment"));
  return hasCommentParameter || parsedUrl.pathname.toLowerCase().includes("comment") ? url : null;
}

type UrlValidator = (value: unknown) => string | null;

function renderUrl(label: string, value: unknown, validate: UrlValidator = linkedinUrl): string {
  const url = validate(value);
  if (!url) return "Not available from the page";
  return label ? `[${escapeMarkdown(label)}](<${url}>)` : `<${url}>`;
}

function safeFilenamePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "linkedin-search";
}

function timestampParts(capturedAt: Date): { day: string; time: string; display: string } {
  const pad = (value: number): string => String(value).padStart(2, "0");
  const day = `${capturedAt.getFullYear()}-${pad(capturedAt.getMonth() + 1)}-${pad(capturedAt.getDate())}`;
  const time = `${pad(capturedAt.getHours())}-${pad(capturedAt.getMinutes())}-${pad(capturedAt.getSeconds())}`;
  return { day, time, display: `${day} ${time.replaceAll("-", ":")}` };
}

export function writeLinkedInSearchMarkdown(
  posts: LinkedInPost[],
  initialInput: string,
  topics: string[],
  capturedAt = new Date(),
): string {
  const { day, time, display } = timestampParts(capturedAt);
  const topicPart = safeFilenamePart(topics[0] || "linkedin-search");
  const outputDirectory = path.resolve(process.cwd(), "output", day);
  const outputPath = path.join(outputDirectory, `${day}_${time}_${topicPart}.md`);
  const lines: string[] = [
    "# LinkedIn Search Results",
    "",
    `- Captured: ${display}`,
    `- Posts found: ${posts.length}`,
    "",
    "## Original Request",
    quoteText(initialInput),
    "",
    "## Topics Searched",
  ];

  if (topics.length) {
    lines.push(...topics.map((topic) => `- ${escapeMarkdown(topic)}`));
  } else {
    lines.push("- Not available");
  }

  lines.push("", "## Posts", "");

  if (!posts.length) {
    lines.push("No posts were returned.");
  }

  posts.forEach((post, postIndex) => {
    const title = valueOrEmpty(post.authorName) || `Post ${postIndex + 1}`;
    const interactions = Array.isArray(post.interactions) ? post.interactions : [];
    lines.push(
      `### ${postIndex + 1}. ${escapeMarkdown(title)}`,
      "",
      `- Post URL: ${renderUrl("Open post", post.postUrl, linkedinPostUrl)}`,
      `- Author: ${renderUrl(valueOrEmpty(post.authorName) || "Open author", post.authorUrl, linkedinProfileUrl)}`,
      `- Job title: ${escapeMarkdown(post.jobTitle) || "Not provided"}`,
      `- Company: ${escapeMarkdown(post.company) || "Not provided"}`,
      `- Location: ${escapeMarkdown(post.location) || "Not provided"}`,
      `- Reactions: ${post.reactionCount}`,
      `- Comments shown: ${post.commentCount}`,
      `- Discovered: ${escapeMarkdown(post.discoveredAt) || display}`,
      "",
      "#### Post Text",
      quoteText(post.postText),
      "",
      "#### Comments",
    );

    if (!interactions.length) {
      lines.push("No comments were extracted.", "");
      return;
    }

    interactions.forEach((interaction, interactionIndex) => {
      lines.push(
        `${interactionIndex + 1}. ${renderUrl(valueOrEmpty(interaction.username) || "Open commenter", interaction.user_url, linkedinProfileUrl)}`,
        `   - Comment URL: ${renderUrl("Open comment", interaction.comment_url, linkedinCommentUrl)}`,
        `   - Reply target: ${renderUrl("Open reply target", interaction.comment_reply_to_user_url, linkedinProfileUrl)}`,
        `   - Time: ${escapeMarkdown(interaction.time) || "Not provided"}`,
        `   - Type: ${escapeMarkdown(interaction.interaction_type) || "comment"}`,
        "   - Text:",
        quoteText(interaction.value).split("\n").map((line) => `   ${line}`).join("\n"),
        "",
      );
    });
  });

  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf-8");
  return outputPath;
}
