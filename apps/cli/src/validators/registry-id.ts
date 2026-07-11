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

export type RegistryId = z.infer<typeof registryIdSchema>;

export function registryIdArgParser(value: string): string {
	const result = registryIdSchema.safeParse(value);
	if (!result.success) {
		throw new InvalidArgumentError(
			result.error.issues[0]?.message ?? "invalid registry id"
		);
	}
	return result.data;
}
