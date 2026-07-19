import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [tsconfigPaths({ ignoreConfigErrors: true }), react()],
	test: {
		environment: "jsdom",
		setupFiles: ["@cyrus/test/setup/vitest.shared"],
		include: ["src/**/*.test.tsx"],
	},
});
