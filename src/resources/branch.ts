import github from "@pulumi/github";
import type { BranchProtectionArgs } from "@/types";

export function createBranchProtection(
  branchArgs: BranchProtectionArgs,
): github.BranchProtection {
  const { resourceName, pattern, repo, protection } = branchArgs;

  return new github.BranchProtection(
    resourceName,
    { ...protection, repositoryId: repo.nodeId, pattern },
    { dependsOn: [repo] },
  );
}
