import { useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { Result } from "better-result";
import { useEffect } from "react";
import type { ControllerConnection } from "@/lib/orpc";
import { appendChunkToCache } from "@/utils/conversation-cache";

export function useWorkerConversationSync(): void {
	const queryClient = useQueryClient();
	const { workerConnection } = useRouteContext({ strict: false }) as {
		workerConnection?: ControllerConnection;
	};

	useEffect(() => {
		if (!workerConnection) return;
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
			// expected when the connection is closed (navigation, unmount)
			// while subscribe() is mid-pull — only surface genuine failures
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
