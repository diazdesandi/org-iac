import type {
	BranchProtectionConfig,
	BranchProtectionEntry,
	LabelSet,
	OrgConfig,
	RepoConfig,
	ResolvedRepoConfig,
	TeamAccess,
	TeamResourceMap,
	TeamsConfig,
} from "@/types";
import { normalizeActors, normalizeBranchPattern } from "./utils";

// Branch protection

function toBranchProtectionEntry(
	config: BranchProtectionConfig,
	organization: string,
): BranchProtectionEntry {
	const dismissalRestrictions = normalizeActors(
		config.restrictDismissalsToTeams,
		organization,
	);

	const prReviewConfig = {
		requiredApprovingReviewCount: config.requiredReviewCount,
		dismissStaleReviews: config.dismissStaleReviews,
		requireCodeOwnerReviews: config.requireCodeOwnerReviews,
		...(dismissalRestrictions ? { dismissalRestrictions } : {}),
	};
	const hasPrReviews = Object.values(prReviewConfig).some(
		(v) => v !== undefined,
	);

	return {
		enforceAdmins: config.enforceAdmins ?? true,
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
		requiredPullRequestReviews: hasPrReviews ? [prReviewConfig] : undefined,
	};
}

// Team access

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

// Repo config

export interface RepoBuildContext {
	defaults: OrgConfig["defaults"];
	teamAccess: TeamAccess[];
	labels: LabelSet;
	organization: string;
}

export function buildRepoConfig(
	repo: RepoConfig,
	ctx: RepoBuildContext,
): ResolvedRepoConfig {
	const { defaults, teamAccess, labels, organization } = ctx;
	const { features } = defaults;

	// Branch protection comes only from explicit per-repo config; org rulesets
	// own branch enforcement. Keys are normalized so "main", "~DEFAULT_BRANCH",
	// and "refs/heads/main" collapse to a single pattern.
	const resolvedBranchProtection: Record<string, BranchProtectionEntry> =
		Object.fromEntries(
			Object.entries(repo.branchProtection ?? {}).map(([pattern, config]) => [
				normalizeBranchPattern(pattern, defaults.defaultBranch),
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
		resolvedBranchProtection,
		squashMergeCommitTitle: defaults.squashMergeCommitTitle,
		squashMergeCommitMessage: defaults.squashMergeCommitMessage,
	};
}
