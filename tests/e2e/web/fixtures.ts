import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { test as base } from "@playwright/test";
import { seedCliAccessToken } from "../harness/auth";
import {
	buildCompiledCliBinaryOnce,
	CLI_CONNECTED_PATTERN,
	CLI_WORKER_COMMAND,
	CLI_WORKER_RUNTIME_DIRECTORY,
	E2E_CLI_WORKER_NAME,
	writeCliWorkerState,
} from "../harness/cli-worker";
import {
	buildCliEnv,
	createTempCyrusHome,
	E2E_SERVER_URL,
	requireE2e,
} from "../harness/env";

export type AuthFixture = Awaited<ReturnType<typeof seedCliAccessToken>>;

type CliWorkerFixture = {
	name: string;
};

type WorkerFixtures = {
	auth: AuthFixture;
	cliWorker: CliWorkerFixture;
};

function waitForCliWorker(
	cliWorkerProcess: ChildProcessWithoutNullStreams
): Promise<void> {
	return new Promise((resolve, reject) => {
		let output = "";
		const timeout = setTimeout(() => {
			cleanup();
			reject(
				new Error(
					`Timed out waiting for CLI Worker readiness. Recent output: ${output.slice(-500)}`
				)
			);
		}, 120_000);

		const handleOutput = (chunk: Buffer) => {
			output = `${output}${chunk.toString()}`.slice(-2000);
			if (CLI_CONNECTED_PATTERN.test(output)) {
				cleanup();
				cliWorkerProcess.stdout.resume();
				cliWorkerProcess.stderr.resume();
				resolve();
			}
		};
		const handleError = (error: Error) => {
			cleanup();
			reject(error);
		};
		const handleExit = (code: number | null) => {
			cleanup();
			reject(
				new Error(
					`CLI Worker exited with code ${code} before becoming ready. Recent output: ${output.slice(-500)}`
				)
			);
		};
		const cleanup = () => {
			clearTimeout(timeout);
			cliWorkerProcess.stdout.off("data", handleOutput);
			cliWorkerProcess.stderr.off("data", handleOutput);
			cliWorkerProcess.off("error", handleError);
			cliWorkerProcess.off("exit", handleExit);
		};

		cliWorkerProcess.stdout.on("data", handleOutput);
		cliWorkerProcess.stderr.on("data", handleOutput);
		cliWorkerProcess.once("error", handleError);
		cliWorkerProcess.once("exit", handleExit);
	});
}

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
		async ({ browserName: _browserName }, use) => {
			requireE2e();
			await use(await seedCliAccessToken(E2E_SERVER_URL));
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
				await waitForCliWorker(cliWorkerProcess);
				await use({ name: E2E_CLI_WORKER_NAME });
			} finally {
				await stopCliWorker(cliWorkerProcess);
				await rm(cyrusHome, { force: true, recursive: true });
			}
		},
		{ scope: "worker", timeout: 120_000 },
	],
});
