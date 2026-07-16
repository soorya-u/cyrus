import { InvalidArgumentError } from "@commander-js/extra-typings";
import { nameSchema } from "./name";

export function nameArgParser(value: string): string {
	const result = nameSchema.safeParse(value);
	if (!result.success) {
		throw new InvalidArgumentError(
			result.error.issues[0]?.message ?? "invalid name"
		);
	}
	return result.data;
}
