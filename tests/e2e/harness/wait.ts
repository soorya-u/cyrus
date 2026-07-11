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

export async function waitForLogLine(
	stream: ReadableStream<Uint8Array>,
	pattern: RegExp,
	timeoutMs = 60_000
): Promise<string> {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		const { done, value } = await Promise.race([
			reader.read(),
			Bun.sleep(Math.min(500, deadline - Date.now())).then(() => ({
				done: false,
				value: undefined,
			})),
		]);

		if (value) {
			buffer += decoder.decode(value, { stream: true });
			const match = buffer.match(pattern);
			if (match) {
				await reader.cancel();
				return match[0];
			}
		}

		if (done) {
			break;
		}
	}

	await reader.cancel();
	throw new Error(`Timed out waiting for log line ${pattern}`);
}
