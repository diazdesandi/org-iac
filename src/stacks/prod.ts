import {
	buildRepoConfig,
	buildRulesetBranchProtection,
	config,
} from "@/config";
import { createRepo, createTeamMemberships, createTeams } from "@/resources";
import type { TeamAccess } from "@/types";

const { org, repos: repoDefinitions, teams, rulesets, labels } = config;
const { defaults, organization } = org;
const { repo_access, teams: teamConfigs } = teams;

const teamResources = createTeams(teams);
const teamMemberships = createTeamMemberships(teamConfigs, teamResources);
const rulesetBranchProtection = buildRulesetBranchProtection(
	rulesets,
	defaults.default_branch,
);

const resolveTeamAccess = (repoName: string): TeamAccess[] => {
	const accessList = repo_access[repoName] ?? [];
	return accessList.map(({ team, permission }) => {
		const resource = teamResources[team];
		if (!resource) {
			throw new Error(
				`Team "${team}" in repo_access["${repoName}"] not found in teams`,
			);
		}
		return { slug: team, teamId: resource.id, permission };
	});
};

const repoResources = repoDefinitions.map((repo) => {
	const repoConfig = buildRepoConfig(
		repo,
		defaults,
		rulesetBranchProtection,
		resolveTeamAccess(repo.name),
		labels,
	);
	return createRepo(repoConfig, teamResources, organization);
});

export const teamSlugs = Object.keys(teamResources);
export const teamMembershipCount = teamMemberships.length;
export const repositoryNames = repoResources.map((repo) => repo.repo.name);
