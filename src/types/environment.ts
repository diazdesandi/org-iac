import * as v from "valibot";

export const EnvironmentConfigSchema = v.strictObject({
	name: v.string(),
	requiredReviewerTeamSlugs: v.optional(v.array(v.string())),
	deploymentBranchPolicy: v.optional(v.picklist(["protected", "unprotected"])),
});

export type EnvironmentConfig = v.InferOutput<typeof EnvironmentConfigSchema>;
