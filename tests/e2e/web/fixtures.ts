import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test as base } from "@playwright/test";
import type { E2eAuth } from "../harness/auth";
import {
	E2E_CLI_WORKER_NAME,
	writeCliWorkerState,
} from "../harness/cli-worker";
import { E2E_AUTH_FILE, requireE2e } from "../harness/env";
import {
	type PlaywrightE2eStack,
	startPlaywrightE2eStack,
	stopPlaywrightE2eStack,
} from "../harness/stack";
import { seedCliAccessTokenViaDeviceUi } from "./device-auth";

export type AuthFixture = E2eAuth;

type CliWorkerFixture = {
	name: string;
	restart: () => Promise<void>;
};

type WorkerFixtures = {
	stack: PlaywrightE2eStack;
	auth: AuthFixture;
	cliWorker: CliWorkerFixture;
};

export const test = base.extend<object, WorkerFixtures>({
	stack: [
		// Playwright fixture callbacks must destructure even when unused.
		async ({ browser: _browser }, use) => {
			requireE2e();
			const stack = await startPlaywrightE2eStack();
			try {
				await use(stack);
			} finally {
				await stopPlaywrightE2eStack(stack);
			}
		},
		{ scope: "worker", timeout: 180_000 },
	],
	auth: [
		async ({ browser, stack }, use) => {
			const auth = await seedCliAccessTokenViaDeviceUi(browser);
			await writeCliWorkerState(stack.cyrusHome, auth.token);
			await writeFile(
				join(stack.cyrusHome, E2E_AUTH_FILE),
				`${JSON.stringify(auth, null, 2)}\n`,
				{ mode: 0o600 }
			);
			await use(auth);
		},
		{ scope: "worker", timeout: 120_000 },
	],
	cliWorker: [
		async ({ stack, auth: _auth }, use) => {
			await stack.startWorker();
			await use({
				name: E2E_CLI_WORKER_NAME,
				restart: stack.restartWorker,
			});
		},
		{ scope: "worker", timeout: 120_000 },
	],
});
