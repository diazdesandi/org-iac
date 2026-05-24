import type { Repository } from "@pulumi/github";
import type {
	BranchProtectionEntry,
	EnvironmentConfig,
	LabelSet,
	TeamResourceMap,
} from "@/types";

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
