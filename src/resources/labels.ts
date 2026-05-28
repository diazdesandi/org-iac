import github from "@pulumi/github";
import type { ResourceOptions } from "@pulumi/pulumi";
import type { LabelArgs } from "./types";

export function createLabels(
	args: LabelArgs,
	opts?: ResourceOptions,
): github.IssueLabel[] {
	const { resourcePrefix, labels, repo } = args;

	return Object.entries(labels).map(
		([name, def]) =>
			new github.IssueLabel(
				`${resourcePrefix}-label-${name}`,
				{
					repository: repo.name,
					name,
					color: def.color,
					description: def.description,
				},
				{ dependsOn: [repo], ...opts },
			),
	);
}
