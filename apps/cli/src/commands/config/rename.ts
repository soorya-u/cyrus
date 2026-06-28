import { z } from "zod";
import { set } from "@/utils/store";
import { print } from "@/utils/style";

const nameSchema = z
	.string()
	.min(1, "name cannot be empty")
	.max(64, "name is too long (max 64 characters)")
	.regex(
		/^[a-zA-Z0-9_-]+$/,
		"name may only contain letters, numbers, hyphens and underscores"
	);

export async function rename(name: string): Promise<void> {
	const result = nameSchema.safeParse(name);
	if (!result.success) {
		print.error`${result.error.issues[0]?.message ?? "invalid name"}`;
		process.exit(1);
	}
	await set("name", result.data);
	print.success`✓ renamed to "${result.data}"`;
}
