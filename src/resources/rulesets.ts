import github from "@pulumi/github";
import type { RulesetConfig } from "@/types";

// Rulesets are managed as org-wide rules (repositoryName: ["~ALL"]) so they
// apply uniformly across every repository without per-repo configuration.
//
// Per-repo ruleset exceptions (e.g. stricter rules for a specific repo) are
// intentionally handled through the GitHub UI rather than in code — they are
// rare enough that the drift risk is acceptable, and keeping them out of config
// avoids complexity in the reconciliation layer.
//
// Per-repo *branch protection* (github.BranchProtection) is still managed in
// code via repos.yaml → branchProtection, for cases that rulesets can't cover
// (e.g. required reviewers by team on a specific repo).
export function createRulesets(
	rulesets: RulesetConfig[],
): github.OrganizationRuleset[] {
	return rulesets
		.filter((r) => r.enforcement !== "disabled")
		.map((r) => {
			const { id, name, target, enforcement, conditions, rules } = r;

			return new github.OrganizationRuleset(id, {
				name: name ?? id,
				target,
				enforcement,
				conditions: {
					refName: {
						includes: conditions.refName.includes,
						excludes: conditions.refName.excludes ?? [],
					},
					repositoryName: {
						includes: conditions.repositoryName?.includes ?? ["~ALL"],
						excludes: conditions.repositoryName?.excludes ?? [],
					},
				},
				rules: {
					requiredLinearHistory: rules.requiredLinearHistory,
					deletion: rules.deletion,
					nonFastForward: rules.nonFastForward,
					pullRequest: rules.pullRequest,
					...(rules.requiredStatusChecks
						? {
								requiredStatusChecks: {
									...rules.requiredStatusChecks,
									requiredChecks: rules.requiredStatusChecks.requiredChecks ?? [],
								},
							}
						: {}),
				},
			});
		});
}
