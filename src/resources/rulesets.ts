import github from "@pulumi/github";
import type { RulesetConfig } from "@/types";

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
				},
				rules: {
					requiredLinearHistory: rules.requiredLinearHistory,
					deletion: rules.deletion,
					nonFastForward: rules.nonFastForward,
					pullRequest: rules.pullRequest,
					requiredStatusChecks: rules.requiredStatusChecks
						? {
								...rules.requiredStatusChecks,
								requiredChecks:
									rules.requiredStatusChecks.requiredChecks ?? [],
							}
						: undefined,
				},
			});
		});
}
