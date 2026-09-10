import { ChatOpenAI } from "@langchain/openai";
import * as dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.LLM_API_KEY;
if (!apiKey) throw new Error("Missing required env var: LLM_API_KEY");

export const intelliModelLLM = new ChatOpenAI({
  modelName: process.env.LLM_MODEL,
  apiKey,
  configuration: {
    baseURL: process.env.MODEL_BASE_URL,
  },
  temperature: 0.2, // low temperature for better structured output
});
