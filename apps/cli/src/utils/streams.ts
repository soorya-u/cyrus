import type { AgentEvent } from "@cyrus/connections/schemas/rtc/chat";

export function isStreamingDelta(event: AgentEvent): boolean {
	return event.type === "token" || event.type === "thought";
}

export function trackDelta(
	event: AgentEvent,
	messageBuffers: Map<string, string>,
	thoughtBuffers: Map<string, string>
): void {
	if (event.type !== "token" && event.type !== "thought") return;
	if (!event.messageId) return;

	const buffer = {
		token: messageBuffers,
		thought: thoughtBuffers,
	}[event.type];

	buffer.set(event.messageId, (buffer.get(event.messageId) ?? "") + event.text);
}

export function resolvePersistEvent(
	event: AgentEvent,
	messageBuffers: Map<string, string>,
	thoughtBuffers: Map<string, string>
): AgentEvent {
	if (
		event.type !== "message_completed" &&
		event.type !== "reasoning_completed"
	)
		return event;

	const buffer = {
		message_completed: messageBuffers,
		reasoning_completed: thoughtBuffers,
	}[event.type];

	const messageId = event.messageId ?? "default";
	const text = buffer.get(messageId) ?? event.text;
	buffer.delete(messageId);
	return { ...event, text };
}
