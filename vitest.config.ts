import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			"apps/web/vitest.config.ts",
			"apps/server/vitest.config.ts",
			"shared/connections/vitest.config.ts",
			"shared/constants/vitest.config.ts",
			"shared/database/vitest.config.ts",
			"shared/hooks/vitest.config.ts",
			"shared/providers/vitest.config.ts",
			"shared/schemas/vitest.config.ts",
			"shared/utils/vitest.config.ts",
			"tests/e2e/vitest.config.ts",
		],
		coverage: {
			provider: "istanbul",
		},
	},
});
