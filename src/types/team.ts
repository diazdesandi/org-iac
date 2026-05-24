import type github from "@pulumi/github";
import type pulumi from "@pulumi/pulumi";
import { z } from "zod";

export const TeamPermissionSchema = z.enum([
	"pull",
	"triage",
	"push",
	"maintain",
	"admin",
]);

export const TeamMemberConfigSchema = z.object({
	username: z.string(),
	role: z.enum(["member", "maintainer"]),
});

export const TeamConfigSchema = z.object({
	slug: z.string(),
	name: z.string(),
	description: z.string().optional(),
	privacy: z.enum(["secret", "closed"]).optional(),
	members: z.array(TeamMemberConfigSchema).optional(),
});

const RepoAccessEntrySchema = z.object({
	team: z.string(),
	permission: TeamPermissionSchema,
});

export const TeamsConfigSchema = z
	.object({
		teams: z.array(TeamConfigSchema),
		repoAccess: z.record(z.string(), z.array(RepoAccessEntrySchema)),
	})
	.superRefine((data, ctx) => {
		const seen = new Set<string>();
		for (const team of data.teams) {
			if (seen.has(team.slug)) {
				ctx.addIssue({
					code: "custom",
					path: ["teams"],
					message: `duplicate team slug "${team.slug}"`,
				});
			}
			seen.add(team.slug);
		}
	});

export type TeamPermission = z.infer<typeof TeamPermissionSchema>;
export type TeamMemberConfig = z.infer<typeof TeamMemberConfigSchema>;
export type TeamConfig = z.infer<typeof TeamConfigSchema>;
export type TeamsConfig = z.infer<typeof TeamsConfigSchema>;
export type TeamResourceMap = Record<string, github.Team>;

export interface TeamAccess {
	slug: string;
	teamId: pulumi.Input<string>;
	permission: TeamPermission;
}
