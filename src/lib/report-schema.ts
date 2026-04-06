import { z } from "zod";
import { MAX_IMPACTED_PEOPLE, MAX_VULNERABLE, MAX_DESCRIPTION_LENGTH } from "./constants";

export const reportDetailsSchema = z.object({
  impactedPeople: z.number().min(0).max(MAX_IMPACTED_PEOPLE),
  babies: z.number().min(0).max(MAX_VULNERABLE),
  elderly: z.number().min(0).max(MAX_VULNERABLE),
  pregnant: z.number().min(0).max(MAX_VULNERABLE),
  description: z.string().min(1).max(MAX_DESCRIPTION_LENGTH),
});
