import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			"apps/web/vitest.config.ts",
			"apps/server/vitest.config.ts",
			"apps/server/vitest.node.config.ts",
			"shared/hooks/vitest.config.ts",
			"shared/providers/vitest.config.ts",
		],
		coverage: {
			provider: "istanbul",
		},
	},
});
