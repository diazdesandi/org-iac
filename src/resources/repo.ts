import github from "@pulumi/github";
import type { RepoConfig, RepoResult, TeamResourceMap } from "@/types";
import { createBranchProtection } from "./branch";
import { createEnvironments } from "./environments";
import { createLabels } from "./labels";

export function createRepo(
	config: RepoConfig,
	teamResources: TeamResourceMap,
	organization: string,
): RepoResult {
	const {
		name,
		description,
		visibility,
		topics,
		homepage,
		merge_strategies,
		delete_branch_on_merge,
		has_issues,
		has_wiki,
		has_projects,
		auto_init,
		archived,
		teams,
		branch_protection,
		environments,
		labels,
	} = config;

	const mergeStrategies = merge_strategies ?? ["squash"];
	const repoTopics = topics ?? [];
	const deleteBranchOnMerge = delete_branch_on_merge ?? true;
	const hasIssues = has_issues ?? true;
	const hasWiki = has_wiki ?? false;
	const hasProjects = has_projects ?? false;
	const autoInit = auto_init ?? false;
	const isArchived = archived ?? false;
	const allowMergeCommit = mergeStrategies.includes("merge");
	const allowRebaseMerge = mergeStrategies.includes("rebase");
	const allowSquashMerge = mergeStrategies.includes("squash");
	const squashMergeSettings = allowSquashMerge
		? {
				squashMergeCommitTitle: "PR_TITLE",
				squashMergeCommitMessage: "COMMIT_MESSAGES",
			}
		: {};
	const labelsToCreate = labels ?? {};
	const hasLabels = Object.keys(labelsToCreate).length > 0;

	const repo = new github.Repository(name, {
		name,
		description,
		visibility,
		topics: repoTopics,
		homepageUrl: homepage,

		// Merge settings
		allowMergeCommit,
		allowRebaseMerge,
		allowSquashMerge,
		deleteBranchOnMerge,
		...squashMergeSettings,

		// Features
		hasIssues,
		hasWiki,
		hasProjects,
		// has_discussions is configured but requires @pulumi/github >=6.x to apply

		autoInit,
		archived: isArchived,
	});

	const repoTeams = teams ?? [];
	for (const team of repoTeams) {
		const teamResourceName = `${name}-team-${team.slug}`;
		new github.TeamRepository(
			teamResourceName,
			{
				repository: repo.name,
				teamId: team.teamId,
				permission: team.permission,
			},
			{ dependsOn: [repo] },
		);
	}

	const branchProtectionEntries = Object.entries(branch_protection ?? {});
	const branchProtections = branchProtectionEntries.map(([pattern, bpConfig]) =>
		createBranchProtection(name, pattern, bpConfig, repo, organization),
	);

	const environmentsList = environments ?? [];
	const environmentResources = createEnvironments({
		repoName: name,
		environments: environmentsList,
		repo,
		teamResources,
	});

	if (hasLabels) {
		createLabels(name, labelsToCreate, repo);
	}

	return { repo, branchProtections, environments: environmentResources };
}
