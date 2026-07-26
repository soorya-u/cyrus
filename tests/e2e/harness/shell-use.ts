import { existsSync, readdirSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { daemonStop, ShellUse } from "@microsoft/shell-use";

/** Fixed PTY size so terminal assertions stay stable across local and CI. */
export const TERMINAL_COLS = 80;
export const TERMINAL_ROWS = 24;

const SHELL_USE_NAME = "shell-use";
/** Pinned version from mise.toml / @microsoft/shell-use. */
const SHELL_USE_VERSION = "0.0.1-beta.5";

function findOnPath(binary: string): string | undefined {
	const pathEnv = process.env.PATH ?? "";
	for (const dir of pathEnv.split(delimiter)) {
		if (!dir) continue;
		const candidate = join(dir, binary);
		if (existsSync(candidate)) {
			return candidate;
		}
	}
}

function findMiseShellUseBinary(home: string): string | undefined {
	const installRoot = join(
		home,
		".local/share/mise/installs/github-microsoft-shell-use"
	);
	if (!existsSync(installRoot)) {
		return;
	}

	let versions: string[];
	try {
		versions = readdirSync(installRoot);
	} catch {
		return;
	}

	const ordered = versions.includes(SHELL_USE_VERSION)
		? [SHELL_USE_VERSION, ...versions.filter((v) => v !== SHELL_USE_VERSION)]
		: versions;

	for (const version of ordered) {
		const candidate = join(installRoot, version, SHELL_USE_NAME);
		if (existsSync(candidate)) {
			return candidate;
		}
	}
}

/**
 * Resolves the `shell-use` native binary. The npm package is only the client;
 * the binary must match `@microsoft/shell-use`'s version (see mise.toml).
 */
export function resolveShellUseBinary(): string {
	if (process.env.SHELL_USE_BIN) {
		return process.env.SHELL_USE_BIN;
	}

	const onPath = findOnPath(SHELL_USE_NAME);
	if (onPath) {
		return onPath;
	}

	const home = process.env.HOME;
	if (home) {
		const fromMise = findMiseShellUseBinary(home);
		if (fromMise) {
			return fromMise;
		}
		const localBin = join(home, ".local/bin/shell-use");
		if (existsSync(localBin)) {
			return localBin;
		}
	}

	throw new Error(
		"shell-use binary not found. Install via `mise install` (see mise.toml) or set SHELL_USE_BIN."
	);
}

export type TerminalSessionOptions = {
	session?: string;
};

/**
 * Opens an isolated shell-use session (unique daemon home), runs `fn`, then
 * always closes the session and deletes the temp home.
 *
 * Clears `NO_COLOR` on the Node process for the duration so a freshly started
 * daemon does not inherit a color-suppressing sandbox env into the PTY child.
 */
export async function withTerminalSession(
	fn: (su: ShellUse) => Promise<void>,
	options: TerminalSessionOptions = {}
): Promise<void> {
	const home = await mkdtemp(join(tmpdir(), "cyrus-shell-use-"));
	const session = options.session ?? `cyrus-${crypto.randomUUID()}`;
	const binary = resolveShellUseBinary();
	const previousNoColor = process.env.NO_COLOR;
	const previousForceColor = process.env.FORCE_COLOR;
	const previousTerm = process.env.TERM;

	delete process.env.NO_COLOR;
	process.env.FORCE_COLOR = "1";
	process.env.TERM = "xterm-256color";

	const clientOpts = { binary, home };
	await daemonStop(session, clientOpts).catch(() => undefined);

	const su = new ShellUse(session, clientOpts);

	try {
		await fn(su);
	} finally {
		await su.close().catch(() => undefined);
		await daemonStop(session, clientOpts).catch(() => undefined);
		await rm(home, { recursive: true, force: true }).catch(() => undefined);
		if (previousNoColor === undefined) {
			delete process.env.NO_COLOR;
		} else {
			process.env.NO_COLOR = previousNoColor;
		}
		if (previousForceColor === undefined) {
			delete process.env.FORCE_COLOR;
		} else {
			process.env.FORCE_COLOR = previousForceColor;
		}
		if (previousTerm === undefined) {
			delete process.env.TERM;
		} else {
			process.env.TERM = previousTerm;
		}
	}
}

/** Drops undefined values so the result is safe for shell-use `env`. */
export function toShellEnv(
	env: Record<string, string | undefined>
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(env)) {
		if (value !== undefined) {
			out[key] = value;
		}
	}
	return out;
}

/**
 * Env for a Worker CLI process under a real PTY. Forces ANSI colors and a
 * 256-color TERM so styled output is stable in CI and agent sandboxes that
 * set `NO_COLOR` / `TERM=dumb`.
 */
export function buildTerminalCliEnv(
	base: Record<string, string | undefined>
): Record<string, string> {
	const { NO_COLOR: _noColor, ...env } = toShellEnv(base);
	return {
		...env,
		FORCE_COLOR: "1",
		TERM: "xterm-256color",
	};
}
