export function stdinWritable(stdin: Bun.FileSink): WritableStream<Uint8Array> {
	return new WritableStream({
		write(chunk) {
			stdin.write(chunk);
			stdin.flush();
		},
		close() {
			stdin.end();
		},
		abort() {
			stdin.end();
		},
	});
}
