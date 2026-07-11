import type { AgentEvent } from "@cyrus/schemas/rtc/chat";

export type MockPromptOptions = {
	message?: string;
	messageId?: string;
	failAfterToken?: boolean;
};

export function* createMockPromptStream(
	options: MockPromptOptions = {}
): Generator<AgentEvent> {
	const messageId = options.messageId ?? "mock-message-1";
	yield {
		type: "token",
		text: options.message ?? "mock response",
		messageId,
	};
	if (options.failAfterToken) {
		throw new Error("mock runtime failed");
	}
	yield {
		type: "message_completed",
		text: options.message ?? "mock response",
		messageId,
	};
}
