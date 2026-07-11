import { z } from "zod";
import { registryIdSchema } from "./registry-id";

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
