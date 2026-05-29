import pulumi from "@pulumi/pulumi";
import {
	createRulesets,
	createTeamMemberships,
	createTeams,
	OrgRepository,
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

	const pulumiConfig = new pulumi.Config();
	const enableTeams = pulumiConfig.getBoolean("enableTeams") ?? true;
	const enableRulesets = pulumiConfig.getBoolean("enableRulesets") ?? true;

	const teamResources = enableTeams ? createTeams(teams) : {};
	if (enableTeams) createTeamMemberships(teams, teamResources);
	if (enableRulesets) createRulesets(rulesets);

	const rulesetProtections = buildRulesetBranchProtection(
		rulesets,
		defaults.defaultBranch,
		organization,
	);

	for (const repo of repos) {
		const teamAccess = enableTeams
			? resolveTeamAccess(repo.name, teams.repoAccess, teamResources)
			: [];
		const resolved = buildRepoConfig(repo, {
			defaults,
			rulesetProtections,
			teamAccess,
			labels,
			organization,
		});
		new OrgRepository(resolved.name, resolved, teamResources); // NOSONAR
	}
}
