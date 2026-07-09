import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import type { ChatChunk } from "@cyrus/schemas/rtc/chat";
import type { GetConversationsOutput } from "@cyrus/schemas/rtc/threads";
import type { QueryClient } from "@tanstack/react-query";

let syntheticEntrySeq = 0;

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
