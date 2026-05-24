import github from "@pulumi/github";
import type { ResolvedRepoConfig, RepoResult, TeamResourceMap } from "@/types";
import { createBranchProtection } from "./branch";
import { createEnvironments } from "./environments";
import { createLabels } from "./labels";

export function createRepo(
  config: ResolvedRepoConfig,
  teamResources: TeamResourceMap,
): RepoResult {
  const {
    name,
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

  const allowSquashMerge = mergeStrategies?.includes("squash") ?? true;

  const repo = new github.Repository(name, {
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
    allowMergeCommit: mergeStrategies?.includes("merge") ?? false,
    allowRebaseMerge: mergeStrategies?.includes("rebase") ?? false,
    allowSquashMerge,
    ...(allowSquashMerge && {
      squashMergeCommitTitle: "PR_TITLE",
      squashMergeCommitMessage: "COMMIT_MESSAGES",
    }),
  });

  for (const { slug, teamId, permission } of teams) {
    new github.TeamRepository(
      `${name}-team-${slug}`,
      { repository: repo.name, teamId, permission },
      { dependsOn: [repo] },
    );
  }

  const branchProtections = Object.entries(resolvedBranchProtection).map(
    ([pattern, protection]) =>
      createBranchProtection({
        resourceName: `${name}-bp-${pattern.replace(/\//g, "-")}`,
        pattern,
        protection,
        repo,
      }),
  );

  const environmentResources = createEnvironments({
    resourcePrefix: name,
    environments: environments ?? [],
    repo,
    teamResources,
  });

  if (labels && Object.keys(labels).length > 0) {
    createLabels({ resourcePrefix: name, labels, repo });
  }

  return { repo, branchProtections, environments: environmentResources };
}
