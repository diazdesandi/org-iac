import type { InfraConfig, LabelGroups } from "@/types";

export interface ValidationIssue {
	path: string;
	message: string;
}

function issue(path: string, message: string): ValidationIssue {
	return { path, message };
}

function normalizeBranchPattern(
	pattern: string,
	defaultBranch: string,
): string {
	if (pattern === "~DEFAULT_BRANCH") return defaultBranch;
	return pattern.replace(/^refs\/heads\//, "");
}

function validateTeamRefs(config: InfraConfig): ValidationIssue[] {
	const { repos, teams } = config;
	const teamSlugs = new Set(teams.teams.map((t) => t.slug));
	const repoNames = new Set(repos.map((r) => r.name));

	return [
		...Object.keys(teams.repoAccess)
			.filter((name) => !repoNames.has(name))
			.map((name) => issue(`teams.repoAccess.${name}`, `unknown repo "${name}"`)),

		...Object.entries(teams.repoAccess).flatMap(([repoName, access]) =>
			access
				.filter((e) => !teamSlugs.has(e.team))
				.map((e) => issue(`teams.repoAccess.${repoName}`, `unknown team "${e.team}"`)),
		),

		...repos.flatMap((repo) =>
			(repo.environments ?? []).flatMap((env) =>
				(env.requiredReviewerTeamSlugs ?? [])
					.filter((slug) => !teamSlugs.has(slug))
					.map((slug) => issue(`repos.${repo.name}.environments.${env.name}`, `unknown team "${slug}"`)),
			),
		),
	];
}

function validateRulesetPatterns(config: InfraConfig): ValidationIssue[] {
	const { org, rulesets } = config;
	const defaultBranch = org.defaults.defaultBranch;
	const patternOwners = new Map<string, string[]>();
	const issues: ValidationIssue[] = [];

	for (const ruleset of rulesets) {
		if (ruleset.target !== "branch" || ruleset.enforcement === "disabled")
			continue;
		for (const raw of ruleset.conditions.refName.includes) {
			const pattern = normalizeBranchPattern(raw, defaultBranch);
			const owners = patternOwners.get(pattern) ?? [];
			owners.push(ruleset.id);
			patternOwners.set(pattern, owners);
		}
	}

	for (const [pattern, owners] of patternOwners) {
		const unique = [...new Set(owners)];
		if (unique.length > 1)
			issues.push(
				issue(
					"rulesets",
					`branch pattern "${pattern}" appears in multiple rulesets (${unique.join(", ")})`,
				),
			);
	}

	return issues;
}

function validateLabelGroups(labelGroups: LabelGroups): ValidationIssue[] {
	const labelOwners = new Map<string, string[]>();
	const issues: ValidationIssue[] = [];

	for (const [group, labels] of Object.entries(labelGroups)) {
		for (const name of Object.keys(labels)) {
			const owners = labelOwners.get(name) ?? [];
			owners.push(group);
			labelOwners.set(name, owners);
		}
	}

	for (const [name, owners] of labelOwners) {
		if (owners.length > 1)
			issues.push(
				issue(
					`labels.${name}`,
					`defined in multiple groups (${owners.join(", ")})`,
				),
			);
	}

	return issues;
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
