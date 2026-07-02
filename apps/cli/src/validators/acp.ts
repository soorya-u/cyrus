import { InvalidArgumentError } from "@commander-js/extra-typings";
import { z } from "zod";
import { nameSchema } from "./name";

export const commandSchema = z.string().min(1, "command cannot be empty");

export function commandArgParser(value: string): string {
	const result = commandSchema.safeParse(value);
	if (!result.success) {
		throw new InvalidArgumentError(
			result.error.issues[0]?.message ?? "invalid command"
		);
	}
	return result.data;
}

export function nameArgParser(value: string): string {
	const result = nameSchema.safeParse(value);
	if (!result.success) {
		throw new InvalidArgumentError(
			result.error.issues[0]?.message ?? "invalid name"
		);
	}
	return result.data;
}
