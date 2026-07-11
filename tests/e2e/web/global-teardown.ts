import { unlink } from "node:fs/promises";
import type { FullConfig } from "@playwright/test";
import { Result } from "better-result";
import { playwrightStatePath } from "./state";

async function globalTeardown(_config: FullConfig): Promise<void> {
	const pid = process.env.PLAYWRIGHT_STACK_PID;
	if (pid) {
		Result.try(() => process.kill(Number(pid), "SIGTERM"));
	}

	(await Result.tryPromise(() => unlink(playwrightStatePath()))).tapError(
		() => {
			// no state file to clean up
		}
	);
}

export default globalTeardown;
