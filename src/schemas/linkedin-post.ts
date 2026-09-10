import { z } from "zod";

export const InteractionSchema = z.object({
  interaction_type: z.string().describe("'reaction' or 'comment'"),
  user_url: z.string().describe("URL of the interacting user"),
  username: z.string().describe("Name of the interacting user"),
  value: z.string().describe("Reaction type (e.g. 'thumbs_up') or comment text"),
  time: z.string().describe("Timestamp or relative time of the interaction"),
  comment_reply_to_user_url: z.string().optional().nullable().describe("URL of user being replied to, if any"),
});

export type Interaction = z.infer<typeof InteractionSchema>;

/** A LinkedIn post discovered during topic research */
export const LinkedInPostSchema = z.object({
  postUrl:      z.string().describe("Direct URL to the LinkedIn post"),
  authorName:   z.string().describe("Full name of the post author"),
  authorUrl:    z.string().describe("URL to the author's LinkedIn profile"),
  jobTitle:     z.string().describe("Author's current job title"),
  company:      z.string().describe("Author's current company"),
  location:     z.string().describe("Author's stated location"),
  postText:     z.string().describe("The full text content of the post"),
  topicId:      z.string().describe("The topic ID this post was found under"),
  reactionCount: z.number().describe("Total number of reactions on the post"),
  commentCount:  z.number().describe("Total number of comments on the post"),
  discoveredAt:  z.string().describe("ISO timestamp when this post was found"),
  interactions:  z.array(InteractionSchema).optional().default([]).describe("Interactions scraped from the post"),
});

export type LinkedInPost = z.infer<typeof LinkedInPostSchema>;

/** A comment on a LinkedIn post, used for deeper conversation analysis */
export const LinkedInCommentSchema = z.object({
  postUrl:       z.string(),
  authorName:    z.string(),
  authorUrl:     z.string(),
  jobTitle:      z.string(),
  commentText:   z.string(),
  isTargetCustomer: z.boolean().describe("Whether the commenter matches the target customer profile"),
  problemsDiscussed: z.array(z.string()).describe("Key problems mentioned in the comment"),
  canWeContribute:   z.boolean().describe("Whether the agent could add value to this conversation"),
  shouldResearchFurther: z.boolean().describe("Whether this comment suggests a new research direction"),
});

export type LinkedInComment = z.infer<typeof LinkedInCommentSchema>;
