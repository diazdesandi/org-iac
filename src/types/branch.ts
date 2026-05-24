import { z } from "zod";

export const BranchProtectionConfigSchema = z.object({
	required_review_count: z.number().optional(),
	dismiss_stale_reviews: z.boolean().optional(),
	require_code_owner_review: z.boolean().optional(),
	restrict_dismissals_to_teams: z.array(z.string()).optional(),
	required_status_checks: z.array(z.string()).optional(),
	strict_status_checks: z.boolean().optional(),
	require_signed_commits: z.boolean().optional(),
	require_linear_history: z.boolean().optional(),
	require_conversation_resolution: z.boolean().optional(),
	allow_force_pushes: z.boolean().optional(),
	allow_deletions: z.boolean().optional(),
});

export type BranchProtectionConfig = z.infer<
	typeof BranchProtectionConfigSchema
>;
