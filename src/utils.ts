export function normalizeBranchPattern(
	pattern: string,
	defaultBranch: string,
): string {
	if (pattern === "~DEFAULT_BRANCH") return defaultBranch;
	return pattern.replace(/^refs\/heads\//, "");
}
