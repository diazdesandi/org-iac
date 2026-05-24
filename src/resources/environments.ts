import * as pulumi from "@pulumi/pulumi";
import type { RepositoryEnvironment } from "@pulumi/github";
import github from "@pulumi/github";
import type { EnvironmentConfig, TeamResourceMap } from "@/types";

export function createEnvironments(args: {
	repoName: string;
	environments: EnvironmentConfig[];
	repo: github.Repository;
	teamResources: TeamResourceMap;
}): RepositoryEnvironment[] {
	const { repoName, environments, repo, teamResources } = args;
	return environments.map((env) => {
		const { name, requiredReviewerTeamSlugs, deploymentBranchPolicy } = env;
		const reviewerTeamSlugs = requiredReviewerTeamSlugs ?? [];
		const reviewerTeams = reviewerTeamSlugs.map((slug) => {
			const team = teamResources[slug];
			if (!team) {
				throw new Error(
					`Environment "${name}" references unknown team "${slug}"`,
				);
			}
			return pulumi.output(team.id).apply((id) => Number.parseInt(id, 10));
		});

		const resourceName = `${repoName}-env-${name}`;
		const branchPolicy =
			deploymentBranchPolicy === "protected"
				? { protectedBranches: true, customBranchPolicies: false }
				: undefined;
		const reviewers =
			reviewerTeams.length > 0 ? [{ teams: reviewerTeams }] : undefined;

		return new github.RepositoryEnvironment(
			resourceName,
			{
				repository: repo.name,
				environment: name,
				deploymentBranchPolicy: branchPolicy,
				reviewers,
			},
			{ dependsOn: [repo] },
		);
	});
}
