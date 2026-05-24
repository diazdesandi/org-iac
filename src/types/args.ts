import type { Repository } from "@pulumi/github";
import type { EnvironmentConfig } from "./environment";
import type { LabelSet } from "./label";
import type { BranchProtectionEntry } from "./repo";
import type { TeamResourceMap } from "./team";

export interface BranchProtectionArgs {
	resourceName: string;
	pattern: string;
	protection: BranchProtectionEntry;
	repo: Repository;
}

export interface EnvArgs {
	resourcePrefix: string;
	environments: EnvironmentConfig[];
	repo: Repository;
	teamResources: TeamResourceMap;
}

export interface LabelArgs {
	resourcePrefix: string;
	labels: LabelSet;
	repo: Repository;
}
