import * as v from "valibot";

export const EnvironmentConfigSchema = v.object({
	name: v.string(),
	requiredReviewerTeamSlugs: v.optional(v.array(v.string())),
	deploymentBranchPolicy: v.optional(v.picklist(["protected", "unprotected"])),
});

export type EnvironmentConfig = v.InferOutput<typeof EnvironmentConfigSchema>;
