import type github from "@pulumi/github";
import type { BranchProtectionArgs } from "@pulumi/github/branchProtection";
import { z } from "zod";
import { EnvironmentConfigSchema } from "./environment";
import { LabelSetSchema } from "./label";
import type { TeamAccess } from "./team";

export const RepoVisibilitySchema = z.enum(["public", "private", "internal"]);
export const MergeStrategySchema = z.enum(["merge", "squash", "rebase"]);

// Branch protection mirrors BranchProtectionArgs from Pulumi — no custom schema needed.
// We only validate the fields users can set in YAML; Pulumi owns the rest.
const BranchProtectionSchema = z.object({
	requiredReviewCount: z.number().optional(),
	dismissStaleReviews: z.boolean().optional(),
	requireCodeOwnerReviews: z.boolean().optional(),
	restrictDismissalsToTeams: z.array(z.string()).optional(),
	requiredStatusChecks: z.array(z.string()).optional(),
	strictStatusChecks: z.boolean().optional(),
	requireSignedCommits: z.boolean().optional(),
	requiredLinearHistory: z.boolean().optional(),
	requireConversationResolution: z.boolean().optional(),
	allowsForcePushes: z.boolean().optional(),
	allowsDeletions: z.boolean().optional(),
});

export type BranchProtectionConfig = z.infer<typeof BranchProtectionSchema>;

// What createBranchProtection receives — Pulumi's args minus the repo/pattern identifiers
export type BranchProtectionEntry = Omit<
	BranchProtectionArgs,
	"repositoryId" | "pattern"
>;

export const RepoConfigSchema = z
	.object({
		name: z.string(),
		description: z.string(),
		visibility: RepoVisibilitySchema.optional(),
		topics: z.array(z.string()).optional(),
		homepage: z.string().optional(),
		template: z.string().optional(),
		mergeStrategies: z.array(MergeStrategySchema).optional(),
		deleteBranchOnMerge: z.boolean().optional(),
		autoInit: z.boolean().optional(),
		archived: z.boolean().optional(),
		hasIssues: z.boolean().optional(),
		hasWiki: z.boolean().optional(),
		hasProjects: z.boolean().optional(),
		hasDiscussions: z.boolean().optional(),
		labels: LabelSetSchema.optional(),
		branchProtection: z.record(z.string(), BranchProtectionSchema).optional(),
		environments: z.array(EnvironmentConfigSchema).optional(),
	})
	.superRefine((data, ctx) => {
		const seen = new Set<string>();
		for (const env of data.environments ?? []) {
			if (seen.has(env.name)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["environments"],
					message: `duplicate environment name "${env.name}"`,
				});
			}
			seen.add(env.name);
		}
	});

export type RepoConfig = z.infer<typeof RepoConfigSchema> & {
	teams?: TeamAccess[];
	// Resolved branch protection — Pulumi args ready to use
	resolvedBranchProtection?: Record<string, BranchProtectionEntry>;
};

export type RepoVisibility = z.infer<typeof RepoVisibilitySchema>;
export type MergeStrategy = z.infer<typeof MergeStrategySchema>;

export interface RepoResult {
	repo: github.Repository;
	branchProtections: github.BranchProtection[];
	environments: github.RepositoryEnvironment[];
}
