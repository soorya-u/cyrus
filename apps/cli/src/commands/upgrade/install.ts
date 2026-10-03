import { chmod, realpath, rename, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve, sep } from "node:path";
import type { ReleaseOs } from "@cyrus/constants/release";
import { UpgradeIntegrityError, UpgradeSwapError } from "@cyrus/errors/upgrade";
import { Result } from "better-result";
import { toMessage } from "@/utils/error";

export type InstallKind = "managed" | "npm" | "other";

// fixed under the home directory, not CYRUS_HOME: that holds one worker's data
const INSTALL_DIR = join(homedir(), ".cyrus", "bin");

export function installBinPath(os: ReleaseOs): string {
	return join(INSTALL_DIR, os === "windows" ? "cyrusd.exe" : "cyrusd");
}

export function reinstallCommand(os: ReleaseOs): string {
	return os === "windows"
		? "irm https://cyrus.soorya.dev/install.ps1 | iex"
		: "curl -fsSL https://cyrus.soorya.dev/install.sh | sh";
}

/** Only a binary at the installer's path is ours to overwrite. */
export function classifyInstall(
	execPath: string,
	installBin: string
): InstallKind {
	if (resolve(execPath) === resolve(installBin)) return "managed";
	if (resolve(execPath).split(sep).includes("node_modules")) return "npm";
	return "other";
}

export async function realExecPath(): Promise<string> {
	return await realpath(process.execPath).catch(() => process.execPath);
}

/** Runs the downloaded binary and returns the version it reports. */
export async function reportedVersion(
	file: string
): Promise<Result<string, UpgradeIntegrityError>> {
	return await Result.tryPromise({
		try: async () => {
			const proc = Bun.spawn([file, "--version"], {
				stdout: "pipe",
				stderr: "ignore",
			});
			const [out, code] = await Promise.all([
				new Response(proc.stdout).text(),
				proc.exited,
			]);
			if (code !== 0) throw new Error(`exited with code ${code}`);
			return out.trim();
		},
		catch: (error) =>
			new UpgradeIntegrityError({
				asset: file,
				detail: `the downloaded binary does not run (${toMessage(error)})`,
			}),
	});
}

export async function makeExecutable(
	file: string,
	os: ReleaseOs
): Promise<void> {
	if (os !== "windows") await chmod(file, 0o755);
}

/**
 * Atomically replaces `current` with `next`. A running executable can be
 * renamed over on Unix; Windows only allows renaming it aside first.
 */
export async function swapBinary(
	current: string,
	next: string,
	os: ReleaseOs
): Promise<Result<void, UpgradeSwapError>> {
	return await Result.tryPromise({
		try: async () => {
			if (os !== "windows") {
				await rename(next, current);
				return;
			}
			const aside = `${current}.old`;
			await rm(aside, { force: true });
			await rename(current, aside);
			await rename(next, current).catch(async (error) => {
				await rename(aside, current);
				throw error;
			});
		},
		catch: (error) =>
			new UpgradeSwapError({ path: current, detail: toMessage(error) }),
	});
}
