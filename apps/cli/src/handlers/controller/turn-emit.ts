import type { RtcContext } from "@cyrus/connections/rtc/peer";
import { appendConversation } from "@cyrus/database/repositories/conversations";
import {
	applyAgentThreadTitle,
	setAgentLocked,
} from "@cyrus/database/repositories/threads";
import { throwOrpc } from "@cyrus/errors/orpc";
import type { ChatChunk, ChatMessage } from "@cyrus/schemas/rtc/chat";
import { log } from "evlog";
import type { WorkerRuntime } from "@/core";
import { runTurn } from "@/utils/run-turn";
import {
	isStreamingDelta,
	resolvePersistEvent,
	trackDelta,
} from "@/utils/streams";
import { maybeApplyAutoThreadTitle } from "@/utils/thread-title";

type TurnEmitters = {
	emit: (event: ChatChunk["event"]) => Promise<void>;
	emitTerminal: (
		event: Extract<
			ChatChunk["event"],
			{ type: "turn_completed" | "turn_interrupted" }
		>
	) => Promise<void>;
};

export function createTurnEmitters(
	context: RtcContext,
	threadId: string,
	turnId: string
): TurnEmitters {
	const messageBuffers = new Map<string, string>();
	const thoughtBuffers = new Map<string, string>();

	function publishChunk(chunk: ChatChunk): void {
		context.eventBus.publish(chunk);
	}

	async function applySessionTitleUpdate(
		event: ChatChunk["event"]
	): Promise<boolean> {
		if (
			event.type !== "session_update" ||
			event.sessionUpdate !== "session_info_update"
		) {
			return false;
		}
		const raw = event.raw as { title?: string | null } | undefined;
		if (typeof raw?.title === "string" && raw.title.trim()) {
			await applyAgentThreadTitle(threadId, raw.title);
		}
		return true;
	}

	async function emit(event: ChatChunk["event"]): Promise<void> {
		if (await applySessionTitleUpdate(event)) return;

		trackDelta(event, messageBuffers, thoughtBuffers);

		if (isStreamingDelta(event))
			return publishChunk({ threadId, turnId, seq: 0, event });

		const persistEvent = resolvePersistEvent(
			event,
			messageBuffers,
			thoughtBuffers
		);
		const entry = await appendConversation(threadId, {
			threadId,
			turnId,
			event: persistEvent,
		});
		if (entry.isErr()) throwOrpc(entry.error);
		if (persistEvent.type === "user_message") {
			const locked = await setAgentLocked(threadId);
			if (locked.isErr()) throwOrpc(locked.error);
		}
		publishChunk(entry.value.chunk);
	}

	async function emitTerminal(
		event: Extract<
			ChatChunk["event"],
			{ type: "turn_completed" | "turn_interrupted" }
		>
	): Promise<void> {
		trackDelta(event, messageBuffers, thoughtBuffers);

		const persistEvent = resolvePersistEvent(
			event,
			messageBuffers,
			thoughtBuffers
		);
		const entry = await appendConversation(threadId, {
			threadId,
			turnId,
			event: persistEvent,
		});

		if (entry.isOk()) {
			publishChunk(entry.value.chunk);
			if (event.type === "turn_completed") {
				await maybeApplyAutoThreadTitle(threadId, turnId);
			}
			return;
		}

		log.error({
			kind: "terminal_event_persist",
			error: entry.error,
			threadId,
			turnId,
			event: event.type,
		});
		publishChunk({ threadId, turnId, seq: 0, event });
	}

	return { emit, emitTerminal };
}

export function launchTurn(options: {
	agentName: string;
	threadId: string;
	projectId: string;
	turnId: string;
	message: ChatMessage;
	context: RtcContext;
	runtime: WorkerRuntime;
}): void {
	const { emit, emitTerminal } = createTurnEmitters(
		options.context,
		options.threadId,
		options.turnId
	);

	options.context.eventBus.ensureWatch(
		options.context.peerId,
		options.threadId
	);

	runTurn({
		agentName: options.agentName,
		threadId: options.threadId,
		projectId: options.projectId,
		turnId: options.turnId,
		message: options.message,
		emit,
		emitTerminal,
		runtime: options.runtime,
	})
		.then((result) => {
			result.tapError((error) => {
				log.error({
					kind: "chat_turn_failed",
					error,
					threadId: options.threadId,
					turnId: options.turnId,
				});
			});
		})
		.catch((error) => {
			log.error({
				kind: "chat_turn_failed",
				error,
				threadId: options.threadId,
				turnId: options.turnId,
			});
		});
}
