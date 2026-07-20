import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		name: "@cyrus/server-node",
		environment: "node",
		include: ["src/**/*.test.ts"],
		exclude: ["src/cloudflare/**"],
	},
});
