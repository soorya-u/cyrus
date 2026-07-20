import type { Readable } from "node:stream";
import { setTimeout as sleep } from "node:timers/promises";

export async function waitForHttpOk(
	url: string,
	{
		timeoutMs = 60_000,
		intervalMs = 500,
	}: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<void> {
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		try {
			const response = await fetch(url);
			if (response.ok) {
				return;
			}
		} catch {
			// retry until timeout
		}
		await sleep(intervalMs);
	}

	throw new Error(`Timed out waiting for ${url}`);
}

async function readUntilMatch(
	stream: Readable,
	pattern: RegExp,
	timeoutMs: number
): Promise<string> {
	const decoder = new TextDecoder();
	let buffer = "";
	const deadline = Date.now() + timeoutMs;

	return await new Promise<string>((resolve, reject) => {
		const onData = (chunk: Buffer | string) => {
			const bytes = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
			buffer += decoder.decode(bytes, { stream: true });
			const match = buffer.match(pattern);
			if (match) {
				cleanup();
				resolve(match[0]);
			}
		};
		const onEnd = () => {
			cleanup();
			reject(
				new Error(
					`Stream ended before matching ${pattern}. Recent output: ${buffer.slice(-500)}`
				)
			);
		};
		const onError = (error: Error) => {
			cleanup();
			reject(error);
		};
		const timer = setTimeout(
			() => {
				cleanup();
				reject(
					new Error(
						`Timed out waiting for log line ${pattern}. Recent output: ${buffer.slice(-500)}`
					)
				);
			},
			Math.max(0, deadline - Date.now())
		);

		const cleanup = () => {
			clearTimeout(timer);
			stream.off("data", onData);
			stream.off("end", onEnd);
			stream.off("error", onError);
		};

		stream.on("data", onData);
		stream.once("end", onEnd);
		stream.once("error", onError);
	});
}

export async function waitForLogLine(
	stdout: Readable,
	stderr: Readable,
	pattern: RegExp,
	timeoutMs = 120_000
): Promise<string> {
	return await new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`Timed out waiting for log line ${pattern}`));
		}, timeoutMs);
		let failures = 0;

		const succeed = (match: string) => {
			clearTimeout(timer);
			resolve(match);
		};
		const fail = (error: unknown) => {
			failures += 1;
			if (failures === 2) {
				clearTimeout(timer);
				reject(error);
			}
		};

		readUntilMatch(stdout, pattern, timeoutMs).then(succeed).catch(fail);
		readUntilMatch(stderr, pattern, timeoutMs).then(succeed).catch(fail);
	});
}
