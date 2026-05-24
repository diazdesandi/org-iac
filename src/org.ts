import {
  buildRulesetBranchProtection,
  config,
  resolveTeamAccess,
} from "@/core";
import { createTeams, createTeamMemberships, createRepo } from "@/resources";
import { BranchProtectionConfig, TeamResourceMap } from "./types";

// TODO: Refactor to use a single branch protection map
interface BranchProtection {
  [pattern: string]: BranchProtectionConfig;
}

const setupOrg: () => Promise<void> = async (): Promise<void> => {
  const { org, repos, teams, rulesets, labels } = config;

  const teamResources: TeamResourceMap = createTeams(teams);

  // TODO: Refactor to not use teams.teams, use only teams
  createTeamMemberships(teams.teams, teamResources);

  const branchProtections: BranchProtection = buildRulesetBranchProtection(
    rulesets,
    org.defaults.default_branch,
  );

  for (const repo of repos) {
    createRepo(repo, {
      defaults: org.defaults,
      branchProtections,
      teamAccess: resolveTeamAccess(
        repo.name,
        teams.repo_access,
        teamResources,
      ),
    });
  }
};

export default setupOrg;
