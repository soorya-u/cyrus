import { InvalidArgumentError } from "@commander-js/extra-typings";
import { z } from "zod";

export const registryIdSchema = z
	.string()
	.min(1, "registry id cannot be empty")
	.max(64, "registry id is too long (max 64 characters)")
	.regex(
		/^[a-z][a-z0-9-]*$/,
		"registry id must start with a letter and contain only lowercase letters, digits, and hyphens"
	);

export function registryIdArgParser(value: string): string {
	const result = registryIdSchema.safeParse(value);
	if (!result.success) {
		throw new InvalidArgumentError(
			result.error.issues[0]?.message ?? "invalid registry id"
		);
	}
	return result.data;
}

const npxDistSchema = z.object({
	package: z.string(),
	args: z.array(z.string()).default([]),
});

const uvxDistSchema = z.object({
	package: z.string(),
	args: z.array(z.string()).default([]),
});

const binaryDistSchema = z.object({
	archive: z.string(),
	cmd: z.string(),
	args: z.array(z.string()).default([]),
});

export const registryDistributionSchema = z.object({
	binary: z.record(z.string(), binaryDistSchema).default({}),
	npx: npxDistSchema.optional(),
	uvx: uvxDistSchema.optional(),
});

export const registryAgentSchema = z.object({
	id: registryIdSchema,
	name: z.string(),
	icon: z.url().optional(),
	description: z.string().optional(),
	distribution: registryDistributionSchema,
});

export const acpRegistrySchema = z.object({
	version: z.string().optional(),
	agents: z.array(registryAgentSchema),
});

export type RegistryAgent = z.infer<typeof registryAgentSchema>;
export type AcpRegistry = z.infer<typeof acpRegistrySchema>;
