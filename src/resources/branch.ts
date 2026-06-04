import github from "@pulumi/github";
import pulumi from "@pulumi/pulumi";
import type { BranchProtectionArgs } from "./types";

export function createBranchProtection(
	branchArgs: BranchProtectionArgs,
	opts?: pulumi.ResourceOptions,
): github.BranchProtection {
	const { resourceName, pattern, repo, protection } = branchArgs;

	return new github.BranchProtection(
		resourceName,
		{ ...protection, repositoryId: repo.nodeId, pattern },
		// deleteBeforeReplace + noParent alias: these resources were re-parented
		// under OrgRepository (previously top-level). Without this, Pulumi would
		// try to create the new parented resource before deleting the old root-level
		// one, which GitHub rejects with "Name already protected".
		pulumi.mergeOptions(
			{
				dependsOn: [repo],
				deleteBeforeReplace: true,
				aliases: [{ parent: pulumi.rootStackResource }],
			},
			opts ?? {},
		),
	);
}
