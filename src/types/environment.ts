import { z } from "zod";

export const EnvironmentConfigSchema = z.object({
	name: z.string(),
	requiredReviewerTeamSlugs: z.array(z.string()).optional(),
	deploymentBranchPolicy: z.enum(["protected", "unprotected"]).optional(),
});

export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;
