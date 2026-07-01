import type {
	RequestPermissionRequest,
	RequestPermissionResponse,
	SessionNotification,
	SessionUpdate,
} from "@agentclientprotocol/sdk";

export type AgentEvent =
	| { type: "token"; text: string; messageId?: string | null }
	| { type: "thought"; text: string; messageId?: string | null }
	| {
			type: "tool_call";
			toolCallId: string;
			title: string;
			status?: string;
			kind?: string;
	  }
	| {
			type: "tool_call_update";
			toolCallId: string;
			status?: string;
			title?: string;
	  }
	| { type: "plan"; entries: unknown }
	| { type: "plan_update"; update: unknown }
	| { type: "plan_removed" }
	| { type: "approval_request"; request: RequestPermissionRequest }
	| { type: "session_update"; update: SessionUpdate };

export function mapSessionUpdate(update: SessionUpdate): AgentEvent[] {
	switch (update.sessionUpdate) {
		case "agent_message_chunk":
			return update.content.type === "text"
				? [
						{
							type: "token",
							text: update.content.text,
							messageId: update.messageId,
						},
					]
				: [];
		case "agent_thought_chunk":
			return update.content.type === "text"
				? [
						{
							type: "thought",
							text: update.content.text,
							messageId: update.messageId,
						},
					]
				: [];
		case "tool_call":
			return [
				{
					type: "tool_call",
					toolCallId: update.toolCallId,
					title: update.title,
					status: update.status,
					...(update.kind ? { kind: update.kind } : {}),
				},
			];
		case "tool_call_update":
			return [
				{
					type: "tool_call_update",
					toolCallId: update.toolCallId,
					...(update.status ? { status: update.status } : {}),
					...(update.title ? { title: update.title } : {}),
				},
			];
		case "plan":
			return [{ type: "plan", entries: update.entries }];
		case "plan_update":
			return [{ type: "plan_update", update }];
		case "plan_removed":
			return [{ type: "plan_removed" }];
		default:
			return [{ type: "session_update", update }];
	}
}

export function mapSessionNotification(
	notification: SessionNotification
): AgentEvent[] {
	return mapSessionUpdate(notification.update);
}

export function approvalRequestEvent(
	request: RequestPermissionRequest
): AgentEvent {
	return { type: "approval_request", request };
}

export type PermissionHandler = (
	request: RequestPermissionRequest
) => Promise<RequestPermissionResponse>;
