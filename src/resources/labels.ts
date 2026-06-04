import github from "@pulumi/github";
import {
	ComponentResource,
	type ComponentResourceOptions,
} from "@pulumi/pulumi";
import type { LabelArgs } from "./types";

export function createLabels(
	args: LabelArgs,
	opts?: ComponentResourceOptions,
): void {
	const { resourcePrefix, labels, repo } = args;

	const component = new ComponentResource(
		"custom:github:OrgRepositoryLabels",
		`${resourcePrefix}-labels`,
		{},
		opts,
	);

	for (const [name, def] of Object.entries(labels)) {
		new github.IssueLabel(
			`${resourcePrefix}-label-${name}`,
			{
				repository: repo.name,
				name,
				color: def.color,
				description: def.description,
			},
			{
				dependsOn: [repo],
				parent: component,
				aliases: opts?.parent ? [{ parent: opts.parent }] : [],
			},
		);
	}
}
