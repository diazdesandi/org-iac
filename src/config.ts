import { z } from "zod";
import {
  LabelSetSchema,
  MergeStrategySchema,
  RepoConfigSchema,
  RepoVisibilitySchema,
  TeamsConfigSchema,
} from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    else seen.add(value);
  }
  return [...duplicates];
}

function refineDuplicates<T>(
  getValues: (data: T) => string[],
  path: string,
  message: (dup: string) => string,
) {
  return (data: T, ctx: z.RefinementCtx) => {
    for (const dup of findDuplicates(getValues(data))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [path],
        message: message(dup),
      });
    }
  };
}

// ── Org ──────────────────────────────────────────────────────────────────────

const OrgFeaturesSchema = z.object({
  issues: z.boolean(),
  wiki: z.boolean(),
  projects: z.boolean(),
  discussions: z.boolean(),
});

const OrgDefaultsSchema = z.object({
  visibility: RepoVisibilitySchema,
  default_branch: z.string(),
  delete_branch_on_merge: z.boolean(),
  merge_strategies: z.array(MergeStrategySchema),
  features: OrgFeaturesSchema,
});

export const OrgConfigSchema = z.object({
  owner: z.string(),
  organization: z.string(),
  defaults: OrgDefaultsSchema,
});

// ── Labels ───────────────────────────────────────────────────────────────────

export const LabelGroupsSchema = z.record(z.string(), LabelSetSchema);

// ── Repos ────────────────────────────────────────────────────────────────────

export const ReposFileSchema = z
  .object({ repos: z.array(RepoConfigSchema) })
  .superRefine(
    refineDuplicates(
      (d) => d.repos.map((r) => r.name),
      "repos",
      (dup) => `duplicate repo name "${dup}"`,
    ),
  );

// ── Rulesets ─────────────────────────────────────────────────────────────────

const RulesetPullRequestRuleSchema = z.object({
  required_approving_review_count: z.number().optional(),
  dismiss_stale_reviews_on_push: z.boolean().optional(),
  require_code_owner_review: z.boolean().optional(),
});

const RulesetStatusChecksSchema = z.object({
  strict: z.boolean().optional(),
  checks: z.array(z.object({ context: z.string() })).optional(),
});

const RulesetRulesSchema = z.object({
  required_linear_history: z.boolean().optional(),
  deletion: z.boolean().optional(),
  non_fast_forward: z.boolean().optional(),
  pull_request: RulesetPullRequestRuleSchema.optional(),
  required_status_checks: RulesetStatusChecksSchema.optional(),
});

export const RulesetConfigSchema = z.object({
  id: z.string(),
  target: z.literal("branch"),
  enforcement: z.enum(["active", "disabled"]).optional(),
  conditions: z.object({ include: z.array(z.string()) }),
  rules: RulesetRulesSchema,
});

export const RulesetsFileSchema = z
  .object({ rulesets: z.array(RulesetConfigSchema) })
  .superRefine(
    refineDuplicates(
      (d) => d.rulesets.map((r) => r.id),
      "rulesets",
      (dup) => `duplicate ruleset id "${dup}"`,
    ),
  );

// ── Teams ─────────────────────────────────────────────────────────────────────
// Team slug duplicates are validated in TeamsConfigSchema via superRefine (see team.ts)

// ── Infra (composed) ─────────────────────────────────────────────────────────

export const InfraConfigSchema = z.object({
  org: OrgConfigSchema,
  repos: z.array(RepoConfigSchema),
  teams: TeamsConfigSchema,
  rulesets: z.array(RulesetConfigSchema),
  labels: LabelSetSchema,
});

export type OrgConfig = z.infer<typeof OrgConfigSchema>;
export type LabelGroups = z.infer<typeof LabelGroupsSchema>;
export type RulesetConfig = z.infer<typeof RulesetConfigSchema>;
export type InfraConfig = z.infer<typeof InfraConfigSchema>;
