import { z } from "zod";

export const LabelDefinitionSchema = z.object({
	color: z.string().regex(/^[0-9a-fA-F]{6}$/, "must be a 6-digit hex color (without #)"),
	description: z.string().optional(),
});

export const LabelSetSchema = z.record(z.string(), LabelDefinitionSchema);

export type LabelDefinition = z.infer<typeof LabelDefinitionSchema>;
export type LabelSet = z.infer<typeof LabelSetSchema>;
