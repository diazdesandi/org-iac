import {
  LabelGroupsSchema,
  OrgConfigSchema,
  ReposFileSchema,
  RulesetsFileSchema,
  TeamsConfigSchema,
} from "@/types";
import type { InfraConfig, LabelGroups, LabelSet } from "@/types";
import type { ZodIssue, ZodType } from "zod";
import { validateCrossRefs } from "./validate";

import { labels, org, repos, rulesets, teams } from "@config/index";

function formatZodIssues(issues: ZodIssue[]): string {
  return issues
    .map(
      (i) => `${i.path.length > 0 ? i.path.join(".") : "root"}: ${i.message}`,
    )
    .join("; ");
}

function parse<T>(schema: ZodType<T>, data: unknown, file: string): T {
  const result = schema.safeParse(data);
  if (!result.success)
    throw new Error(`Invalid ${file}: ${formatZodIssues(result.error.issues)}`);
  return result.data;
}

function flattenLabels(groups: LabelGroups): LabelSet {
  return Object.values(groups).reduce(
    (acc, group) => ({ ...acc, ...group }),
    {},
  );
}

export function loadConfig(): InfraConfig {
  const labelGroups = parse(LabelGroupsSchema, labels, "labels.yaml");
  const parsedOrg = parse(OrgConfigSchema, org, "org.yaml");
  const { repos: parsedRepos } = parse(ReposFileSchema, repos, "repos.yaml");
  const { rulesets: parsedRulesets } = parse(
    RulesetsFileSchema,
    rulesets,
    "rulesets.yaml",
  );
  const parsedTeams = parse(TeamsConfigSchema, teams, "teams.yaml");

  const config: InfraConfig = {
    org: parsedOrg,
    repos: parsedRepos,
    teams: parsedTeams,
    rulesets: parsedRulesets,
    labels: flattenLabels(labelGroups),
  };

  const issues = validateCrossRefs(config, labelGroups);
  if (issues.length > 0) {
    throw new Error(
      `Config validation failed:\n${issues.map((i) => `- ${i.path}: ${i.message}`).join("\n")}`,
    );
  }

  return config;
}

export const config = loadConfig();
