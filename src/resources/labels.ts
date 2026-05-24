import { LabelArgs } from "@/types";
import github from "@pulumi/github";

export function createLabels(args: LabelArgs): github.IssueLabel[] {
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
        { dependsOn: [repo] },
      ),
  );
}
