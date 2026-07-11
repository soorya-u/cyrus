import { describe, expect, test } from "bun:test";
import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { appendOptimisticUserMessage } from "@cyrus/utils/conversations/cache";
import { QueryClient } from "@tanstack/react-query";

describe("controller thread cache integration", () => {
	test("appends an optimistic user message to the conversations cache", () => {
		const queryClient = new QueryClient();
		const threadId = "thread-1";
		const turnId = "turn-1";

		appendOptimisticUserMessage(queryClient, threadId, turnId, "hello");

		const cached = queryClient.getQueryData<{
			conversations: Array<{
				chunk: { event: { type: string; content: string } };
			}>;
		}>(RTC_OPERATION_KEYS.getConversations(threadId));

		expect(cached?.conversations).toHaveLength(1);
		expect(cached?.conversations[0]?.chunk.event).toEqual({
			type: "user_message",
			content: "hello",
		});
	});
});
