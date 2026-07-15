import {
	PermissionDecision,
	type RuntimeHost,
	type RuntimePermissionRequest,
} from "@acp-kit/core";
import type { AgentEvent } from "@cyrus/schemas/rtc/chat";
import { mapApprovalRequest } from "./events";

export type TurnBinding = {
	threadId: string;
	turnId: string;
	sessionId: string;
	pushEvent: (event: AgentEvent) => void;
};

type PermissionOption = {
	optionId: string;
	kind: string;
};

type PendingPermission = {
	threadId: string;
	turnId: string;
	sessionId: string;
	toolCallId: string;
	options: PermissionOption[];
	resolve: (decision: PermissionDecision) => void;
};

type PendingElicitation = {
	threadId: string;
	turnId: string;
	sessionId: string;
	elicitationId: string;
	resolve: (result: {
		action: "accept" | "decline" | "cancel";
		content?: Record<string, unknown>;
	}) => void;
};

export class InteractivePendingRegistry {
	private readonly turnsBySession = new Map<string, TurnBinding>();
	private readonly permissions = new Map<string, PendingPermission>();
	private readonly elicitations = new Map<string, PendingElicitation>();

	bindTurn(binding: TurnBinding): () => void {
		this.turnsBySession.set(binding.sessionId, binding);
		return () => {
			const current = this.turnsBySession.get(binding.sessionId);
			if (current === binding) this.turnsBySession.delete(binding.sessionId);
		};
	}

	requestPermission(
		request: RuntimePermissionRequest
	): Promise<PermissionDecision> {
		const binding = this.turnsBySession.get(request.sessionId);
		if (!binding) return Promise.resolve(PermissionDecision.Deny);

		const toolCallId = request.toolCallId || "unknown-tool-call";
		const key = permissionKey(request.sessionId, toolCallId);

		const existing = this.permissions.get(key);
		if (existing) return Promise.resolve(PermissionDecision.Deny);

		const options = (request.options ?? []).map((option) => ({
			optionId: option.optionId ?? option.kind ?? "deny",
			kind: option.kind ?? option.optionId ?? "reject_once",
		}));

		const event = mapApprovalRequest(request);
		binding.pushEvent(event);

		return new Promise<PermissionDecision>((resolve) => {
			this.permissions.set(key, {
				threadId: binding.threadId,
				turnId: binding.turnId,
				sessionId: request.sessionId,
				toolCallId,
				options,
				resolve,
			});
		});
	}

	respondApproval(input: {
		threadId: string;
		toolCallId: string;
		optionId: string;
	}): { turnId: string } | null {
		const pending = [...this.permissions.values()].find(
			(entry) =>
				entry.threadId === input.threadId &&
				entry.toolCallId === input.toolCallId
		);
		if (!pending) return null;

		const decision = decisionFromOption(input.optionId, pending.options);
		this.permissions.delete(
			permissionKey(pending.sessionId, pending.toolCallId)
		);
		pending.resolve(decision);
		return { turnId: pending.turnId };
	}

	respondElicitation(input: {
		threadId: string;
		elicitationId: string;
		action: "accept" | "decline" | "cancel";
		content?: Record<string, unknown>;
	}): { turnId: string } | null {
		const pending = [...this.elicitations.values()].find(
			(entry) =>
				entry.threadId === input.threadId &&
				entry.elicitationId === input.elicitationId
		);
		if (!pending) return null;

		this.elicitations.delete(
			elicitationKey(pending.sessionId, pending.elicitationId)
		);
		pending.resolve({
			action: input.action,
			content: input.content,
		});
		return { turnId: pending.turnId };
	}

	clearThread(threadId: string): void {
		for (const [key, pending] of this.permissions) {
			if (pending.threadId !== threadId) continue;
			this.permissions.delete(key);
			pending.resolve(PermissionDecision.Deny);
		}
		for (const [key, pending] of this.elicitations) {
			if (pending.threadId !== threadId) continue;
			this.elicitations.delete(key);
			pending.resolve({ action: "decline" });
		}
	}

	/** Park an elicitation wait (for when acp-kit exposes a host hook). */
	awaitElicitation(input: {
		sessionId: string;
		elicitationId: string;
		event: AgentEvent;
	}): Promise<{
		action: "accept" | "decline" | "cancel";
		content?: Record<string, unknown>;
	}> {
		const binding = this.turnsBySession.get(input.sessionId);
		if (!binding) {
			return Promise.resolve({ action: "cancel" as const });
		}

		const key = elicitationKey(input.sessionId, input.elicitationId);
		const existing = this.elicitations.get(key);
		if (existing) return Promise.resolve({ action: "decline" as const });

		binding.pushEvent(input.event);

		return new Promise((resolve) => {
			this.elicitations.set(key, {
				threadId: binding.threadId,
				turnId: binding.turnId,
				sessionId: input.sessionId,
				elicitationId: input.elicitationId,
				resolve,
			});
		});
	}
}

export const interactivePending = new InteractivePendingRegistry();

export function createInteractiveHost(
	onAgentExit?: RuntimeHost["onAgentExit"]
): RuntimeHost {
	return {
		requestPermission: (request) =>
			interactivePending.requestPermission(request),
		onAgentExit,
	};
}

function permissionKey(sessionId: string, toolCallId: string): string {
	return `${sessionId}:${toolCallId}`;
}

function elicitationKey(sessionId: string, elicitationId: string): string {
	return `${sessionId}:elicit:${elicitationId}`;
}

function decisionFromOption(
	optionId: string,
	options: PermissionOption[]
): PermissionDecision {
	const option = options.find((entry) => entry.optionId === optionId);
	const token = `${option?.kind ?? ""} ${optionId}`.toLowerCase();

	if (
		token.includes("allow_always") ||
		(token.includes("always") && !token.includes("reject"))
	) {
		return PermissionDecision.AllowAlways;
	}
	if (token.includes("reject") || token.includes("deny")) {
		return PermissionDecision.Deny;
	}
	return PermissionDecision.AllowOnce;
}
