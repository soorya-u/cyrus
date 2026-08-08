import { describe, expect, test } from "bun:test";
import type { ShellExecutionLine } from "@cyrus/schemas/rtc/chat";
import { pumpLines } from "./shell";

function streamFromChunks(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
	return new ReadableStream({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(chunk);
			controller.close();
		},
	});
}

function encode(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}

async function collectLines(
	stream: ReadableStream<Uint8Array> | null
): Promise<ShellExecutionLine[]> {
	const lines: ShellExecutionLine[] = [];
	await pumpLines(stream, "stdout", (line) => lines.push(line));
	return lines;
}

describe("pumpLines", () => {
	test("splits a single chunk into its newline-terminated lines", async () => {
		const lines = await collectLines(streamFromChunks([encode("a\nb\nc\n")]));
		expect(lines).toEqual([
			{ stream: "stdout", text: "a" },
			{ stream: "stdout", text: "b" },
			{ stream: "stdout", text: "c" },
		]);
	});

	test("joins a line split across two read chunks", async () => {
		const lines = await collectLines(
			streamFromChunks([encode("hello wor"), encode("ld\n")])
		);
		expect(lines).toEqual([{ stream: "stdout", text: "hello world" }]);
	});

	test("emits trailing text with no final newline as its own line", async () => {
		const lines = await collectLines(streamFromChunks([encode("no newline")]));
		expect(lines).toEqual([{ stream: "stdout", text: "no newline" }]);
	});

	test("decodes a multi-byte UTF-8 character split across chunk boundaries", async () => {
		// "🎉" is 4 bytes in UTF-8 — split it in the middle of the codepoint.
		const bytes = encode("party 🎉\n");
		const lines = await collectLines(
			streamFromChunks([bytes.slice(0, 7), bytes.slice(7)])
		);
		expect(lines).toEqual([{ stream: "stdout", text: "party 🎉" }]);
	});

	test("emits nothing for an empty stream", async () => {
		const lines = await collectLines(streamFromChunks([]));
		expect(lines).toEqual([]);
	});

	test("resolves immediately for a null stream (stdout/stderr absent)", async () => {
		const lines = await collectLines(null);
		expect(lines).toEqual([]);
	});
});
