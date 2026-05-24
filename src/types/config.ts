import { z } from "zod";
import { LabelSetSchema } from "./label";
import {
	MergeStrategySchema,
	RepoConfigSchema,
	RepoVisibilitySchema,
} from "./repo";
import { TeamsConfigSchema } from "./team";

const OrgFeaturesSchema = z.object({
	issues: z.boolean(),
	wiki: z.boolean(),
	projects: z.boolean(),
	discussions: z.boolean(),
});

const OrgDefaultsSchema = z.object({
	visibility: RepoVisibilitySchema,
	default_branch: z.string(),
	delete_branch_on_merge: z.boolean(),
	merge_strategies: z.array(MergeStrategySchema),
	features: OrgFeaturesSchema,
});

export const OrgConfigSchema = z.object({
	owner: z.string(),
	organization: z.string(),
	defaults: OrgDefaultsSchema,
});

export const LabelGroupsSchema = z.record(z.string(), LabelSetSchema);

const RulesetPullRequestRuleSchema = z.object({
	required_approving_review_count: z.number().optional(),
	dismiss_stale_reviews_on_push: z.boolean().optional(),
	require_code_owner_review: z.boolean().optional(),
});

const RulesetStatusChecksSchema = z.object({
	strict: z.boolean().optional(),
	checks: z.array(z.object({ context: z.string() })).optional(),
});

const RulesetRulesSchema = z.object({
	required_linear_history: z.boolean().optional(),
	deletion: z.boolean().optional(),
	non_fast_forward: z.boolean().optional(),
	pull_request: RulesetPullRequestRuleSchema.optional(),
	required_status_checks: RulesetStatusChecksSchema.optional(),
});

const RulesetConditionsSchema = z.object({
	include: z.array(z.string()),
});

export const RulesetConfigSchema = z.object({
	id: z.string(),
	target: z.literal("branch"),
	enforcement: z.enum(["active", "disabled"]).optional(),
	conditions: RulesetConditionsSchema,
	rules: RulesetRulesSchema,
});

export const ReposFileSchema = z.object({
	repos: z.array(RepoConfigSchema),
});

export const RulesetsFileSchema = z.object({
	rulesets: z.array(RulesetConfigSchema),
});

export const InfraConfigSchema = z.object({
	org: OrgConfigSchema,
	repos: z.array(RepoConfigSchema),
	teams: TeamsConfigSchema,
	rulesets: z.array(RulesetConfigSchema),
	labels: LabelSetSchema,
});

export type OrgConfig = z.infer<typeof OrgConfigSchema>;
export type LabelGroups = z.infer<typeof LabelGroupsSchema>;
export type RulesetConfig = z.infer<typeof RulesetConfigSchema>;
export type InfraConfig = z.infer<typeof InfraConfigSchema>;
