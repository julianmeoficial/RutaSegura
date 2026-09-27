import { z } from "zod";

export const dependencyStatusSchema = z.enum(["ok", "error"]);

export const healthResponseSchema = z.object({
  status: dependencyStatusSchema,
  checks: z.object({
    database: dependencyStatusSchema,
    redis: dependencyStatusSchema,
  }),
});

export type DependencyStatus = z.infer<typeof dependencyStatusSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
