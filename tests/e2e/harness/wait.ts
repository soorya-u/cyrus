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
		await Bun.sleep(intervalMs);
	}

	throw new Error(`Timed out waiting for ${url}`);
}

async function readUntilMatch(
	stream: ReadableStream<Uint8Array>,
	pattern: RegExp,
	timeoutMs: number
): Promise<string> {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	const deadline = Date.now() + timeoutMs;

	try {
		while (Date.now() < deadline) {
			const { done, value } = await reader.read();
			if (value) {
				buffer += decoder.decode(value, { stream: true });
				const match = buffer.match(pattern);
				if (match) {
					return match[0];
				}
			}

			if (done) {
				break;
			}
		}
	} finally {
		await reader.cancel().catch(() => undefined);
	}

	throw new Error(
		`Timed out waiting for log line ${pattern}. Recent output: ${buffer.slice(-500)}`
	);
}

export async function waitForLogLine(
	stdout: ReadableStream<Uint8Array>,
	stderr: ReadableStream<Uint8Array>,
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
