import {
	InfraConfigSchema,
	LabelGroupsSchema,
	OrgConfigSchema,
	ReposFileSchema,
	RulesetsFileSchema,
	TeamsConfigSchema,
} from "@/types";
import type { InfraConfig, LabelGroups, LabelSet } from "@/types";
import { validateConfig } from "./validate";
import type { ZodIssue, ZodType } from "zod";

import labelsRaw from "../../config/labels.yaml";
import orgRaw from "../../config/org.yaml";
import reposRaw from "../../config/repos.yaml";
import rulesetsRaw from "../../config/rulesets.yaml";
import teamsRaw from "../../config/teams.yaml";

const rawConfig = {
	labels: labelsRaw,
	org: orgRaw,
	repos: reposRaw,
	rulesets: rulesetsRaw,
	teams: teamsRaw,
};

function formatZodIssues(issues: ZodIssue[]): string {
	return issues
		.map((issue) => {
			const path = issue.path.length > 0 ? issue.path.join(".") : "root";
			return `${path}: ${issue.message}`;
		})
		.join("; ");
}

function parseWithSchema<T>(
	schema: ZodType<T>,
	data: unknown,
	label: string,
): T {
	const result = schema.safeParse(data);
	if (!result.success) {
		throw new Error(
			`Invalid ${label}: ${formatZodIssues(result.error.issues)}`,
		);
	}
	return result.data;
}

function flattenLabelGroups(labelGroups: LabelGroups): LabelSet {
	const labels: LabelSet = {};
	for (const group of Object.values(labelGroups)) {
		Object.assign(labels, group);
	}
	return labels;
}

function formatValidationIssues(
	issues: ReturnType<typeof validateConfig>,
): string {
	return issues.map((issue) => `- ${issue.path}: ${issue.message}`).join("\n");
}

export function parseConfig(): InfraConfig {
	const labelGroups = parseWithSchema(
		LabelGroupsSchema,
		rawConfig.labels,
		"labels.yaml",
	);
	const org = parseWithSchema(OrgConfigSchema, rawConfig.org, "org.yaml");
	const reposFile = parseWithSchema(
		ReposFileSchema,
		rawConfig.repos,
		"repos.yaml",
	);
	const rulesetsFile = parseWithSchema(
		RulesetsFileSchema,
		rawConfig.rulesets,
		"rulesets.yaml",
	);
	const teams = parseWithSchema(
		TeamsConfigSchema,
		rawConfig.teams,
		"teams.yaml",
	);
	const labels = flattenLabelGroups(labelGroups);
	const { repos } = reposFile;
	const { rulesets } = rulesetsFile;

	const parsedConfig = {
		org,
		repos,
		teams,
		rulesets,
		labels,
	};
	const config = InfraConfigSchema.parse(parsedConfig);

	const validationIssues = validateConfig(config, { labelGroups });
	if (validationIssues.length > 0) {
		const validationMessage = formatValidationIssues(validationIssues);
		throw new Error(`Config validation failed:\n${validationMessage}`);
	}

	return config;
}

export const config = parseConfig();
