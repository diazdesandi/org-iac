import github from "@pulumi/github";
import type { BranchProtectionArgs } from "@pulumi/github/branchProtection";

export function createBranchProtection(
	resourceName: string,
	pattern: string,
	args: Omit<BranchProtectionArgs, "repositoryId" | "pattern">,
	repo: github.Repository,
): github.BranchProtection {
	return new github.BranchProtection(
		resourceName,
		{ ...args, repositoryId: repo.nodeId, pattern },
		{ dependsOn: [repo] },
	);
}
