import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		setupFiles: ["@cyrus/test/setup/vitest.shared"],
		include: ["src/**/*.test.tsx"],
	},
});
