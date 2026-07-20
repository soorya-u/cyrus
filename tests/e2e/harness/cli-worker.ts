import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { waitForExit } from "./process";

export const CLI_CONNECTED_PATTERN = /connected.*waiting for message/i;
export const E2E_CLI_WORKER_ID = "e2e-worker-1";
export const E2E_CLI_WORKER_NAME = "E2E Worker";
export const CLI_WORKER_DIRECTORY = fileURLToPath(
	new URL("../../../apps/cli", import.meta.url)
);
/** Directory that contains `cyrusd` and its staged runtime `node_modules`. */
export const CLI_WORKER_RUNTIME_DIRECTORY = join(CLI_WORKER_DIRECTORY, "dist");
export const CLI_WORKER_BINARY = join(CLI_WORKER_RUNTIME_DIRECTORY, "cyrusd");
export const CLI_WORKER_COMMAND = [CLI_WORKER_BINARY, "start"] as const;

const BUILD_COMPILE_SCRIPT = join(
	CLI_WORKER_DIRECTORY,
	"scripts/build-compile.sh"
);

let buildPromise: Promise<void> | undefined;

async function runCompiledCliBuild(): Promise<void> {
	const proc = spawn(BUILD_COMPILE_SCRIPT, [], {
		cwd: CLI_WORKER_DIRECTORY,
		env: process.env,
		stdio: "inherit",
	});
	const exitCode = await waitForExit(proc);
	if (exitCode !== 0) {
		throw new Error(
			`CLI compiled-binary build failed with exit code ${exitCode ?? "null"}`
		);
	}
}

/**
 * Rebuilds the CLI binary once per process (always runs the compile script;
 * never skips because a prior binary exists on disk).
 */
export function buildCompiledCliBinaryOnce(): Promise<void> {
	if (!buildPromise) {
		buildPromise = runCompiledCliBuild().catch((error: unknown) => {
			buildPromise = undefined;
			throw error;
		});
	}
	return buildPromise;
}

export async function writeCliWorkerState(
	home: string,
	token: string
): Promise<void> {
	await Promise.all([
		writeFile(
			join(home, "config.yml"),
			[
				`token: ${JSON.stringify(token)}`,
				`id: ${JSON.stringify(E2E_CLI_WORKER_ID)}`,
				`name: ${JSON.stringify(E2E_CLI_WORKER_NAME)}`,
				"",
			].join("\n"),
			{ mode: 0o600 }
		),
		writeFile(
			join(home, "agents.yml"),
			[
				"claude-acp:",
				'  registryId: "claude-acp"',
				'  name: "Claude Agent"',
				'  icon: "https://cdn.agentclientprotocol.com/registry/v1/latest/claude-acp.svg"',
				"",
			].join("\n"),
			{ mode: 0o600 }
		),
	]);
}
