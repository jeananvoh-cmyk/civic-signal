import { z } from "zod";
import {
  MAX_IMPACTED_PEOPLE,
  MAX_VULNERABLE,
  MAX_DESCRIPTION_LENGTH,
} from "@/lib/constants";

export const reportDetailsSchema = z
  .object({
    impactedPeople: z
      .number({ invalid_type_error: "Nombre requis" })
      .int()
      .min(1, "Au moins 1 personne impactée")
      .max(MAX_IMPACTED_PEOPLE, `Maximum ${MAX_IMPACTED_PEOPLE} personnes`),
    babies: z
      .number()
      .int()
      .min(0)
      .max(MAX_VULNERABLE, `Maximum ${MAX_VULNERABLE} bébés`),
    pregnant: z
      .number()
      .int()
      .min(0)
      .max(MAX_VULNERABLE, `Maximum ${MAX_VULNERABLE} femmes enceintes`),
    elderly: z
      .number()
      .int()
      .min(0)
      .max(MAX_VULNERABLE, `Maximum ${MAX_VULNERABLE} personnes âgées`),
    description: z
      .string()
      .max(
        MAX_DESCRIPTION_LENGTH,
        `Description trop longue (max ${MAX_DESCRIPTION_LENGTH} caractères)`
      )
      .optional(),
  })
  .refine(
    (d) => d.babies + d.pregnant + d.elderly <= d.impactedPeople,
    {
      message:
        "Le total des personnes vulnérables ne peut pas dépasser le nombre de personnes impactées",
      path: ["babies"],
    }
  );

export type ReportDetailsInput = z.infer<typeof reportDetailsSchema>;
