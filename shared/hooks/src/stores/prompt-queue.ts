import type { ChatMessage } from "@cyrus/schemas/rtc/chat";
import { randomId } from "@cyrus/utils/identity";
import { create } from "zustand";

export type QueuedPrompt = {
	id: string;
	message: ChatMessage;
};

type PromptQueueState = {
	queueByThread: Record<string, QueuedPrompt[]>;
	enqueue: (threadId: string, message: ChatMessage) => QueuedPrompt;
	peek: (threadId: string) => QueuedPrompt | undefined;
	dequeue: (threadId: string) => QueuedPrompt | undefined;
	remove: (threadId: string, id: string) => void;
	update: (threadId: string, id: string, message: ChatMessage) => void;
	clear: (threadId: string) => void;
};

export const usePromptQueueStore = create<PromptQueueState>((set, get) => ({
	queueByThread: {},
	enqueue: (threadId, message) => {
		const item = { id: randomId(), message };
		set((state) => ({
			queueByThread: {
				...state.queueByThread,
				[threadId]: [...(state.queueByThread[threadId] ?? []), item],
			},
		}));
		return item;
	},
	peek: (threadId) => get().queueByThread[threadId]?.[0],
	dequeue: (threadId) => {
		const queue = get().queueByThread[threadId] ?? [];
		const [next, ...rest] = queue;
		if (!next) return;
		set((state) => ({
			queueByThread: {
				...state.queueByThread,
				[threadId]: rest,
			},
		}));
		return next;
	},
	remove: (threadId, id) =>
		set((state) => ({
			queueByThread: {
				...state.queueByThread,
				[threadId]: (state.queueByThread[threadId] ?? []).filter(
					(item) => item.id !== id
				),
			},
		})),
	update: (threadId, id, message) =>
		set((state) => ({
			queueByThread: {
				...state.queueByThread,
				[threadId]: (state.queueByThread[threadId] ?? []).map((item) =>
					item.id === id ? { ...item, message } : item
				),
			},
		})),
	clear: (threadId) =>
		set((state) => {
			const { [threadId]: _removed, ...queueByThread } = state.queueByThread;
			return { queueByThread };
		}),
}));
