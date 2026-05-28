import { groupBy } from "es-toolkit";
import { z } from "zod";
import { LabelSetSchema } from "./label";
import {
	MergeStrategySchema,
	RepoConfigSchema,
	RepoVisibilitySchema,
} from "./repo";
import { TeamsConfigSchema } from "./team";

function findDuplicates(values: string[]): string[] {
	const groups = groupBy(values, (v) => v);
	return Object.keys(groups).filter((k) => groups[k].length > 1);
}

function refineDuplicates<T>(
	getValues: (data: T) => string[],
	path: string,
	message: (dup: string) => string,
) {
	return (data: T, ctx: z.RefinementCtx) => {
		for (const dup of findDuplicates(getValues(data))) {
			ctx.addIssue({ code: "custom", path: [path], message: message(dup) });
		}
	};
}

const OrgFeaturesSchema = z.object({
	issues: z.boolean(),
	wiki: z.boolean(),
	projects: z.boolean(),
	discussions: z.boolean(),
});

const OrgDefaultsSchema = z.object({
	visibility: RepoVisibilitySchema,
	defaultBranch: z.string(),
	deleteBranchOnMerge: z.boolean(),
	mergeStrategies: z.array(MergeStrategySchema),
	features: OrgFeaturesSchema,
});

export const OrgConfigSchema = z.object({
	owner: z.string(),
	organization: z.string(),
	defaults: OrgDefaultsSchema,
});

export const LabelGroupsSchema = z.record(z.string(), LabelSetSchema);

export const ReposFileSchema = z
	.object({ repos: z.array(RepoConfigSchema) })
	.superRefine(
		refineDuplicates(
			(d) => d.repos.map((r) => r.name),
			"repos",
			(dup) => `duplicate repo name "${dup}"`,
		),
	);

const RulesetPullRequestSchema = z.object({
	requiredApprovingReviewCount: z.number().optional(),
	dismissStaleReviewsOnPush: z.boolean().optional(),
	requireCodeOwnerReview: z.boolean().optional(),
	requireLastPushApproval: z.boolean().optional(),
});

const RulesetRequiredStatusChecksSchema = z.object({
	requiredChecks: z.array(z.object({ context: z.string() })).optional(),
	strictRequiredStatusChecksPolicy: z.boolean().optional(),
});

const RulesetRulesSchema = z.object({
	requiredLinearHistory: z.boolean().optional(),
	deletion: z.boolean().optional(),
	nonFastForward: z.boolean().optional(),
	pullRequest: RulesetPullRequestSchema.optional(),
	requiredStatusChecks: RulesetRequiredStatusChecksSchema.optional(),
});

const RulesetConditionsSchema = z.object({
	refName: z.object({
		includes: z.array(z.string()),
		excludes: z.array(z.string()).optional(),
	}),
});

export const RulesetConfigSchema = z.object({
	id: z.string(),
	name: z.string().optional(),
	target: z.enum(["branch", "tag", "push"]),
	enforcement: z.enum(["active", "disabled", "evaluate"]).default("active"),
	conditions: RulesetConditionsSchema,
	rules: RulesetRulesSchema,
});

export const RulesetsFileSchema = z
	.object({ rulesets: z.array(RulesetConfigSchema) })
	.superRefine(
		refineDuplicates(
			(d) => d.rulesets.map((r) => r.id),
			"rulesets",
			(dup) => `duplicate ruleset id "${dup}"`,
		),
	);

export const InfraConfigSchema = z.object({
	org: OrgConfigSchema,
	labels: LabelSetSchema,
	repos: ReposFileSchema.shape.repos,
	rulesets: RulesetsFileSchema.shape.rulesets,
	teams: TeamsConfigSchema,
});

export type InfraConfig = z.infer<typeof InfraConfigSchema>;
export type OrgConfig = z.infer<typeof OrgConfigSchema>;
export type LabelGroups = z.infer<typeof LabelGroupsSchema>;
export type RulesetConfig = z.infer<typeof RulesetConfigSchema>;
