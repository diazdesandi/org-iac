import github from "@pulumi/github";

import type { TeamResourceMap, TeamsConfig } from "@/types";

export function createTeams(config: TeamsConfig): TeamResourceMap {
	return Object.fromEntries(
		config.teams.map((team) => {
			const { slug, name, description, privacy } = team;
			return [
				slug,
				new github.Team(slug, {
					name,
					description,
					privacy,
				}),
			];
		}),
	);
}

export function createTeamMemberships(
	config: TeamsConfig,
	teamResources: TeamResourceMap,
): void {
	for (const team of config.teams) {
		const { slug, members } = team;
		for (const { username, role } of members ?? []) {
			new github.TeamMembership(`${slug}-${username}`, {
				teamId: teamResources[slug].id,
				username,
				role,
			});
		}
	}
}
