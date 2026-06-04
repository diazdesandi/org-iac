import { describe, expect, it } from "bun:test";
import { validateCrossRefs } from "@/setup";
import type {
	InfraConfig,
	LabelGroups,
	OrgConfig,
	RulesetConfig,
} from "@/types";

const defaults = {
	visibility: "private",
	defaultBranch: "main",
	deleteBranchOnMerge: true,
	mergeStrategies: ["squash"],
	squashMergeCommitTitle: "PR_TITLE",
	squashMergeCommitMessage: "COMMIT_MESSAGES",
	features: { issues: true, wiki: false, projects: false, discussions: false },
} satisfies OrgConfig["defaults"];

const baseConfig = (): InfraConfig => ({
	org: { owner: "acme", organization: "acme-org", defaults },
	labels: {},
	repos: [{ name: "r", description: "d" }],
	rulesets: [],
	teams: {
		teams: [{ slug: "maintainers", name: "Maintainers" }],
		repoAccess: {},
	},
});

const mainRuleset = (id: string): RulesetConfig => ({
	id,
	target: "branch",
	enforcement: "active",
	conditions: { refName: { includes: ["~DEFAULT_BRANCH"] } },
	rules: {},
});

describe("validateCrossRefs", () => {
	it("passes a fully consistent config", () => {
		expect(validateCrossRefs(baseConfig(), {})).toEqual([]);
	});

	it("flags repoAccess pointing at an unknown repo", () => {
		const cfg = baseConfig();
		cfg.teams.repoAccess = {
			ghost: [{ team: "maintainers", permission: "push" }],
		};
		const issues = validateCrossRefs(cfg, {});
		expect(issues).toHaveLength(1);
		expect(issues[0].message).toMatch(/unknown repo "ghost"/);
	});

	it("flags repoAccess pointing at an unknown team", () => {
		const cfg = baseConfig();
		cfg.teams.repoAccess = { r: [{ team: "ghosts", permission: "push" }] };
		const issues = validateCrossRefs(cfg, {});
		expect(issues).toHaveLength(1);
		expect(issues[0].message).toMatch(/unknown team "ghosts"/);
	});

	it("flags environment reviewers referencing an unknown team", () => {
		const cfg = baseConfig();
		cfg.repos[0].environments = [
			{ name: "prod", requiredReviewerTeamSlugs: ["ghosts"] },
		];
		const issues = validateCrossRefs(cfg, {});
		expect(issues).toHaveLength(1);
		expect(issues[0].path).toBe("repos.r.environments.prod");
	});

	it("flags a branch pattern owned by multiple rulesets", () => {
		const cfg = baseConfig();
		cfg.rulesets = [mainRuleset("a"), mainRuleset("b")];
		const issues = validateCrossRefs(cfg, {});
		expect(issues).toHaveLength(1);
		expect(issues[0].message).toMatch(/appears in multiple rulesets \(a, b\)/);
	});

	it("flags a label defined in more than one group", () => {
		const labelGroups: LabelGroups = {
			bugs: { dup: { color: "ffffff" } },
			triage: { dup: { color: "000000" } },
		};
		const issues = validateCrossRefs(baseConfig(), labelGroups);
		expect(issues).toHaveLength(1);
		expect(issues[0].path).toBe("labels.dup");
	});
});
