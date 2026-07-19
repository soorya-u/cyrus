import { join } from "node:path";
import { defineConfig } from "@playwright/test";
import { WEB_DEV_COMMAND, WRANGLER_DEV_COMMAND } from "../harness/dev-servers";
import {
	buildServerEnv,
	buildWebEnv,
	E2E_SERVER_URL,
	E2E_WEB_URL,
	isE2eEnabled,
} from "../harness/env";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const PROCESS_ENV = Object.fromEntries(
	Object.entries(process.env).filter(
		(entry): entry is [string, string] => entry[1] !== undefined
	)
);
const SERVER_ENV = isE2eEnabled() ? buildServerEnv() : undefined;
const SERVER_COMMAND = [
	"bun tests/e2e/web/prepare-database.ts &&",
	"exec",
	...WRANGLER_DEV_COMMAND,
	...Object.keys(SERVER_ENV ?? {}).map((key) => `--var ${key}:"$${key}"`),
].join(" ");

export default defineConfig({
	testDir: "./specs",
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	timeout: 120_000,
	reporter: [["list"]],
	use: {
		baseURL: E2E_WEB_URL,
		trace: "on-first-retry",
	},
	webServer: SERVER_ENV
		? [
				{
					command: SERVER_COMMAND,
					cwd: REPO_ROOT,
					env: { ...PROCESS_ENV, ...SERVER_ENV },
					url: `${E2E_SERVER_URL}/health`,
					reuseExistingServer: false,
					timeout: 120_000,
				},
				{
					command: WEB_DEV_COMMAND.join(" "),
					cwd: join(REPO_ROOT, "apps/web"),
					env: { ...PROCESS_ENV, ...buildWebEnv() },
					url: E2E_WEB_URL,
					reuseExistingServer: false,
					timeout: 120_000,
				},
			]
		: undefined,
	projects: [
		{
			name: "chromium",
			use: { browserName: "chromium" },
		},
	],
});
