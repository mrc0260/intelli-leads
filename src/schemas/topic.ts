import { z } from "zod";

export const TopicSchema = z.object({
  id: z.string().describe("A unique identifier for the topic (e.g. 'maintenance-coordination')"),
  name: z.string().describe("A short, descriptive name for the topic"),
  description: z.string().describe("A full description of the topic and why it's discussed"),
  category: z.enum([
    "problem",
    "pain",
    "workflow",
    "question",
    "event",
    "frustration",
    "tool",
    "trend",
    "regulation",
    "other"
  ]).describe("The category of the topic"),
  relatedTerms: z.array(z.string()).describe("Related keywords, jargon, or terms used in discussions"),
  customerRelevance: z.coerce.number().min(0).max(1).describe("How relevant this is to the target customer's pain points"),
  initialConfidence: z.coerce.number().min(0).max(1).describe("Confidence that this topic will generate real conversations"),
  reasoning: z.string().describe("Why you believe this topic is discussed by the target audience")
});

export type Topic = z.infer<typeof TopicSchema>;

export const TopicsSchema = z.object({
  topics: z.array(TopicSchema)
});
