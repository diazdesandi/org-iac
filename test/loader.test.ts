import { describe, expect, it } from "bun:test";
import { initConfig, loadConfig } from "@/setup";

describe("loadConfig", () => {
	it("parses and validates the real config without errors", () => {
		const config = loadConfig();
		expect(Array.isArray(config.repos)).toBe(true);
		expect(Array.isArray(config.rulesets)).toBe(true);
		expect(Array.isArray(config.teams.teams)).toBe(true);
		expect(typeof config.org.organization).toBe("string");
		expect(typeof config.labels).toBe("object");
	});
});

describe("initConfig", () => {
	it("returns the same config as loadConfig on success", () => {
		const a = loadConfig();
		const b = initConfig();
		expect(b.org).toEqual(a.org);
		expect(b.repos).toEqual(a.repos);
	});
});
