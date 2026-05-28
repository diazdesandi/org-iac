import type github from "@pulumi/github";
import type pulumi from "@pulumi/pulumi";
import * as v from "valibot";

export const TeamPermissionSchema = v.picklist([
	"pull",
	"triage",
	"push",
	"maintain",
	"admin",
]);

export const TeamMemberConfigSchema = v.object({
	username: v.string(),
	role: v.picklist(["member", "maintainer"]),
});

export const TeamConfigSchema = v.object({
	slug: v.string(),
	name: v.string(),
	description: v.optional(v.string()),
	privacy: v.optional(v.picklist(["secret", "closed"])),
	members: v.optional(v.array(TeamMemberConfigSchema)),
});

const RepoAccessEntrySchema = v.object({
	team: v.string(),
	permission: TeamPermissionSchema,
});

export const TeamsConfigSchema = v.pipe(
	v.object({
		teams: v.array(TeamConfigSchema),
		repoAccess: v.record(v.string(), v.array(RepoAccessEntrySchema)),
	}),
	v.rawCheck(({ dataset, addIssue }) => {
		if (!dataset.typed) return;
		const seen = new Set<string>();
		for (const team of dataset.value.teams) {
			if (seen.has(team.slug)) {
				addIssue({
					message: `duplicate team slug "${team.slug}"`,
					path: [{ type: "object", origin: "value", input: dataset.value, key: "teams", value: dataset.value.teams }],
				});
			}
			seen.add(team.slug);
		}
	}),
);

export type TeamPermission = v.InferOutput<typeof TeamPermissionSchema>;
export type TeamMemberConfig = v.InferOutput<typeof TeamMemberConfigSchema>;
export type TeamConfig = v.InferOutput<typeof TeamConfigSchema>;
export type TeamsConfig = v.InferOutput<typeof TeamsConfigSchema>;
export type TeamResourceMap = Record<string, github.Team>;

export interface TeamAccess {
	slug: string;
	teamId: pulumi.Input<string>;
	permission: TeamPermission;
}
