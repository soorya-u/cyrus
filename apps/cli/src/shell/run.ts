import { appendConversation } from "@cyrus/database/repositories/conversations";
import {
	shellErrorMessageFromUnknown,
	shellSpawnFailed,
	shellStreamFailed,
} from "@cyrus/errors/shell";
import type {
	ChatChunk,
	ShellExecutionEndStatus,
	ShellExecutionLine,
} from "@cyrus/schemas/rtc/chat";
import { Result } from "better-result";
import { log } from "evlog";
import { env } from "@/lib/env";

type EventBusPublisher = { eventBus: { publish: (chunk: ChatChunk) => void } };

type ActiveShellExecution = {
	threadId: string;
	kill: (status: ShellExecutionEndStatus) => void;
};

const activeShellExecutions = new Map<string, ActiveShellExecution>();

export function cancelActiveShellExecution(
	threadId: string,
	shellExecutionId: string
): void {
	const active = activeShellExecutions.get(shellExecutionId);
	if (active && active.threadId === threadId) {
		active.kill("cancelled");
	}
}

export async function pumpLines(
	stream: ReadableStream<Uint8Array> | null,
	streamName: ShellExecutionLine["stream"],
	onLine: (line: ShellExecutionLine) => void
): Promise<void> {
	if (!stream) return;
	const decoder = new TextDecoder();
	const reader = stream.getReader();
	let buffer = "";
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const parts = buffer.split("\n");
		buffer = parts.pop() ?? "";
		for (const text of parts) onLine({ stream: streamName, text });
	}
	buffer += decoder.decode();
	if (buffer.length > 0) onLine({ stream: streamName, text: buffer });
}

export async function runShellExecution(options: {
	command: string;
	cwd: string;
	context: EventBusPublisher;
	shellExecutionId: string;
	threadId: string;
}): Promise<void> {
	const { command, cwd, context, shellExecutionId, threadId } = options;
	const lines: ShellExecutionLine[] = [];

	function emitLine(line: ShellExecutionLine): void {
		lines.push(line);
		context.eventBus.publish({
			threadId,
			shellExecutionId,
			seq: 0,
			event: { type: "shell_execution_line", lines: [line] },
		});
	}

	async function finish(
		status: ShellExecutionEndStatus,
		exitCode: number | null
	): Promise<void> {
		const event = {
			type: "shell_execution_end" as const,
			status,
			exitCode,
			lines,
		};
		const entry = await appendConversation(threadId, {
			threadId,
			shellExecutionId,
			event,
		});
		if (entry.isErr()) {
			log.error({
				kind: "shell_execution_persist_failed",
				error: entry.error,
				threadId,
				shellExecutionId,
			});
			context.eventBus.publish({ threadId, shellExecutionId, seq: 0, event });
			return;
		}
		context.eventBus.publish(entry.value.chunk);
	}

	const spawned = Result.try({
		try: () =>
			Bun.spawn(["sh", "-c", command], {
				cwd,
				stderr: "pipe",
				stdout: "pipe",
			}),
		catch: (cause) => shellSpawnFailed(shellErrorMessageFromUnknown(cause)),
	});
	if (spawned.isErr()) {
		log.error({
			kind: "shell_execution_spawn_failed",
			error: spawned.error,
			threadId,
		});
		await finish("spawn_error", null);
		return;
	}
	const subprocess = spawned.value;

	let killedFor: ShellExecutionEndStatus | null = null;
	function kill(status: ShellExecutionEndStatus): void {
		if (killedFor) return;
		killedFor = status;
		subprocess.kill();
	}

	activeShellExecutions.set(shellExecutionId, { threadId, kill });
	const timeoutHandle = setTimeout(() => {
		kill("timeout");
	}, env.CYRUS_SHELL_INPUT_TIMEOUT_MS);

	const streamed = await Result.tryPromise({
		try: async () => {
			await Promise.all([
				pumpLines(subprocess.stdout, "stdout", emitLine),
				pumpLines(subprocess.stderr, "stderr", emitLine),
			]);
			return await subprocess.exited;
		},
		catch: (cause) => shellStreamFailed(shellErrorMessageFromUnknown(cause)),
	});

	clearTimeout(timeoutHandle);
	activeShellExecutions.delete(shellExecutionId);

	if (streamed.isErr()) {
		log.error({
			kind: "shell_execution_stream_failed",
			error: streamed.error,
			shellExecutionId,
			threadId,
		});
		await finish(killedFor ?? "exited", null);
		return;
	}
	await finish(killedFor ?? "exited", killedFor ? null : streamed.value);
}
