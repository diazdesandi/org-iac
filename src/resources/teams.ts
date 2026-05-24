import github from "@pulumi/github";

import type { TeamConfig, TeamResourceMap, TeamsConfig } from "@/types";

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
	teams: TeamConfig[],
	teamResources: TeamResourceMap,
): github.TeamMembership[] {
	return teams.flatMap((team) => {
		const { slug, members } = team;
		const teamMembers = members ?? [];
		return teamMembers.map((member) => {
			const { username, role } = member;
			const membershipName = `${slug}-${username}`;
			return new github.TeamMembership(membershipName, {
				teamId: teamResources[slug].id,
				username,
				role,
			});
		});
	});
}
