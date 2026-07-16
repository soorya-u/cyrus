import type { RuntimeSession } from "@acp-kit/core";
import {
	type CoordinatorError,
	coordinatorRuntimeError,
} from "@cyrus/errors/coordinator";
import type { AgentEvent, ChatMessage } from "@cyrus/schemas/rtc/chat";
import { Result } from "better-result";
import { interactivePending } from "@/core/acp/interactive";
import type { AgentPool } from "@/core/acp/pool";
import { mapRuntimeSessionEvent } from "../acp/events";
import type { SessionMetadataStore } from "./metadata";
import { mapPromptBlocksToAcp } from "./prompt";
import type { ThreadSessionStore } from "./sessions";

export type PromptTurnDeps = {
	agentName: string;
	pool: AgentPool;
	sessions: ThreadSessionStore;
	metadata: SessionMetadataStore;
};

export async function* runPromptTurn(
	deps: PromptTurnDeps,
	threadId: string,
	projectId: string,
	cwd: string,
	sessionId: string,
	content: ChatMessage,
	turnId: string
): AsyncGenerator<AgentEvent> {
	await deps.sessions.ensureHealthyPool();

	const session = await deps.sessions.requireSession(
		threadId,
		projectId,
		cwd,
		sessionId
	);
	const queue: AgentEvent[] = [];
	let wake: (() => void) | undefined;

	const unbindTurn = interactivePending.bindTurn({
		sessionId: session.sessionId,
		threadId,
		turnId,
		pushEvent: (event) => {
			queue.push(event);
			wake?.();
		},
	});

	const unsub = session.on("event", (event) => {
		deps.metadata.syncFromEvent(threadId, event);
		queue.push(...mapRuntimeSessionEvent(event));
		wake?.();
	});

	try {
		const started = startPrompt(deps, session, content, cwd);
		if (started.isErr()) {
			yield {
				type: "thread_error",
				message: started.error.message,
				code: started.error._tag,
			};
			return;
		}

		const turn = started.value;

		while (true) {
			while (queue.length > 0) yield queue.shift() as AgentEvent;

			const raced = await Promise.race([
				turn.then((response) => ({ kind: "done" as const, response })),
				new Promise<{ kind: "update" }>((resolve) => {
					wake = () => resolve({ kind: "update" });
				}),
			]);

			if (raced.kind === "done") {
				while (queue.length > 0) yield queue.shift() as AgentEvent;
				return;
			}
		}
	} finally {
		unsub();
		unbindTurn();
		interactivePending.clearThread(threadId);
	}
}

function startPrompt(
	deps: PromptTurnDeps,
	session: RuntimeSession,
	blocks: ChatMessage,
	cwd: string
): Result<Promise<unknown>, CoordinatorError> {
	if (blocks.length === 1 && blocks[0]?.type === "text") {
		return Result.ok(session.prompt(blocks[0].text));
	}

	const connection = deps.pool.getSdkConnection(deps.agentName) as
		| {
				prompt: (params: {
					sessionId: string;
					prompt: ReturnType<typeof mapPromptBlocksToAcp>;
				}) => Promise<unknown>;
		  }
		| undefined;
	if (!connection?.prompt) {
		return Result.err(
			coordinatorRuntimeError(
				`agent ${deps.agentName} does not support structured prompts`
			)
		);
	}

	return Result.ok(
		connection.prompt({
			sessionId: session.sessionId,
			prompt: mapPromptBlocksToAcp(blocks, cwd),
		})
	);
}
