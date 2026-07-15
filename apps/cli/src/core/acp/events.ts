import type {
	RuntimePermissionRequest,
	RuntimeSessionEvent,
} from "@acp-kit/core";
import type {
	SessionNotification,
	SessionUpdate,
	ToolCallUpdate,
} from "@agentclientprotocol/sdk";
import { ToolCallStatusSchema } from "@cyrus/schemas/enums/tools";
import {
	type AgentEvent,
	AgentEventSchema,
	ApprovalRequestEventSchema,
	MessageCompletedEventSchema,
	PlanEventSchema,
	PlanRemovedEventSchema,
	PlanUpdateEventSchema,
	ReasoningCompletedEventSchema,
	ThoughtEventSchema,
	TokenEventSchema,
	ToolCallEventSchema,
	ToolCallUpdateEventSchema,
} from "@cyrus/schemas/rtc/chat";
import { enrichDiffContent } from "@/utils/diff";

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
		case "message.completed":
			return [
				MessageCompletedEventSchema.parse({
					type: "message_completed",
					text: event.content,
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
		case "reasoning.completed":
			return [
				ReasoningCompletedEventSchema.parse({
					type: "reasoning_completed",
					text: event.content,
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
					content: enrichDiffContent(event.content),
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
					content: enrichDiffContent(event.content),
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
					content: enrichDiffContent(event.content),
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
	request: RuntimePermissionRequest
): AgentEvent {
	const rawToolCall = request.raw.toolCall as ToolCallUpdate & { id?: string };
	const fields = mapToolCallUpdateFields(rawToolCall);
	const toolCallId =
		request.toolCallId ||
		fields.toolCallId ||
		rawToolCall.toolCallId ||
		rawToolCall.id ||
		"unknown-tool-call";

	return ApprovalRequestEventSchema.parse({
		type: "approval_request",
		request: {
			sessionId: request.sessionId,
			toolCall: {
				...fields,
				toolCallId,
				title:
					request.title ||
					fields.title ||
					rawToolCall.title ||
					"Permission required",
			},
			options: (request.options ?? []).map((option) => ({
				optionId: option.optionId ?? option.kind ?? "deny",
				name: option.name ?? option.optionId ?? option.kind ?? "Option",
				kind: option.kind ?? "reject_once",
			})),
		},
	});
}

function mapToolCall(
	update: Extract<SessionUpdate, { sessionUpdate: "tool_call" }>
): AgentEvent {
	const { sessionUpdate: _, _meta, content, ...fields } = update;
	return ToolCallEventSchema.parse({
		type: "tool_call",
		...fields,
		content: enrichDiffContent(content),
	});
}

function mapToolCallUpdate(
	update: Extract<SessionUpdate, { sessionUpdate: "tool_call_update" }>
): AgentEvent {
	const { sessionUpdate: _, _meta, content, ...fields } = update;
	return ToolCallUpdateEventSchema.parse({
		type: "tool_call_update",
		...fields,
		content: enrichDiffContent(content),
	});
}

function mapToolCallUpdateFields(update: ToolCallUpdate) {
	const { _meta: _, ...fields } = update;
	return fields;
}
