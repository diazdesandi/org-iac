import type github from "@pulumi/github";
import { z } from "zod";
import { BranchProtectionConfigSchema } from "./branch";
import { EnvironmentConfigSchema } from "./environment";
import { LabelSetSchema } from "./label";
import type { TeamAccess } from "./team";

export const RepoVisibilitySchema = z.enum(["public", "private", "internal"]);
export const MergeStrategySchema = z.enum(["merge", "squash", "rebase"]);

export const RepoConfigSchema = z
  .object({
    name: z.string(),
    description: z.string(),
    visibility: RepoVisibilitySchema.optional(),
    topics: z.array(z.string()).optional(),
    homepage: z.string().optional(),
    template: z.string().optional(),
    merge_strategies: z.array(MergeStrategySchema).optional(),
    delete_branch_on_merge: z.boolean().optional(),
    auto_init: z.boolean().optional(),
    archived: z.boolean().optional(),
    has_issues: z.boolean().optional(),
    has_wiki: z.boolean().optional(),
    has_projects: z.boolean().optional(),
    has_discussions: z.boolean().optional(),
    labels: LabelSetSchema.optional(),
    branch_protection: z
      .record(z.string(), BranchProtectionConfigSchema)
      .optional(),
    environments: z.array(EnvironmentConfigSchema).optional(),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    for (const env of data.environments ?? []) {
      if (seen.has(env.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["environments"],
          message: `duplicate environment name "${env.name}"`,
        });
      }
      seen.add(env.name);
    }
  });

export type RepoConfig = z.infer<typeof RepoConfigSchema> & {
  teams?: TeamAccess[];
};

export type RepoVisibility = z.infer<typeof RepoVisibilitySchema>;
export type MergeStrategy = z.infer<typeof MergeStrategySchema>;

export interface RepoResult {
  repo: github.Repository;
  branchProtections: github.BranchProtection[];
  environments: github.RepositoryEnvironment[];
}
