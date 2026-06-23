import { cp, mkdir, rm } from "node:fs/promises";
import { $ } from "bun";

// 1. Clean previous output
await rm(".vercel/output", { recursive: true, force: true });

// 2. Build the web app
console.log("Building web...");
await $`bun turbo build --filter=@cyrus/web`;

// 3. Bundle server into Build Output API function directory
console.log("Bundling server...");
const funcDir = ".vercel/output/functions/api/server.func";
await mkdir(funcDir, { recursive: true });

const result = await Bun.build({
	entrypoints: ["apps/server/src/server.ts"],
	outdir: funcDir,
	naming: "index.js",
	target: "bun",
	format: "esm",
});

if (!result.success) {
	result.logs.forEach(console.error);
	process.exit(1);
}

// 4. Write .vc-config.json for Bun runtime
await Bun.write(
	`${funcDir}/.vc-config.json`,
	JSON.stringify({
		runtime: "bun@1.x",
		handler: "index.js",
		maxDuration: 30,
	})
);

// 5. Copy static web files
console.log("Copying static files...");
await mkdir(".vercel/output/static", { recursive: true });
await cp("apps/web/dist", ".vercel/output/static", { recursive: true });

// 6. Write Build Output API config
await Bun.write(
	".vercel/output/config.json",
	JSON.stringify({
		version: 3,
		routes: [
			{ src: "^/api(?:/(.*))?$", dest: "/api/server" },
			{ src: "^/io(?:/(.*))?$", dest: "/api/server" },
			{ handle: "filesystem" },
			{ src: "/(.*)", dest: "/index.html" },
		],
	})
);

console.log("Done. .vercel/output/ ready for Vercel.");
