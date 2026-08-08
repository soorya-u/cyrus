import { appendConversation } from "@cyrus/database/repositories/conversations";
import { resolveThreadGitCwd } from "@cyrus/database/repositories/git";
import { orpcOk, throwOrpc } from "@cyrus/errors/orpc";
import type {
	ChatChunk,
	ShellExecutionEndStatus,
	ShellExecutionLine,
} from "@cyrus/schemas/rtc/chat";
import { randomId } from "@cyrus/utils/identity";
import { Result } from "better-result";
import { log } from "evlog";
import { env } from "@/lib/env";
import type { ControllerDeps } from "./deps";

function toError(cause: unknown): Error {
	return cause instanceof Error ? cause : new Error(String(cause));
}

type EventBusPublisher = { eventBus: { publish: (chunk: ChatChunk) => void } };

type ActiveShellExecution = {
	threadId: string;
	kill: (status: ShellExecutionEndStatus) => void;
};

const activeShellExecutions = new Map<string, ActiveShellExecution>();

export async function pumpLines(
	stream: ReadableStream<Uint8Array> | null,
	streamName: ShellExecutionLine["stream"],
	onLine: (line: ShellExecutionLine) => void
): Promise<void> {
	if (!stream) return;
	const decoder = new TextDecoder();
	const reader = stream.getReader();
	let buffer = "";
	for (;;) {
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

async function runShellExecution(options: {
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
		catch: toError,
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
		catch: toError,
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

export function shellHandlers({ os }: ControllerDeps) {
	return {
		executeShellInput: os.executeShellInput.handler(
			async ({ input, context }) => {
				const { threadId, command } = input;
				const cwd = orpcOk(await resolveThreadGitCwd(threadId));
				const shellExecutionId = randomId();

				const started = await appendConversation(threadId, {
					threadId,
					shellExecutionId,
					event: { type: "shell_execution_start", command },
				});
				if (started.isErr()) throwOrpc(started.error);
				context.eventBus.publish(started.value.chunk);

				runShellExecution({
					command,
					context,
					cwd,
					shellExecutionId,
					threadId,
				}).catch((error) => {
					log.error({
						kind: "shell_execution_failed",
						error,
						shellExecutionId,
						threadId,
					});
				});

				return { shellExecutionId };
			}
		),

		cancelShellExecution: os.cancelShellExecution.handler(({ input }) => {
			const active = activeShellExecutions.get(input.shellExecutionId);
			if (active && active.threadId === input.threadId) {
				active.kill("cancelled");
			}
			return {};
		}),
	};
}
