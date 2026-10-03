#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const platform = process.platform;
const arch = process.arch;
const pkg = `@soorya-u/cyrusd-${platform}-${arch}`;

let binary;
try {
	const dir = path.dirname(require.resolve(`${pkg}/package.json`));
	binary = path.join(dir, platform === "win32" ? "cyrusd.exe" : "cyrusd");
} catch {
	console.error(
		`cyrusd has no build for ${platform}-${arch} (missing ${pkg}). ` +
			"Reinstall without --no-optional / --omit=optional."
	);
	process.exit(1);
}

const result = spawnSync(binary, process.argv.slice(2), { stdio: "inherit" });
if (result.error) {
	console.error(`cyrusd failed to start: ${result.error.message}`);
	process.exit(1);
}
process.exit(result.status ?? 1);
