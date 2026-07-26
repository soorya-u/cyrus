import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
	buildCompiledCliBinaryOnce,
	CLI_WORKER_BINARY,
	CLI_WORKER_RUNTIME_DIRECTORY,
} from "./cli-worker";
import {
	buildCliEnv,
	createTempCyrusHome,
	isE2eEnabled,
	requireE2e,
} from "./env";
import {
	buildTerminalCliEnv,
	TERMINAL_COLS,
	TERMINAL_ROWS,
	withTerminalSession,
} from "./shell-use";

/** Bun.color("red", "ansi-256") index used by red() / print.error. */
const RED_FG = 196;

const AGENT_ID = "claude-acp";
const UNHEALTHY_PATTERN = new RegExp(`${AGENT_ID}:\\s*unhealthy`);
const NO_DISTRIBUTION_PATTERN = /no supported distribution/i;

const e2eDescribe = isE2eEnabled() ? describe : describe.skip;

async function writeEnabledAgent(home: string): Promise<void> {
	await writeFile(
		join(home, "agents.yml"),
		[
			`${AGENT_ID}:`,
			`  registryId: "${AGENT_ID}"`,
			'  name: "Claude Agent"',
			'  icon: "https://cdn.agentclientprotocol.com/registry/v1/latest/claude-acp.svg"',
			"",
		].join("\n"),
		{ mode: 0o600 }
	);
}

/**
 * Fresh registry cache with an agent that has no installable distribution so
 * health fails locally (no CDN fetch, no agent subprocess).
 */
async function writeUnhealthyRegistryCache(home: string): Promise<void> {
	const acpDir = join(home, "acp");
	await mkdir(acpDir, { recursive: true });
	await writeFile(
		join(acpDir, "registry.json"),
		`${JSON.stringify({
			version: "1.0.0",
			agents: [
				{
					id: AGENT_ID,
					name: "Claude Agent",
					distribution: { binary: {} },
				},
			],
		})}\n`,
		{ mode: 0o600 }
	);
	await writeFile(
		join(acpDir, "registry_cache.json"),
		`${JSON.stringify({
			timestamp: Math.floor(Date.now() / 1000),
			version: "1.0.0",
		})}\n`,
		{ mode: 0o600 }
	);
}

e2eDescribe("cyrusd doctor terminal tier", () => {
	let cyrusHome: string | undefined;

	afterEach(async () => {
		if (cyrusHome) {
			await rm(cyrusHome, { recursive: true, force: true }).catch(
				() => undefined
			);
			cyrusHome = undefined;
		}
	});

	test("checks an enabled agent and prints unhealthy in red", async () => {
		requireE2e();
		await buildCompiledCliBinaryOnce();

		cyrusHome = await createTempCyrusHome();
		await writeEnabledAgent(cyrusHome);
		await writeUnhealthyRegistryCache(cyrusHome);

		const cliEnv = buildTerminalCliEnv(buildCliEnv(cyrusHome));

		await withTerminalSession(async (su) => {
			await su.run(
				CLI_WORKER_BINARY,
				["agents", "doctor", "--name", AGENT_ID],
				{
					cols: TERMINAL_COLS,
					rows: TERMINAL_ROWS,
					cwd: CLI_WORKER_RUNTIME_DIRECTORY,
					env: cliEnv,
				}
			);

			const size = await su.getSize();
			expect(size).toEqual({ cols: TERMINAL_COLS, rows: TERMINAL_ROWS });

			await su.waitText("unhealthy", { timeout: 60_000 });
			await su.expectText("unhealthy", {
				fg: String(RED_FG),
				strict: false,
			});
			await su.waitExit({ timeout: 15_000 });

			const state = await su.state();
			expect(state.text).toMatch(UNHEALTHY_PATTERN);
			expect(state.text).toMatch(NO_DISTRIBUTION_PATTERN);
		});
	}, 120_000);
});
