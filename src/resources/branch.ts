import github from "@pulumi/github";
import type { BranchProtectionConfig } from "@/types";

export function createBranchProtection(
	repoName: string,
	pattern: string,
	config: BranchProtectionConfig,
	repo: github.Repository,
	organization: string,
): github.BranchProtection {
	const normalizeActors = (actors?: string[]): string[] | undefined => {
		if (!actors || actors.length === 0) return undefined;
		return actors.map((actor) =>
			actor.startsWith("/") || actor.includes("/")
				? actor
				: `${organization}/${actor}`,
		);
	};

	const dismissalRestrictions = normalizeActors(
		config.restrict_dismissals_to_teams,
	);

	const {
		allow_deletions,
		allow_force_pushes,
		require_signed_commits,
		require_linear_history,
		require_conversation_resolution,
		strict_status_checks,
		required_status_checks,
		required_review_count,
		dismiss_stale_reviews,
		require_code_owner_review,
	} = config;

	const resourceName = `${repoName}-bp-${pattern.replace(/\//g, "-")}`;
	const allowsDeletions = allow_deletions ?? false;
	const allowsForcePushes = allow_force_pushes ?? false;
	const requireSignedCommits = require_signed_commits ?? false;
	const requiredLinearHistory = require_linear_history ?? false;
	const requiredReviewCount = required_review_count ?? 1;
	const dismissStaleReviews = dismiss_stale_reviews ?? true;
	const requireCodeOwnerReviews = require_code_owner_review ?? false;
	const requireConversationResolution = require_conversation_resolution;
	const strictStatusChecks = strict_status_checks ?? true;
	const requiredStatusChecks = required_status_checks
		? [
				{
					strict: strictStatusChecks,
					contexts: required_status_checks,
				},
			]
		: undefined;
	const requiredPullRequestReviews = [
		{
			requiredApprovingReviewCount: requiredReviewCount,
			dismissStaleReviews,
			requireCodeOwnerReviews,
			...(dismissalRestrictions ? { dismissalRestrictions } : {}),
		},
	];

	return new github.BranchProtection(
		resourceName,
		{
			repositoryId: repo.nodeId,
			pattern,

			allowsDeletions,
			allowsForcePushes,
			requireSignedCommits,
			requiredLinearHistory,
			requireConversationResolution,
			enforceAdmins: true,

			requiredStatusChecks,
			requiredPullRequestReviews,
		},
		{ dependsOn: [repo] },
	);
}
