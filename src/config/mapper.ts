import type {
	BranchProtectionConfig,
	LabelSet,
	OrgConfig,
	RepoConfig,
	RulesetConfig,
	TeamAccess,
} from "@/types";

function branchProtectionFromRuleset(
	ruleset: RulesetConfig,
): BranchProtectionConfig {
	const {
		rules: {
			pull_request,
			required_status_checks,
			required_linear_history,
			deletion,
			non_fast_forward,
		},
	} = ruleset;

	const requiredReviewCount = pull_request?.required_approving_review_count;
	const dismissStaleReviews = pull_request?.dismiss_stale_reviews_on_push;
	const requireCodeOwnerReview = pull_request?.require_code_owner_review;
	const requiredStatusChecks = required_status_checks?.checks?.map(
		(check) => check.context,
	);
	const strictStatusChecks = required_status_checks?.strict;

	return {
		required_review_count: requiredReviewCount,
		dismiss_stale_reviews: dismissStaleReviews,
		require_code_owner_review: requireCodeOwnerReview,
		required_status_checks: requiredStatusChecks,
		strict_status_checks: strictStatusChecks,
		require_linear_history: required_linear_history,
		allow_deletions: deletion,
		allow_force_pushes: non_fast_forward,
	};
}

function normalizeBranchPattern(
	pattern: string,
	defaultBranch: string,
): string {
	if (pattern === "~DEFAULT_BRANCH") return defaultBranch;
	return pattern.replace(/^refs\/heads\//, "");
}

export function buildRulesetBranchProtection(
	rulesets: RulesetConfig[],
	defaultBranch: string,
): Record<string, BranchProtectionConfig> {
	return rulesets
		.filter((r) => r.target === "branch" && r.enforcement !== "disabled")
		.flatMap((r) =>
			r.conditions.include.map((pattern) => ({
				pattern: normalizeBranchPattern(pattern, defaultBranch),
				config: branchProtectionFromRuleset(r),
			})),
		)
		.reduce<Record<string, BranchProtectionConfig>>(
			(acc, { pattern, config }) => {
				acc[pattern] = { ...acc[pattern], ...config };
				return acc;
			},
			{},
		);
}

export function buildRepoConfig(
	repo: RepoConfig,
	defaults: OrgConfig["defaults"],
	rulesetBranchProtection: Record<string, BranchProtectionConfig>,
	teamAccess: TeamAccess[] = [],
	defaultLabels: LabelSet = {},
): RepoConfig {
	const {
		name,
		description,
		topics,
		homepage,
		auto_init,
		archived,
		branch_protection,
		labels,
		visibility,
		merge_strategies,
		delete_branch_on_merge,
		has_issues,
		has_wiki,
		has_projects,
		has_discussions,
		environments,
	} = repo;
	const {
		visibility: defaultVisibility,
		merge_strategies: defaultMergeStrategies,
		delete_branch_on_merge: defaultDeleteBranchOnMerge,
		features: {
			issues: defaultIssues,
			wiki: defaultWiki,
			projects: defaultProjects,
			discussions: defaultDiscussions,
		},
	} = defaults;

	const repoVisibility = visibility ?? defaultVisibility;
	const mergeStrategies = merge_strategies ?? defaultMergeStrategies;
	const deleteBranchOnMerge =
		delete_branch_on_merge ?? defaultDeleteBranchOnMerge;
	const hasIssues = has_issues ?? defaultIssues;
	const hasWiki = has_wiki ?? defaultWiki;
	const hasProjects = has_projects ?? defaultProjects;
	const hasDiscussions = has_discussions ?? defaultDiscussions;
	const branchProtection = { ...rulesetBranchProtection, ...branch_protection };
	const mergedLabels = { ...defaultLabels, ...labels };
	const repoEnvironments = environments ?? [];

	return {
		name,
		description,
		visibility: repoVisibility,
		topics,
		homepage,
		merge_strategies: mergeStrategies,
		delete_branch_on_merge: deleteBranchOnMerge,
		has_issues: hasIssues,
		has_wiki: hasWiki,
		has_projects: hasProjects,
		has_discussions: hasDiscussions,
		auto_init,
		archived,
		branch_protection: branchProtection,
		labels: mergedLabels,
		teams: teamAccess,
		environments: repoEnvironments,
	};
}
