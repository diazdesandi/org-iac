import type { LabelSet, OrgConfig, TeamAccess } from "@/types";

export interface ValidationIssue {
	path: string;
	message: string;
}

export interface RepoBuildContext {
	defaults: OrgConfig["defaults"];
	teamAccess: TeamAccess[];
	labels: LabelSet;
	organization: string;
}
