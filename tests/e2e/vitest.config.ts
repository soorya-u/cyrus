import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["scenarios/**/*.test.ts"],
		testTimeout: 180_000,
		// Scenarios spin up real dev servers on fixed ports (8787, 5173);
		// running files in parallel would clash on those ports.
		fileParallelism: false,
	},
});
