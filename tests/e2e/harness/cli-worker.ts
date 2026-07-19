import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const CLI_CONNECTED_PATTERN = /connected.*waiting for message/i;
export const E2E_CLI_WORKER_ID = "e2e-worker-1";
export const E2E_CLI_WORKER_NAME = "E2E Worker";
export const CLI_WORKER_COMMAND = ["bun", "src/cli.ts", "start"] as const;
export const CLI_WORKER_DIRECTORY = fileURLToPath(
	new URL("../../../apps/cli", import.meta.url)
);

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
