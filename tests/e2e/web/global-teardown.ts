import { unlink } from "node:fs/promises";
import type { FullConfig } from "@playwright/test";
import { playwrightStatePath } from "./state";

async function globalTeardown(_config: FullConfig): Promise<void> {
	const pid = process.env.PLAYWRIGHT_STACK_PID;
	if (pid) {
		try {
			process.kill(Number(pid), "SIGTERM");
		} catch {
			// process already exited
		}
	}

	try {
		await unlink(playwrightStatePath());
	} catch {
		// no state file to clean up
	}
}

export default globalTeardown;
