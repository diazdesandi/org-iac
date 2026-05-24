import {
	createRepo,
	createRulesets,
	createTeamMemberships,
	createTeams,
} from "@/resources";
import {
	buildRepoConfig,
	buildRulesetBranchProtection,
	config,
	resolveTeamAccess,
} from "@/setup";

export default async function setupOrg() {
	const { org, repos, teams, rulesets, labels } = config;
	const { defaults, organization } = org;

	const teamResources = createTeams(teams);
	createTeamMemberships(teams, teamResources);
	createRulesets(rulesets);

	const rulesetProtections = buildRulesetBranchProtection(
		rulesets,
		defaults.defaultBranch,
		organization,
	);

	for (const repo of repos) {
		const resolved = buildRepoConfig(repo, {
			defaults,
			rulesetProtections,
			teamAccess: resolveTeamAccess(repo.name, teams.repoAccess, teamResources),
			labels,
			organization,
		});
		createRepo(resolved, teamResources);
	}
}
