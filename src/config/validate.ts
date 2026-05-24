import type { InfraConfig, LabelGroups } from "@/types";

export interface ConfigValidationIssue {
	path: string;
	message: string;
}

function addIssue(
	issues: ConfigValidationIssue[],
	path: string,
	message: string,
): void {
	issues.push({ path, message });
}

function collectDuplicates(values: string[]): string[] {
	const counts = new Map<string, number>();
	for (const value of values) {
		counts.set(value, (counts.get(value) ?? 0) + 1);
	}

	return Array.from(counts.entries())
		.filter(([, count]) => count > 1)
		.map(([value]) => value);
}

function normalizeBranchPattern(
	pattern: string,
	defaultBranch: string,
): string {
	if (pattern === "~DEFAULT_BRANCH") return defaultBranch;
	return pattern.replace(/^refs\/heads\//, "");
}

export function validateConfig(
	config: InfraConfig,
	options: { labelGroups?: LabelGroups } = {},
): ConfigValidationIssue[] {
	const issues: ConfigValidationIssue[] = [];
	const { org, repos, rulesets, teams } = config;

	const repoNames = repos.map((repo) => repo.name);
	for (const duplicate of collectDuplicates(repoNames)) {
		addIssue(issues, "repos", `duplicate repo name "${duplicate}"`);
	}

	const teamSlugs = teams.teams.map((team) => team.slug);
	for (const duplicate of collectDuplicates(teamSlugs)) {
		addIssue(issues, "teams.teams", `duplicate team slug "${duplicate}"`);
	}

	const rulesetIds = rulesets.map((ruleset) => ruleset.id);
	for (const duplicate of collectDuplicates(rulesetIds)) {
		addIssue(issues, "rulesets", `duplicate ruleset id "${duplicate}"`);
	}

	const teamSlugSet = new Set(teamSlugs);
	const repoNameSet = new Set(repoNames);
	const repoAccessEntries = Object.entries(teams.repo_access);
	for (const [repoName, access] of repoAccessEntries) {
		if (!repoNameSet.has(repoName)) {
			addIssue(
				issues,
				`teams.repo_access.${repoName}`,
				`unknown repo "${repoName}"`,
			);
		}

		for (const entry of access) {
			if (!teamSlugSet.has(entry.team)) {
				addIssue(
					issues,
					`teams.repo_access.${repoName}`,
					`unknown team "${entry.team}"`,
				);
			}
		}
	}

	for (const repo of repos) {
		const repoEnvironments = repo.environments ?? [];
		const envNames = repoEnvironments.map((env) => env.name);
		for (const duplicate of collectDuplicates(envNames)) {
			addIssue(
				issues,
				`repos.${repo.name}.environments`,
				`duplicate environment name "${duplicate}"`,
			);
		}

		for (const env of repoEnvironments) {
			const reviewerTeamSlugs = env.requiredReviewerTeamSlugs ?? [];
			for (const slug of reviewerTeamSlugs) {
				if (!teamSlugSet.has(slug)) {
					addIssue(
						issues,
						`repos.${repo.name}.environments.${env.name}`,
						`unknown team "${slug}"`,
					);
				}
			}
		}
	}

	const patternOwners = new Map<string, string[]>();
	const defaultBranch = org.defaults.default_branch;
	for (const ruleset of rulesets) {
		const { id, target, enforcement, conditions } = ruleset;
		if (target !== "branch" || enforcement === "disabled") {
			continue;
		}

		const seenPatterns = new Set<string>();
		for (const rawPattern of conditions.include) {
			const pattern = normalizeBranchPattern(rawPattern, defaultBranch);

			if (seenPatterns.has(pattern)) {
				addIssue(
					issues,
					`rulesets.${id}`,
					`duplicate include pattern "${pattern}"`,
				);
				continue;
			}
			seenPatterns.add(pattern);

			const owners = patternOwners.get(pattern) ?? [];
			owners.push(id);
			patternOwners.set(pattern, owners);
		}
	}

	for (const [pattern, owners] of patternOwners.entries()) {
		const uniqueOwners = Array.from(new Set(owners));
		if (uniqueOwners.length > 1) {
			addIssue(
				issues,
				"rulesets",
				`branch pattern "${pattern}" appears in multiple rulesets (${uniqueOwners.join(", ")})`,
			);
		}
	}

	const labelGroups = options.labelGroups;
	if (labelGroups) {
		const labelOwners = new Map<string, string[]>();
		for (const [group, labels] of Object.entries(labelGroups)) {
			for (const labelName of Object.keys(labels)) {
				const owners = labelOwners.get(labelName) ?? [];
				owners.push(group);
				labelOwners.set(labelName, owners);
			}
		}

		for (const [labelName, owners] of labelOwners.entries()) {
			if (owners.length > 1) {
				addIssue(
					issues,
					`labels.${labelName}`,
					`defined in multiple label groups (${owners.join(", ")})`,
				);
			}
		}
	}

	return issues;
}
