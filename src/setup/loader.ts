import { labels, org, repos, rulesets, teams } from "@config/index";
import * as v from "valibot";
import {
	type InfraConfig,
	LabelGroupsSchema,
	OrgConfigSchema,
	ReposFileSchema,
	RulesetsFileSchema,
	TeamsConfigSchema,
} from "@/types";
import { validateCrossRefs } from "./validate";

type Schema<T> = v.BaseSchema<unknown, T, v.BaseIssue<unknown>>;

function parse<T>(schema: Schema<T>, data: unknown, file: string): T {
	const result = v.safeParse(schema, data);
	if (!result.success) {
		const msg = result.issues
			.map((i) => {
				const path = i.path?.map((p) => String(p.key)).join(".") ?? "root";
				return `${path}: ${i.message}`;
			})
			.join("; ");
		throw new Error(`Invalid ${file}: ${msg}`);
	}
	return result.output;
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
		labels: Object.assign({}, ...Object.values(labelGroups)),
	};

	const issues = validateCrossRefs(config, labelGroups);
	if (issues.length > 0) {
		const body = issues.map((i) => `- ${i.path}: ${i.message}`).join("\n");
		throw new Error(`Config validation failed:\n${body}`);
	}

	return config;
}

export const config = (() => {
	try {
		return loadConfig();
	} catch (err) {
		console.error(err instanceof Error ? err.message : String(err));
		process.exit(1);
	}
})();
