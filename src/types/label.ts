import * as v from "valibot";

export const LabelDefinitionSchema = v.object({
	color: v.pipe(
		v.string(),
		v.regex(/^[0-9a-fA-F]{6}$/, "must be a 6-digit hex color (without #)"),
	),
	description: v.optional(v.string()),
});

export const LabelSetSchema = v.record(v.string(), LabelDefinitionSchema);

export type LabelDefinition = v.InferOutput<typeof LabelDefinitionSchema>;
export type LabelSet = v.InferOutput<typeof LabelSetSchema>;
