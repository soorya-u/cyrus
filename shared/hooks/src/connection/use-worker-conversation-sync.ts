import { appendChunkToCache } from "@cyrus/utils/conversation-cache";
import { useQueryClient } from "@tanstack/react-query";
import { Result } from "better-result";
import { useEffect } from "react";
import { useRtc } from "../contexts/rtc";

export function useWorkerConversationSync(): void {
	const queryClient = useQueryClient();
	const { connection: workerConnection } = useRtc();

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
				appendChunkToCache(queryClient, chunk);
			}
		}).then((result) => {
			if (result.isErr() && !stopped) {
				console.error("worker conversation sync failed", result.error);
			}
		});

		return () => {
			stopped = true;
			iterator?.return?.(undefined);
		};
	}, [workerConnection, queryClient]);
}
