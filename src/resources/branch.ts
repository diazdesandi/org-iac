import github from "@pulumi/github";
import type { BranchProtectionArgs } from "@pulumi/github/branchProtection";

export function createBranchProtection(
  repoName: string,
  pattern: string,
  args: Omit<BranchProtectionArgs, "repositoryId" | "pattern">,
  repo: github.Repository,
): github.BranchProtection {
  const resourceName = `${repoName}-bp-${pattern.replace(/\//g, "-")}`;

  return new github.BranchProtection(
    resourceName,
    { ...args, repositoryId: repo.nodeId, pattern },
    { dependsOn: [repo] },
  );
}
