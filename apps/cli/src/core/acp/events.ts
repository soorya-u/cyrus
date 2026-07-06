import type { RuntimeSessionEvent } from "@acp-kit/core";
import type {
	RequestPermissionRequest,
	SessionNotification,
	SessionUpdate,
	ToolCallUpdate,
} from "@agentclientprotocol/sdk";
import {
	type AgentEvent,
	AgentEventSchema,
	ApprovalRequestEventSchema,
	PlanEventSchema,
	PlanRemovedEventSchema,
	PlanUpdateEventSchema,
	ThoughtEventSchema,
	TokenEventSchema,
	ToolCallEventSchema,
	ToolCallStatusSchema,
	ToolCallUpdateEventSchema,
} from "@cyrus/connections/schemas/rtc/chat";

export function mapRuntimeSessionEvent(
	event: RuntimeSessionEvent
): AgentEvent[] {
	switch (event.type) {
		case "message.delta":
			return [
				TokenEventSchema.parse({
					type: "token",
					text: event.delta,
					messageId: event.messageId,
				}),
			];
		case "reasoning.delta":
			return [
				ThoughtEventSchema.parse({
					type: "thought",
					text: event.delta,
					messageId: event.reasoningId,
				}),
			];
		case "tool.start":
			return [
				ToolCallEventSchema.parse({
					type: "tool_call",
					toolCallId: event.toolCallId,
					title: event.title ?? event.name,
					kind: event.kind,
					status: mapToolStatus(event.status),
					content: event.content,
					rawInput: event.input,
				}),
			];
		case "tool.update":
			return [
				ToolCallUpdateEventSchema.parse({
					type: "tool_call_update",
					toolCallId: event.toolCallId,
					title: event.title,
					status: mapToolStatus(event.status),
					content: event.content,
					rawOutput: event.output,
				}),
			];
		case "tool.end":
			return [
				ToolCallUpdateEventSchema.parse({
					type: "tool_call_update",
					toolCallId: event.toolCallId,
					title: event.title,
					status: mapToolStatus(event.status),
					content: event.content,
					rawOutput: event.output,
				}),
			];
		case "session.plan.updated":
			return [
				PlanEventSchema.parse({
					type: "plan",
					entries: event.entries,
				}),
			];
		case "session.error":
			return [
				AgentEventSchema.parse({
					type: "session_update",
					sessionUpdate: "session.error",
					raw: event,
				}),
			];
		default:
			return [
				AgentEventSchema.parse({
					type: "session_update",
					sessionUpdate: event.type,
					raw: event,
				}),
			];
	}
}

function mapToolStatus(
	status: string
): (typeof ToolCallStatusSchema.options)[number] | undefined {
	if (status === "running") return "in_progress";
	if (ToolCallStatusSchema.safeParse(status).success) {
		return status as (typeof ToolCallStatusSchema.options)[number];
	}
	return;
}

export function mapSessionUpdate(update: SessionUpdate): AgentEvent[] {
	switch (update.sessionUpdate) {
		case "agent_message_chunk":
			return update.content.type === "text"
				? [
						TokenEventSchema.parse({
							type: "token",
							text: update.content.text,
							messageId: update.messageId,
						}),
					]
				: [];
		case "agent_thought_chunk":
			return update.content.type === "text"
				? [
						ThoughtEventSchema.parse({
							type: "thought",
							text: update.content.text,
							messageId: update.messageId,
						}),
					]
				: [];
		case "tool_call":
			return [mapToolCall(update)];
		case "tool_call_update":
			return [mapToolCallUpdate(update)];
		case "plan":
			return [
				PlanEventSchema.parse({
					type: "plan",
					entries: update.entries,
				}),
			];
		case "plan_update":
			return [
				PlanUpdateEventSchema.parse({
					type: "plan_update",
					plan: update.plan,
				}),
			];
		case "plan_removed":
			return [
				PlanRemovedEventSchema.parse({
					type: "plan_removed",
					id: update.id,
				}),
			];
		default:
			return [
				AgentEventSchema.parse({
					type: "session_update",
					sessionUpdate: update.sessionUpdate,
					raw: update,
				}),
			];
	}
}

export function mapSessionNotification(
	notification: SessionNotification
): AgentEvent[] {
	return mapSessionUpdate(notification.update);
}

export function mapApprovalRequest(
	request: RequestPermissionRequest
): AgentEvent {
	return ApprovalRequestEventSchema.parse({
		type: "approval_request",
		request: {
			sessionId: request.sessionId,
			toolCall: mapToolCallUpdateFields(request.toolCall),
			options: request.options.map((option) => ({
				optionId: option.optionId,
				name: option.name,
				kind: option.kind,
			})),
		},
	});
}

function mapToolCall(
	update: Extract<SessionUpdate, { sessionUpdate: "tool_call" }>
): AgentEvent {
	const { sessionUpdate: _, _meta, ...fields } = update;
	return ToolCallEventSchema.parse({ type: "tool_call", ...fields });
}

function mapToolCallUpdate(
	update: Extract<SessionUpdate, { sessionUpdate: "tool_call_update" }>
): AgentEvent {
	const { sessionUpdate: _, _meta, ...fields } = update;
	return ToolCallUpdateEventSchema.parse({
		type: "tool_call_update",
		...fields,
	});
}

function mapToolCallUpdateFields(update: ToolCallUpdate) {
	const { _meta: _, ...fields } = update;
	return fields;
}
