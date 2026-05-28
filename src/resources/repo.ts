import github from "@pulumi/github";
import pulumi from "@pulumi/pulumi";
import type { ResolvedRepoConfig, TeamResourceMap } from "@/types";
import { createBranchProtection } from "./branch";
import { createEnvironments } from "./environments";
import { createLabels } from "./labels";

// Component resource representing a GitHub repository within an organization, along with its associated settings and resources.
export default class OrgRepository extends pulumi.ComponentResource {
	constructor(
		name: string,
		config: ResolvedRepoConfig,
		teamResources: TeamResourceMap,
		opts?: pulumi.ComponentResourceOptions,
	) {
		super("custom:github:OrgRepository", name, {}, opts);

		const {
			description,
			visibility,
			topics,
			homepage,
			mergeStrategies,
			deleteBranchOnMerge,
			hasIssues,
			hasWiki,
			hasProjects,
			hasDiscussions,
			autoInit,
			archived,
			teams,
			resolvedBranchProtection,
			environments,
			labels,
		} = config;

		const allowSquashMerge = mergeStrategies.includes("squash");

		const repo = new github.Repository(
			name,
			{
				name,
				description,
				visibility,
				deleteBranchOnMerge,
				hasIssues,
				hasWiki,
				hasProjects,
				hasDiscussions,
				autoInit,
				archived,
				topics: topics ?? [],
				homepageUrl: homepage,
				allowMergeCommit: mergeStrategies.includes("merge"),
				allowRebaseMerge: mergeStrategies.includes("rebase"),
				allowSquashMerge,
				...(allowSquashMerge && {
					squashMergeCommitTitle: "PR_TITLE",
					squashMergeCommitMessage: "COMMIT_MESSAGES",
				}),
			},
			// Bind to the parent resource
			{ parent: this },
		);

		for (const { slug, teamId, permission } of teams) {
			new github.TeamRepository(
				`${name}-team-${slug}`,
				{ repository: repo.name, teamId, permission },
				{ parent: this, dependsOn: [repo] },
			);
		}

		Object.entries(resolvedBranchProtection).forEach(
			([pattern, protection]) => {
				createBranchProtection({
					resourceName: `${name}-bp-${pattern.replace(/\//g, "-")}`,
					pattern,
					protection,
					repo,
				});
			},
		);

		createEnvironments({
			resourcePrefix: name,
			environments: environments ?? [],
			repo,
			teamResources,
		});

		if (labels && Object.keys(labels).length > 0) {
			createLabels({ resourcePrefix: name, labels, repo });
		}
	}
}
