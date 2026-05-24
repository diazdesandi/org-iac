import github from "@pulumi/github";
import type { LabelSet } from "@/types";

export function createLabels(
	repoName: string,
	labels: LabelSet,
	repo: github.Repository,
): github.IssueLabel[] {
	return Object.entries(labels).map(([name, def]) => {
		const { color, description } = def;
		const resourceName = `${repoName}-label-${name}`;
		return new github.IssueLabel(
			resourceName,
			{
				repository: repo.name,
				name,
				color,
				description,
			},
			{ dependsOn: [repo] },
		);
	});
}
