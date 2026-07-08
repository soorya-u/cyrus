import type { ChatChunk } from "@cyrus/connections/schemas/rtc/chat";
import type { GetConversationsOutput } from "@cyrus/connections/schemas/rtc/threads";
import type { QueryClient } from "@tanstack/react-query";
import { RTC_OPERATION_KEYS } from "@/constants/operation-keys";

let syntheticEntrySeq = 0;

// appends a live chunk (from this device's own chat() call, or another
// device's broadcast via subscribe()) into the shared getConversations
// cache entry for its thread, so every mounted useThreadConversation
// instance for that thread reflects it immediately
export function appendChunkToCache(queryClient: QueryClient, chunk: ChatChunk) {
	queryClient.setQueryData<GetConversationsOutput>(
		RTC_OPERATION_KEYS.getConversations(chunk.threadId),
		(old) => ({
			conversations: [
				...(old?.conversations ?? []),
				{
					chunk,
					createdAt: new Date().toISOString(),
					id: `local-${chunk.turnId}-${++syntheticEntrySeq}`,
					seq: chunk.seq,
					threadId: chunk.threadId,
				},
			],
		})
	);
}
