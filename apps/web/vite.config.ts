import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import evlog from "evlog/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	optimizeDeps: {
		include: ["evlog/client"],
		exclude: [
			"@soorya-u/better-auth-desktop/rpc/webview",
			"@soorya-u/better-auth-desktop/web",
		],
	},
	server: {
		proxy: {
			"/api/auth": {
				target: "http://127.0.0.1:8787",
				changeOrigin: true,
			},
		},
	},
	plugins: [
		devtools(),
		tsconfigPaths({ ignoreConfigErrors: true }),
		tailwindcss(),
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
		}),
		react(),
		evlog({ service: "cyrus/web" }),
	],
});
