import github from "@pulumi/github";
import type { LabelSet } from "@/types";

export function createLabels(
	resourcePrefix: string,
	labels: LabelSet,
	repo: github.Repository,
): github.IssueLabel[] {
	return Object.entries(labels).map(([name, def]) =>
		new github.IssueLabel(
			`${resourcePrefix}-label-${name}`,
			{ repository: repo.name, name, color: def.color, description: def.description },
			{ dependsOn: [repo] },
		),
	);
}
