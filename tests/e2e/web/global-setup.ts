import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import type { FullConfig } from "@playwright/test";
import { playwrightStatePath } from "./state";

async function globalSetup(_config: FullConfig): Promise<void> {
	if (process.env.CYRUS_E2E !== "1") {
		return;
	}

	const script = join(import.meta.dirname, "prepare-playwright.ts");
	const proc = spawn("bun", [script], {
		env: { ...process.env, CYRUS_E2E: "1" },
		stdio: "inherit",
	});

	for (let attempt = 0; attempt < 120; attempt += 1) {
		try {
			await readFile(playwrightStatePath(), "utf8");
			process.env.PLAYWRIGHT_STACK_PID = String(proc.pid ?? "");
			return;
		} catch {
			await sleep(1000);
		}
	}

	proc.kill();
	throw new Error("Playwright stack failed to start.");
}

export default globalSetup;
