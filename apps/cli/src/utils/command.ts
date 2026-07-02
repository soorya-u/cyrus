import { accessSync, constants } from "node:fs";
import { Result } from "better-result";

/** Whether a configured agent command resolves to an executable. */
export function isCommandAvailable(command: string): boolean {
	if (Bun.which(command)) return true;
	if (!command.includes("/")) return false;

	return Result.try(() => {
		accessSync(command, constants.X_OK);
	}).isOk();
}
