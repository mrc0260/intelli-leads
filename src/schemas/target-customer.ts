import { z } from "zod";

export const TargetCustomerSchema = z.object({
  industry: z.string().describe("The industry or domain"),
  roles: z.array(z.string()).describe("The actual people we want to reach"),
  geography: z.array(z.string()).optional().describe("Their geographic market"),
  companyTypes: z.array(z.string()).optional().describe("The types of organizations they work for"),
  companySize: z.array(z.string()).optional().describe("Their likely company size when inferable"),
  problems: z.array(z.string()).optional().describe("Their operational problems"),
  goals: z.array(z.string()).optional().describe("Their desired outcomes"),
  buyingContext: z.array(z.string()).optional().describe("Situations that may cause them to look for a solution"),
  exclusions: z.array(z.string()).optional().describe("People and discussion areas that should be excluded"),
  confidence: z.coerce.number().min(0).max(1).describe("Your confidence in this profile"),
  assumptions: z.array(z.string()).describe("Any assumptions made")
});

export type TargetCustomer = z.infer<typeof TargetCustomerSchema>;
