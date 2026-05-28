import { groupBy, uniq } from "es-toolkit";
import type { InfraConfig, LabelGroups } from "@/types";
import type { ValidationIssue } from "./types";
import { normalizeBranchPattern } from "./utils";

function issue(path: string, message: string): ValidationIssue {
	return { path, message };
}

function validateTeamRefs(config: InfraConfig): ValidationIssue[] {
	const { repos, teams } = config;
	const teamSlugs = new Set(teams.teams.map((t) => t.slug));
	const repoNames = new Set(repos.map((r) => r.name));

	return [
		...Object.keys(teams.repoAccess)
			.filter((name) => !repoNames.has(name))
			.map((name) =>
				issue(`teams.repoAccess.${name}`, `unknown repo "${name}"`),
			),

		...Object.entries(teams.repoAccess).flatMap(([repoName, access]) =>
			access
				.filter((e) => !teamSlugs.has(e.team))
				.map((e) =>
					issue(`teams.repoAccess.${repoName}`, `unknown team "${e.team}"`),
				),
		),

		...repos.flatMap((repo) =>
			(repo.environments ?? []).flatMap((env) =>
				(env.requiredReviewerTeamSlugs ?? [])
					.filter((slug) => !teamSlugs.has(slug))
					.map((slug) =>
						issue(
							`repos.${repo.name}.environments.${env.name}`,
							`unknown team "${slug}"`,
						),
					),
			),
		),
	];
}

function validateRulesetPatterns(config: InfraConfig): ValidationIssue[] {
	const { org, rulesets } = config;
	const defaultBranch = org.defaults.defaultBranch;

	const patternOwners = groupBy(
		rulesets
			.filter((r) => r.target === "branch" && r.enforcement !== "disabled")
			.flatMap((r) =>
				r.conditions.refName.includes.map((raw) => ({
					pattern: normalizeBranchPattern(raw, defaultBranch),
					id: r.id,
				})),
			),
		(x) => x.pattern,
	);

	return Object.entries(patternOwners)
		.filter(([, owners]) => owners.length > 1)
		.map(([pattern, owners]) =>
			issue(
				"rulesets",
				`branch pattern "${pattern}" appears in multiple rulesets (${uniq(owners.map((o) => o.id)).join(", ")})`,
			),
		);
}

function validateLabelGroups(labelGroups: LabelGroups): ValidationIssue[] {
	const labelOwners = groupBy(
		Object.entries(labelGroups).flatMap(([group, labels]) =>
			Object.keys(labels).map((name) => ({ name, group })),
		),
		(x) => x.name,
	);

	return Object.entries(labelOwners)
		.filter(([, owners]) => owners.length > 1)
		.map(([name, owners]) =>
			issue(
				`labels.${name}`,
				`defined in multiple groups (${owners.map((o) => o.group).join(", ")})`,
			),
		);
}

export function validateCrossRefs(
	config: InfraConfig,
	labelGroups: LabelGroups,
): ValidationIssue[] {
	return [
		...validateTeamRefs(config),
		...validateRulesetPatterns(config),
		...validateLabelGroups(labelGroups),
	];
}
