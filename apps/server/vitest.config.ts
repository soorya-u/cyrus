import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: "../../wrangler.json" },
			miniflare: {
				bindings: {
					ALLOWED_ORIGINS: "https://example.com",
					BETTER_AUTH_SECRET:
						"test-secret-that-is-at-least-thirty-two-characters",
					DATABASE_URL: "postgresql://test:test@localhost:5432/test",
					NODE_ENV: "testing",
					OAUTH_GITHUB_CLIENT_ID: "test-client-id",
					OAUTH_GITHUB_CLIENT_SECRET: "test-client-secret",
					OAUTH_PROXY_SECRET: "test-oauth-proxy-secret",
					PRODUCTION_URL: "https://example.com",
					WEB_APP_URL: "https://example.com",
				},
			},
		}),
	],
	test: {
		include: ["src/cloudflare/**/*.test.ts"],
		testTimeout: 15_000,
	},
});
