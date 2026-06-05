import github from "@pulumi/github";
import pulumi, { ComponentResource } from "@pulumi/pulumi";
import type { EnvArgs } from "./types";

export function createEnvironments(
	args: EnvArgs,
	opts?: pulumi.ComponentResourceOptions,
): void {
	const { resourcePrefix, environments, repo, teamResources } = args;

	if (environments.length === 0) return;

	const component = new ComponentResource(
		"custom:github:OrgRepositoryEnvironments",
		`${resourcePrefix}-environments`,
		{},
		opts,
	);

	for (const env of environments) {
		const { name, requiredReviewerTeamSlugs, deploymentBranchPolicy } = env;

		const reviewerTeams = (requiredReviewerTeamSlugs ?? []).map((slug) => {
			const team = teamResources[slug];
			if (!team)
				throw new Error(
					`Environment "${name}" references unknown team "${slug}"`,
				);
			return pulumi.output(team.id).apply((id) => Number.parseInt(id, 10));
		});

		new github.RepositoryEnvironment(
			`${resourcePrefix}-env-${name}`,
			{
				repository: repo.name,
				environment: name,
				...(deploymentBranchPolicy === "protected"
					? { deploymentBranchPolicy: { protectedBranches: true, customBranchPolicies: false } }
					: {}),
				...(reviewerTeams.length > 0 ? { reviewers: [{ teams: reviewerTeams }] } : {}),
			},
			{
				dependsOn: [repo],
				parent: component,
				aliases: opts?.parent ? [{ parent: opts.parent }] : [],
			},
		);
	}
}
