import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import {
	buildCompiledCliBinaryOnce,
	CLI_WORKER_BINARY,
	CLI_WORKER_RUNTIME_DIRECTORY,
} from "./cli-worker";
import { buildCliEnv } from "./env";
import { waitForExit } from "./process";

const ESC = String.fromCharCode(27);
const ANSI_PATTERN = new RegExp(`${ESC}\\[[0-9;]*m`, "g");
const VERIFICATION_URL_PATTERN = /https?:\/\/\S*\/auth\/device(?:\?[^\s]*)?/i;
const USER_CODE_PATTERN = /enter the code:\s*([A-Z0-9]{4}-?[A-Z0-9]{4})/i;
const TRAILING_URL_PUNCTUATION_PATTERN = /[)\].,]+$/;

export type CliLoginPrompt = {
	verificationUrl: string;
	userCode: string;
};

export type CliLoginSession = {
	prompt: CliLoginPrompt;
	waitUntilDone: () => Promise<void>;
	kill: () => void;
};

function stripAnsi(value: string): string {
	return value.replace(ANSI_PATTERN, "");
}

export function parseCliLoginPrompt(output: string): CliLoginPrompt {
	const plain = stripAnsi(output);
	const urlMatch = plain.match(VERIFICATION_URL_PATTERN);
	const codeMatch = plain.match(USER_CODE_PATTERN);

	if (!(urlMatch?.[0] && codeMatch?.[1])) {
		throw new Error(
			`Could not parse CLI login prompt. Recent output: ${plain.slice(-500)}`
		);
	}

	return {
		verificationUrl: urlMatch[0].replace(TRAILING_URL_PUNCTUATION_PATTERN, ""),
		userCode: codeMatch[1].toUpperCase(),
	};
}

export async function readAccessTokenFromHome(home: string): Promise<string> {
	const configPath = join(home, "config.yml");
	let raw: string;
	try {
		raw = await readFile(configPath, "utf8");
	} catch (error) {
		throw new Error(
			`config.yml missing in ${home}: ${error instanceof Error ? error.message : String(error)}`
		);
	}

	let parsed: unknown;
	try {
		parsed = parseYaml(raw);
	} catch (error) {
		throw new Error(
			`config.yml in ${home} is not valid YAML: ${error instanceof Error ? error.message : String(error)}\nContents:\n${raw}`
		);
	}

	const token =
		parsed &&
		typeof parsed === "object" &&
		typeof (parsed as { token?: unknown }).token === "string"
			? (parsed as { token: string }).token
			: undefined;
	if (!token) {
		throw new Error(
			`config.yml in ${home} does not contain a token. Contents:\n${raw}`
		);
	}
	return token;
}

function collectLoginPrompt(
	proc: ChildProcessWithoutNullStreams
): Promise<CliLoginPrompt> {
	return new Promise((resolve, reject) => {
		let output = "";
		const timeout = setTimeout(() => {
			cleanup();
			reject(
				new Error(
					`Timed out waiting for CLI login prompt. Recent output: ${stripAnsi(output).slice(-500)}`
				)
			);
		}, 60_000);

		const handleOutput = (chunk: Buffer) => {
			output = `${output}${chunk.toString()}`.slice(-8000);
			try {
				const prompt = parseCliLoginPrompt(output);
				cleanup();
				resolve(prompt);
			} catch {
				// keep buffering until the prompt is complete
			}
		};
		const handleError = (error: Error) => {
			cleanup();
			reject(error);
		};
		const handleExit = (code: number | null) => {
			cleanup();
			reject(
				new Error(
					`CLI login exited with code ${code} before printing a prompt. Recent output: ${stripAnsi(output).slice(-500)}`
				)
			);
		};
		const cleanup = () => {
			clearTimeout(timeout);
			proc.stdout.off("data", handleOutput);
			proc.stderr.off("data", handleOutput);
			proc.off("error", handleError);
			proc.off("exit", handleExit);
		};

		proc.stdout.on("data", handleOutput);
		proc.stderr.on("data", handleOutput);
		proc.once("error", handleError);
		proc.once("exit", handleExit);
	});
}

/**
 * Spawns the compiled `cyrusd login` binary and resolves once it prints the
 * device-code verification URL. Callers approve in a browser, then await
 * `waitUntilDone` and read the token from `home`.
 */
export async function startCliLogin(home: string): Promise<CliLoginSession> {
	await buildCompiledCliBinaryOnce();

	const proc = spawn(CLI_WORKER_BINARY, ["login"], {
		cwd: CLI_WORKER_RUNTIME_DIRECTORY,
		env: buildCliEnv(home),
		stdio: "pipe",
	});

	const prompt = await collectLoginPrompt(proc);
	const done = waitForExit(proc).then((code) => {
		if (code !== 0) {
			throw new Error(`CLI login exited with code ${code}.`);
		}
	});

	return {
		prompt,
		waitUntilDone: () => done,
		kill: () => {
			if (proc.exitCode === null) {
				proc.kill("SIGTERM");
			}
		},
	};
}
