import type { ValidationIssue } from "./types";

export function normalizeBranchPattern(
	pattern: string,
	defaultBranch: string,
): string {
	if (pattern === "~DEFAULT_BRANCH") return defaultBranch;
	return pattern.replace(/^refs\/heads\//, "");
}

export function normalizeActors(actors: string[], org: string): string[] {
	if (!actors?.length) return [];
	return actors.map((a) => {
		const trimmed = a.trim();
		if (!trimmed) {
			throw new Error(`invalid actor "${a}"`);
		}
		return trimmed.includes("/") ? trimmed : `${org}/${trimmed}`;
	});
}

export function issue(path: string, message: string): ValidationIssue {
	return { path, message };
}
