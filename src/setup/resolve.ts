import { mapValues, omitBy } from "es-toolkit";
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
import { normalizeActors, normalizeBranchPattern } from "./utils";

// ── Branch protection ────────────────────────────────────────────────────────

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

						allowsDeletions:
							r.rules.deletion === undefined ? undefined : !r.rules.deletion,
						allowsForcePushes:
							r.rules.nonFastForward === undefined
								? undefined
								: !r.rules.nonFastForward,
					},
					organization,
				),
			})),
		)
		.reduce<Record<string, BranchProtectionEntry>>(
			(acc, { pattern, entry }) => {
				acc[pattern] = {
					...acc[pattern],
					...omitBy(entry, (v) => v === undefined),
				};
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

	const repoBranchProtection = mapValues(
		repo.branchProtection ?? {},
		(config) => toBranchProtectionEntry(config, organization),
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
		resolvedBranchProtection: { ...rulesetProtections, ...repoBranchProtection },
		squashMergeCommitTitle: "PR_TITLE",
		squashMergeCommitMessage: "COMMIT_MESSAGES",
	};
}
