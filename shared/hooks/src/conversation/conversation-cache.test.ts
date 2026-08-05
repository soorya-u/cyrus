import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { waitForTurnEnd } from "@cyrus/utils/conversations/turn-waiters";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, test } from "vitest";
import {
	appendOptimisticUserMessage,
	appendTurnTerminal,
} from "./conversation-cache";

describe("conversation cache", () => {
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

	test("appendTurnTerminal resolves a pending waitForTurnEnd without a separate settle call", async () => {
		const queryClient = new QueryClient();
		const threadId = "thread-2";
		const turnId = "turn-2";

		const waiting = waitForTurnEnd(threadId, turnId);
		appendTurnTerminal(queryClient, threadId, turnId, "turn_interrupted");

		const result = await waiting;
		expect(result.isErr()).toBe(true);
	});
});
