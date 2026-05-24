import type { RepositoryEnvironment } from "@pulumi/github";
import github from "@pulumi/github";
import pulumi from "@pulumi/pulumi";
import type { EnvArgs } from "@/types";

export function createEnvironments(args: EnvArgs): RepositoryEnvironment[] {
  const { resourcePrefix, environments, repo, teamResources } = args;
  return environments.map((env) => {
    const { name, requiredReviewerTeamSlugs, deploymentBranchPolicy } = env;

    const reviewerTeams = (requiredReviewerTeamSlugs ?? []).map((slug) => {
      const team = teamResources[slug];
      if (!team)
        throw new Error(
          `Environment "${name}" references unknown team "${slug}"`,
        );
      return pulumi.output(team.id).apply((id) => Number.parseInt(id, 10));
    });

    return new github.RepositoryEnvironment(
      `${resourcePrefix}-env-${name}`,
      {
        repository: repo.name,
        environment: name,
        deploymentBranchPolicy:
          deploymentBranchPolicy === "protected"
            ? { protectedBranches: true, customBranchPolicies: false }
            : undefined,
        reviewers:
          reviewerTeams.length > 0 ? [{ teams: reviewerTeams }] : undefined,
      },
      { dependsOn: [repo] },
    );
  });
}
