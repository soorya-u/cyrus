import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import type { ChatChunk } from "@cyrus/schemas/rtc/chat";
import { useQueryClient } from "@tanstack/react-query";
import { Result } from "better-result";
import { log } from "evlog";
import { useEffect, useEffectEvent } from "react";
import { useRtc } from "../contexts/rtc";
import { useConversationOverlay } from "../stores/conversation-overlay";

function isTerminalChunk(chunk: ChatChunk): boolean {
	return (
		chunk.event.type === "turn_completed" ||
		chunk.event.type === "turn_interrupted"
	);
}

export function useWorkerConversationSync(): void {
	const queryClient = useQueryClient();
	const { connection: workerConnection } = useRtc();
	const applyLiveChunk = useConversationOverlay(
		(state) => state.applyLiveChunk
	);

	const onChunk = useEffectEvent((chunk: ChatChunk) => {
		applyLiveChunk(chunk);
		if (isTerminalChunk(chunk))
			queryClient.invalidateQueries({
				queryKey: RTC_OPERATION_KEYS.getConversations(chunk.threadId),
			});
	});

	const onSyncError = useEffectEvent((error: unknown) => {
		log.error({ kind: "worker_conversation_sync", error });
	});

	useEffect(() => {
		let stopped = false;
		let iterator: Awaited<ReturnType<typeof workerConnection.client.subscribe>>;

		Result.tryPromise(async () => {
			iterator = await workerConnection.client.subscribe();
			if (stopped) {
				await iterator.return?.(undefined);
				return;
			}
			for await (const chunk of iterator) {
				if (stopped) break;
				onChunk(chunk);
			}
		}).then((result) => {
			if (result.isErr() && !stopped) onSyncError(result.error);
		});

		return () => {
			stopped = true;
			iterator?.return?.(undefined);
		};
	}, [workerConnection]);
}
