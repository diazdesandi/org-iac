import type {
	BranchProtectionConfig,
	BranchProtectionEntry,
	LabelSet,
	OrgConfig,
	RepoConfig,
	ResolvedRepoConfig,
	RulesetConfig,
	TeamAccess,
	TeamResourceMap,
	TeamsConfig,
} from "@/types";

// ── Branch protection ────────────────────────────────────────────────────────

function normalizeActors(
	actors: string[] | undefined,
	org: string,
): string[] | undefined {
	if (!actors?.length) return undefined;
	return actors.map((a) =>
		a.startsWith("/") || a.includes("/") ? a : `${org}/${a}`,
	);
}

function toBranchProtectionEntry(
	config: BranchProtectionConfig,
	organization: string,
): BranchProtectionEntry {
	const dismissalRestrictions = normalizeActors(
		config.restrictDismissalsToTeams,
		organization,
	);

	return {
		enforceAdmins: true,
		allowsDeletions: config.allowsDeletions,
		allowsForcePushes: config.allowsForcePushes,
		requireSignedCommits: config.requireSignedCommits,
		requiredLinearHistory: config.requiredLinearHistory,
		requireConversationResolution: config.requireConversationResolution,
		requiredStatusChecks: config.requiredStatusChecks?.length
			? [
					{
						contexts: config.requiredStatusChecks,
						strict: config.strictStatusChecks,
					},
				]
			: undefined,
		requiredPullRequestReviews: [
			{
				requiredApprovingReviewCount: config.requiredReviewCount,
				dismissStaleReviews: config.dismissStaleReviews,
				requireCodeOwnerReviews: config.requireCodeOwnerReviews,
				...(dismissalRestrictions ? { dismissalRestrictions } : {}),
			},
		],
	};
}

export function normalizeBranchPattern(
	pattern: string,
	defaultBranch: string,
): string {
	if (pattern === "~DEFAULT_BRANCH") return defaultBranch;
	return pattern.replace(/^refs\/heads\//, "");
}

export function buildRulesetBranchProtection(
	rulesets: RulesetConfig[],
	defaultBranch: string,
	organization: string,
): Record<string, BranchProtectionEntry> {
	return rulesets
		.filter((r) => r.target === "branch" && r.enforcement !== "disabled")
		.flatMap((r) =>
			r.conditions.refName.includes.map((pattern) => ({
				pattern: normalizeBranchPattern(pattern, defaultBranch),
				entry: toBranchProtectionEntry(
					{
						requiredReviewCount:
							r.rules.pullRequest?.requiredApprovingReviewCount,
						dismissStaleReviews: r.rules.pullRequest?.dismissStaleReviewsOnPush,
						requireCodeOwnerReviews:
							r.rules.pullRequest?.requireCodeOwnerReview,
						requiredStatusChecks:
							r.rules.requiredStatusChecks?.requiredChecks?.map(
								(c) => c.context,
							),
						strictStatusChecks:
							r.rules.requiredStatusChecks?.strictRequiredStatusChecksPolicy,
						requiredLinearHistory: r.rules.requiredLinearHistory,
						allowsDeletions: r.rules.deletion,
						allowsForcePushes: r.rules.nonFastForward,
					},
					organization,
				),
			})),
		)
		.reduce<Record<string, BranchProtectionEntry>>(
			(acc, { pattern, entry }) => {
				acc[pattern] = { ...acc[pattern], ...entry };
				return acc;
			},
			{},
		);
}

// ── Team access ───────────────────────────────────────────────────────────────

export function resolveTeamAccess(
	repoName: string,
	repoAccess: TeamsConfig["repoAccess"],
	teamResources: TeamResourceMap,
): TeamAccess[] {
	return (repoAccess[repoName] ?? []).map(({ team, permission }) => {
		const resource = teamResources[team];
		if (!resource)
			throw new Error(`Team "${team}" in repoAccess["${repoName}"] not found`);
		return { slug: team, teamId: resource.id, permission };
	});
}

// ── Repo config ───────────────────────────────────────────────────────────────

export interface RepoBuildContext {
	defaults: OrgConfig["defaults"];
	rulesetProtections: Record<string, BranchProtectionEntry>;
	teamAccess: TeamAccess[];
	labels: LabelSet;
	organization: string;
}

export function buildRepoConfig(
	repo: RepoConfig,
	ctx: RepoBuildContext,
): ResolvedRepoConfig {
	const { defaults, rulesetProtections, teamAccess, labels, organization } =
		ctx;
	const { features } = defaults;

	const repoBranchProtection = Object.fromEntries(
		Object.entries(repo.branchProtection ?? {}).map(([pattern, config]) => [
			pattern,
			toBranchProtectionEntry(config, organization),
		]),
	);

	return {
		...repo,
		visibility: repo.visibility ?? defaults.visibility,
		mergeStrategies: repo.mergeStrategies ?? defaults.mergeStrategies,
		deleteBranchOnMerge:
			repo.deleteBranchOnMerge ?? defaults.deleteBranchOnMerge,
		hasIssues: repo.hasIssues ?? features.issues,
		hasWiki: repo.hasWiki ?? features.wiki,
		hasProjects: repo.hasProjects ?? features.projects,
		hasDiscussions: repo.hasDiscussions ?? features.discussions,
		labels: { ...labels, ...repo.labels },
		teams: teamAccess,
		resolvedBranchProtection: {
			...rulesetProtections,
			...repoBranchProtection,
		},
	};
}
