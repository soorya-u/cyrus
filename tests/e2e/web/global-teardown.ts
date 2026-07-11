import { readFile } from "node:fs/promises";
import type { FullConfig } from "@playwright/test";
import { playwrightStatePath } from "./state";

async function globalTeardown(_config: FullConfig): Promise<void> {
	const pid = process.env.PLAYWRIGHT_STACK_PID;
	if (pid) {
		process.kill(Number(pid), "SIGTERM");
	}

	try {
		await readFile(playwrightStatePath(), "utf8");
	} catch {
		// no state file to clean up
	}
}

export default globalTeardown;
