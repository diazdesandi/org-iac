import { describe, expect, it } from "bun:test";
import { normalizeActors, normalizeBranchPattern } from "@/setup";

describe("normalizeBranchPattern", () => {
	it("expands ~DEFAULT_BRANCH to the default branch", () => {
		expect(normalizeBranchPattern("~DEFAULT_BRANCH", "main")).toBe("main");
		expect(normalizeBranchPattern("~DEFAULT_BRANCH", "trunk")).toBe("trunk");
	});

	it("strips the refs/heads/ prefix", () => {
		expect(normalizeBranchPattern("refs/heads/release/*", "main")).toBe(
			"release/*",
		);
		expect(normalizeBranchPattern("refs/heads/main", "main")).toBe("main");
	});

	it("leaves bare patterns untouched", () => {
		expect(normalizeBranchPattern("main", "main")).toBe("main");
		expect(normalizeBranchPattern("feature/*", "main")).toBe("feature/*");
	});
});

describe("normalizeActors", () => {
	it("returns an empty array for empty input", () => {
		expect(normalizeActors([], "acme")).toEqual([]);
	});

	it("qualifies bare team slugs with the org", () => {
		expect(normalizeActors(["maintainers"], "acme")).toEqual([
			"acme/maintainers",
		]);
	});

	it("leaves already-qualified actors untouched", () => {
		expect(normalizeActors(["other-org/team"], "acme")).toEqual([
			"other-org/team",
		]);
	});

	it("throws for whitespace-only actors", () => {
		expect(() => normalizeActors(["  "], "acme")).toThrow(/invalid actor/);
	});
});
