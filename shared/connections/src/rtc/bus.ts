import type { ChatChunk } from "@cyrus/schemas/rtc/chat";

export type ThreadEventBus = {
	publish(chunk: ChatChunk): void;
	watch(peerId: string, threadId: string): void;
	unwatch(peerId: string, threadId: string): void;
	ensureWatch(peerId: string, threadId: string): void;
	isWatching(peerId: string, threadId: string): boolean;
	getActiveTurnIdsForThread(threadId: string): string[];
	subscribe(peerId: string): AsyncGenerator<ChatChunk>;
	close(peerId: string): void;
	closeAll(): void;
};
