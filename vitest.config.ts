import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

function packageRoot(...segments: string[]): string {
	return path.join(repoRoot, ...segments);
}

export default defineConfig({
	test: {
		projects: [
			{
				root: packageRoot("apps/web"),
				plugins: [tsconfigPaths({ ignoreConfigErrors: true }), react()],
				test: {
					name: "@cyrus/web",
					environment: "jsdom",
					setupFiles: ["@cyrus/test/setup/vitest.shared"],
					include: ["src/**/*.test.{ts,tsx}"],
				},
			},
			{
				root: packageRoot("apps/server"),
				plugins: [
					cloudflareTest({
						wrangler: { configPath: packageRoot("wrangler.json") },
						miniflare: {
							bindings: {
								ALLOWED_ORIGINS: "https://cyrus.soorya-u.dev",
								BETTER_AUTH_SECRET:
									"test-secret-that-is-at-least-thirty-two-characters",
								NODE_ENV: "testing",
								OAUTH_GITHUB_CLIENT_ID: "test-client-id",
								OAUTH_GITHUB_CLIENT_SECRET: "test-client-secret",
								OAUTH_PROXY_SECRET: "test-oauth-proxy-secret",
								PRODUCTION_URL: "https://cyrus.soorya-u.dev",
								WEB_APP_URL: "https://cyrus.soorya-u.dev",
							},
						},
					}),
				],
				test: {
					name: "@cyrus/server",
					include: ["src/**/*.test.ts"],
					setupFiles: ["./src/db/migrations/apply.ts"],
					testTimeout: 15_000,
				},
			},
			{
				root: packageRoot("shared/connections"),
				test: {
					name: "@cyrus/connections",
					environment: "node",
					include: ["src/**/*.test.ts"],
				},
			},
			{
				root: packageRoot("shared/constants"),
				test: {
					name: "@cyrus/constants",
					environment: "node",
					include: ["src/**/*.test.ts"],
				},
			},
			{
				root: packageRoot("shared/database"),
				test: {
					name: "@cyrus/database",
					environment: "node",
					include: ["src/**/*.test.ts"],
				},
			},
			{
				root: packageRoot("shared/database"),
				test: {
					name: "database-integration",
					environment: "node",
					include: ["__tests__/integration/**/*.test.ts"],
				},
			},
			{
				root: packageRoot("shared/hooks"),
				test: {
					name: "@cyrus/hooks",
					environment: "jsdom",
					setupFiles: ["@cyrus/test/setup/vitest.shared"],
					include: ["src/**/*.test.{ts,tsx}"],
				},
			},
			{
				root: packageRoot("shared/providers"),
				test: {
					name: "@cyrus/providers",
					environment: "jsdom",
					setupFiles: ["@cyrus/test/setup/vitest.shared"],
					include: ["src/**/*.test.{ts,tsx}"],
				},
			},
			{
				root: packageRoot("shared/schemas"),
				test: {
					name: "@cyrus/schemas",
					environment: "node",
					include: ["src/**/*.test.ts"],
				},
			},
			{
				root: packageRoot("shared/utils"),
				test: {
					name: "@cyrus/utils",
					environment: "node",
					include: ["src/**/*.test.ts"],
				},
			},
			{
				root: packageRoot("tests/e2e"),
				test: {
					name: "e2e",
					environment: "node",
					include: ["harness/**/*.test.ts"],
					testTimeout: 180_000,
					fileParallelism: false,
				},
			},
		],
		coverage: { provider: "istanbul" },
	},
});
