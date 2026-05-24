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
	const issues: ValidationIssue[] = [];

	for (const [repoName, access] of Object.entries(teams.repoAccess)) {
		if (!repoNames.has(repoName))
			issues.push(
				issue(`teams.repoAccess.${repoName}`, `unknown repo "${repoName}"`),
			);
		for (const entry of access) {
			if (!teamSlugs.has(entry.team))
				issues.push(
					issue(`teams.repoAccess.${repoName}`, `unknown team "${entry.team}"`),
				);
		}
	}

	for (const repo of repos) {
		for (const env of repo.environments ?? []) {
			for (const slug of env.requiredReviewerTeamSlugs ?? []) {
				if (!teamSlugs.has(slug))
					issues.push(
						issue(
							`repos.${repo.name}.environments.${env.name}`,
							`unknown team "${slug}"`,
						),
					);
			}
		}
	}

	return issues;
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
