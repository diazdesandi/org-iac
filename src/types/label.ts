import { z } from "zod";

export const LabelDefinitionSchema = z.object({
	color: z.string(),
	description: z.string().optional(),
});

export const LabelSetSchema = z.record(z.string(), LabelDefinitionSchema);

export type LabelDefinition = z.infer<typeof LabelDefinitionSchema>;
export type LabelSet = z.infer<typeof LabelSetSchema>;
