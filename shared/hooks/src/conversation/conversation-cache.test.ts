import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { waitForTurnEnd } from "@cyrus/utils/conversations/turn-waiters";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, test } from "vitest";
import {
	appendOptimisticUserMessage,
	appendTurnTerminal,
	applyChunkToCache,
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

	test("groups shell execution lines by shellExecutionId (no turnId) and prunes them once the run ends", async () => {
		const queryClient = new QueryClient();
		const threadId = "thread-3";
		const shellExecutionId = "shell-1";

		applyChunkToCache(queryClient, {
			threadId,
			shellExecutionId,
			seq: 10,
			event: { type: "shell_execution_start", command: "ls" },
		});
		applyChunkToCache(queryClient, {
			threadId,
			shellExecutionId,
			seq: 0,
			sub: 1,
			event: {
				type: "shell_execution_line",
				lines: [{ stream: "stdout", text: "a.txt" }],
			},
		});
		applyChunkToCache(queryClient, {
			threadId,
			shellExecutionId,
			seq: 0,
			sub: 2,
			event: {
				type: "shell_execution_line",
				lines: [{ stream: "stdout", text: "b.txt" }],
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 200));

		type CachedEntry = {
			sub?: number;
			chunk: { event: { type: string; lines?: unknown[] } };
		};
		const getConversations = () =>
			queryClient.getQueryData<{ conversations: CachedEntry[] }>(
				RTC_OPERATION_KEYS.getConversations(threadId)
			)?.conversations ?? [];

		const midway = getConversations();
		expect(midway).toHaveLength(2);
		const mergedLineEntry = midway.find(
			(entry) => entry.chunk.event.type === "shell_execution_line"
		);
		expect(mergedLineEntry?.chunk.event.lines).toEqual([
			{ stream: "stdout", text: "a.txt" },
			{ stream: "stdout", text: "b.txt" },
		]);

		applyChunkToCache(queryClient, {
			threadId,
			shellExecutionId,
			seq: 11,
			event: {
				type: "shell_execution_end",
				status: "exited",
				exitCode: 0,
				lines: [
					{ stream: "stdout", text: "a.txt" },
					{ stream: "stdout", text: "b.txt" },
				],
			},
		});

		const final = getConversations();

		expect(final).toHaveLength(2);
		expect(final.every((entry) => entry.sub === undefined)).toBe(true);
	});
});
