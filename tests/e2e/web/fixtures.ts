import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { test as base } from "@playwright/test";
import type { E2eAuth } from "../harness/auth";
import {
	buildCompiledCliBinaryOnce,
	CLI_WORKER_COMMAND,
	CLI_WORKER_RUNTIME_DIRECTORY,
	E2E_CLI_WORKER_NAME,
	writeCliWorkerState,
} from "../harness/cli-worker";
import { buildCliEnv, createTempCyrusHome, requireE2e } from "../harness/env";
import { waitForHealthy } from "../harness/wait";
import { seedCliAccessTokenViaDeviceUi } from "./device-auth";

export type AuthFixture = E2eAuth;

type CliWorkerFixture = {
	name: string;
};

type WorkerFixtures = {
	auth: AuthFixture;
	cliWorker: CliWorkerFixture;
};

async function stopCliWorker(
	cliWorkerProcess: ChildProcessWithoutNullStreams
): Promise<void> {
	if (cliWorkerProcess.exitCode !== null) {
		return;
	}

	await new Promise<void>((resolve) => {
		const forceKill = setTimeout(() => cliWorkerProcess.kill("SIGKILL"), 5000);
		cliWorkerProcess.once("exit", () => {
			clearTimeout(forceKill);
			resolve();
		});
		cliWorkerProcess.kill("SIGTERM");
	});
}

export const test = base.extend<object, WorkerFixtures>({
	auth: [
		async ({ browser }, use) => {
			requireE2e();
			await use(await seedCliAccessTokenViaDeviceUi(browser));
		},
		{ scope: "worker", timeout: 120_000 },
	],
	cliWorker: [
		async ({ auth }, use) => {
			await buildCompiledCliBinaryOnce();
			const cyrusHome = await createTempCyrusHome();
			await writeCliWorkerState(cyrusHome, auth.token);
			const cliWorkerProcess = spawn(
				CLI_WORKER_COMMAND[0],
				[...CLI_WORKER_COMMAND.slice(1)],
				{
					cwd: CLI_WORKER_RUNTIME_DIRECTORY,
					env: buildCliEnv(cyrusHome),
					stdio: "pipe",
				}
			);

			try {
				await waitForHealthy(cyrusHome);
				await use({ name: E2E_CLI_WORKER_NAME });
			} finally {
				await stopCliWorker(cliWorkerProcess);
				await rm(cyrusHome, { force: true, recursive: true });
			}
		},
		{ scope: "worker", timeout: 120_000 },
	],
});
