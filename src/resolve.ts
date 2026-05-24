import type {
  BranchProtectionConfig,
  OrgConfig,
  RepoConfig,
  RulesetConfig,
  TeamAccess,
  TeamResourceMap,
  TeamsConfig,
  LabelSet,
} from "@/types";

// ── Branch protection ────────────────────────────────────────────────────────

function normalizeBranchPattern(
  pattern: string,
  defaultBranch: string,
): string {
  if (pattern === "~DEFAULT_BRANCH") return defaultBranch;
  return pattern.replace(/^refs\/heads\//, "");
}

function branchProtectionFromRuleset(
  ruleset: RulesetConfig,
): BranchProtectionConfig {
  const {
    pull_request,
    required_status_checks,
    required_linear_history,
    deletion,
    non_fast_forward,
  } = ruleset.rules;

  return {
    required_review_count: pull_request?.required_approving_review_count,
    dismiss_stale_reviews: pull_request?.dismiss_stale_reviews_on_push,
    require_code_owner_review: pull_request?.require_code_owner_review,
    required_status_checks: required_status_checks?.checks?.map(
      (c) => c.context,
    ),
    strict_status_checks: required_status_checks?.strict,
    require_linear_history: required_linear_history,
    allow_deletions: deletion,
    allow_force_pushes: non_fast_forward,
  };
}

export function buildRulesetBranchProtection(
  rulesets: RulesetConfig[],
  defaultBranch: string,
): Record<string, BranchProtectionConfig> {
  return rulesets
    .filter((r) => r.target === "branch" && r.enforcement !== "disabled")
    .flatMap((r) =>
      r.conditions.include.map((pattern) => ({
        pattern: normalizeBranchPattern(pattern, defaultBranch),
        config: branchProtectionFromRuleset(r),
      })),
    )
    .reduce<Record<string, BranchProtectionConfig>>(
      (acc, { pattern, config }) => {
        acc[pattern] = { ...acc[pattern], ...config };
        return acc;
      },
      {},
    );
}

// ── Team access ──────────────────────────────────────────────────────────────

export function resolveTeamAccess(
  repoName: string,
  repoAccess: TeamsConfig["repo_access"],
  teamResources: TeamResourceMap,
): TeamAccess[] {
  return (repoAccess[repoName] ?? []).map(({ team, permission }) => {
    const resource = teamResources[team];
    if (!resource)
      throw new Error(`Team "${team}" in repo_access["${repoName}"] not found`);
    return { slug: team, teamId: resource.id, permission };
  });
}

// ── Repo config ──────────────────────────────────────────────────────────────

export interface RepoBuildContext {
  defaults: OrgConfig["defaults"];
  branchProtections: Record<string, BranchProtectionConfig>;
  teamAccess: TeamAccess[];
  labels: LabelSet;
}

export function buildRepoConfig(
  repo: RepoConfig,
  ctx: RepoBuildContext,
): RepoConfig {
  const { defaults, branchProtections, teamAccess, labels } = ctx;
  const { features } = defaults;

  return {
    ...repo,
    visibility: repo.visibility ?? defaults.visibility,
    merge_strategies: repo.merge_strategies ?? defaults.merge_strategies,
    delete_branch_on_merge:
      repo.delete_branch_on_merge ?? defaults.delete_branch_on_merge,
    has_issues: repo.has_issues ?? features.issues,
    has_wiki: repo.has_wiki ?? features.wiki,
    has_projects: repo.has_projects ?? features.projects,
    has_discussions: repo.has_discussions ?? features.discussions,
    branch_protection: { ...branchProtections, ...repo.branch_protection },
    labels: { ...labels, ...repo.labels },
    teams: teamAccess,
  };
}
