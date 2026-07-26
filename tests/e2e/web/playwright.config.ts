import { defineConfig } from "@playwright/test";
import { E2E_WEB_URL } from "../harness/env";

export default defineConfig({
	testDir: "./specs",
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	timeout: 180_000,
	reporter: [["list"]],
	use: {
		baseURL: E2E_WEB_URL,
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { browserName: "chromium" },
		},
	],
});
