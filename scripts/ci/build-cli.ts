/**
 * Compile apps/cli to a single-file binary (dist/cyrusd).
 * Invoked by @cyrus/cli's `build` script and by other tooling (e.g. E2E harness).
 *
 * Uses the `bun build` CLI (not `Bun.build()`) so the artifact stays byte-identical
 * to the historical package.json one-liner — Bun's JS API produces a different binary
 * for the same flags today.
 *
 * @see https://bun.com/docs/bundler/executables
 */
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const cliRoot = join(repoRoot, "apps/cli");

const proc = Bun.spawn(
	[
		"bun",
		"build",
		"src/cli.ts",
		"--compile",
		"--env",
		"CLI_PUBLIC_*",
		"--external",
		"drizzle-kit",
		"--outfile",
		"dist/cyrusd",
	],
	{
		cwd: cliRoot,
		stdout: "inherit",
		stderr: "inherit",
	}
);

const code = await proc.exited;
if (code !== 0) {
	process.exit(code);
}
