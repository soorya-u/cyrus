import type { ChatMessage } from "@cyrus/schemas/rtc/chat";
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const EMPTY_DRAFT: ChatMessage = [];

type ComposerDraftState = {
	draftsByThread: Record<string, ChatMessage>;
	setDraft: (threadId: string, message: ChatMessage) => void;
	clearDraft: (threadId: string) => void;
};

function sameDraft(left: ChatMessage | undefined, right: ChatMessage): boolean {
	if (!left) return right.length === 0;
	if (left.length !== right.length) return false;
	return left.every((block, index) => {
		const other = right[index];
		if (!other || block.type !== other.type) return false;
		if (block.type === "text" && other.type === "text") {
			return block.text === other.text;
		}
		if (block.type === "resource" && other.type === "resource") {
			return block.uri === other.uri && block.name === other.name;
		}
		return false;
	});
}

export const useComposerDraftStore = create<ComposerDraftState>()(
	persist(
		(set) => ({
			draftsByThread: {},
			setDraft: (threadId, message) =>
				set((state) => {
					if (sameDraft(state.draftsByThread[threadId], message)) {
						return state;
					}
					if (message.length === 0) {
						if (!(threadId in state.draftsByThread)) return state;
						const { [threadId]: _removed, ...draftsByThread } =
							state.draftsByThread;
						return { draftsByThread };
					}
					return {
						draftsByThread: {
							...state.draftsByThread,
							[threadId]: message,
						},
					};
				}),
			clearDraft: (threadId) =>
				set((state) => {
					if (!(threadId in state.draftsByThread)) return state;
					const { [threadId]: _removed, ...draftsByThread } =
						state.draftsByThread;
					return { draftsByThread };
				}),
		}),
		{
			name: "cyrus-composer-drafts",
			partialize: (state) => ({ draftsByThread: state.draftsByThread }),
			version: 1,
			migrate: (persisted) => {
				const state = persisted as {
					draftsByThread?: Record<string, unknown>;
				};
				const draftsByThread: Record<string, ChatMessage> = {};
				for (const [threadId, value] of Object.entries(
					state.draftsByThread ?? {}
				)) {
					if (typeof value === "string") {
						const text = value.trim();
						if (text) draftsByThread[threadId] = [{ type: "text", text }];
						continue;
					}
					if (Array.isArray(value) && value.length > 0) {
						draftsByThread[threadId] = value as ChatMessage;
					}
				}
				return { draftsByThread };
			},
		}
	)
);

export function useComposerDraft(threadId: string): {
	value: ChatMessage;
	setValue: (message: ChatMessage) => void;
	clear: () => void;
} {
	const value = useComposerDraftStore(
		(state) => state.draftsByThread[threadId] ?? EMPTY_DRAFT
	);
	const setDraft = useComposerDraftStore((state) => state.setDraft);
	const clearDraft = useComposerDraftStore((state) => state.clearDraft);

	return {
		value,
		setValue: (message) => setDraft(threadId, message),
		clear: () => clearDraft(threadId),
	};
}

/** True once localStorage drafts have been rehydrated into the store. */
export function useComposerDraftHydrated(): boolean {
	return useSyncExternalStore(
		(onStoreChange) =>
			useComposerDraftStore.persist.onFinishHydration(onStoreChange),
		() => useComposerDraftStore.persist.hasHydrated(),
		() => false
	);
}
