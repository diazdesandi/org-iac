export function normalizeBranchPattern(
	pattern: string,
	defaultBranch: string,
): string {
	if (pattern === "~DEFAULT_BRANCH") return defaultBranch;
	return pattern.replace(/^refs\/heads\//, "");
}

export function normalizeActors(
	actors: string[] | undefined,
	org: string,
): string[] | undefined {
	if (!actors?.length) return undefined;
	return actors.map((a) => (a.includes("/") ? a : `${org}/${a}`));
}
