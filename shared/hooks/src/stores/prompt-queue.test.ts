import { describe, expect, test } from "bun:test";
import { usePromptQueueStore } from "./prompt-queue";

const textMessage = (text: string) => [{ type: "text" as const, text }];

describe("prompt-queue store", () => {
	test("enqueues and dequeues per thread", () => {
		usePromptQueueStore.setState({ queueByThread: {} });

		usePromptQueueStore.getState().enqueue("thread-1", textMessage("first"));
		usePromptQueueStore.getState().enqueue("thread-1", textMessage("second"));

		expect(usePromptQueueStore.getState().dequeue("thread-1")?.message).toEqual(
			textMessage("first")
		);
		expect(usePromptQueueStore.getState().dequeue("thread-1")?.message).toEqual(
			textMessage("second")
		);
		expect(usePromptQueueStore.getState().dequeue("thread-1")).toBeUndefined();
	});

	test("drains the next message after a turn completes", () => {
		usePromptQueueStore.setState({ queueByThread: {} });

		usePromptQueueStore.getState().enqueue("thread-1", textMessage("queued"));
		expect(
			usePromptQueueStore.getState().queueByThread["thread-1"]
		).toHaveLength(1);

		const next = usePromptQueueStore.getState().dequeue("thread-1");
		expect(next?.message).toEqual(textMessage("queued"));
		expect(
			usePromptQueueStore.getState().queueByThread["thread-1"] ?? []
		).toHaveLength(0);
	});
});
