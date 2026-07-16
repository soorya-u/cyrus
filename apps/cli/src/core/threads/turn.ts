import { getThread } from "@cyrus/database/repositories/threads";
import {
	type CoordinatorError,
	coordinatorAgentMismatch,
} from "@cyrus/errors/coordinator";
import type { AgentEvent, ChatMessage } from "@cyrus/schemas/rtc/chat";
import { Result } from "better-result";
import { interactivePending } from "@/core/acp/interactive";
import type { CoordinatorHost } from "./types";

export async function prompt(
	host: CoordinatorHost,
	agentName: string,
	threadId: string,
	projectId: string,
	content: ChatMessage,
	turnId: string
): Promise<Result<AsyncGenerator<AgentEvent>, CoordinatorError>> {
	const bound = await host.resolveBoundThread(threadId, projectId);
	if (bound.isErr()) return Result.err(bound.error);
	if (bound.value.agentName !== agentName) {
		return Result.err(
			coordinatorAgentMismatch(bound.value.agentName, agentName)
		);
	}
	return Result.ok(
		host
			.getAgent(agentName)
			.prompt(
				threadId,
				projectId,
				bound.value.cwd,
				bound.value.sessionId,
				content,
				turnId
			)
	);
}

export async function cancel(
	host: CoordinatorHost,
	agentName: string,
	threadId: string
): Promise<void> {
	interactivePending.clearThread(threadId);
	await host.getAgent(agentName).cancel(threadId);
}

export async function closeAnyThreadSession(
	host: CoordinatorHost,
	threadId: string
): Promise<void> {
	const live = host.findLiveBinding(threadId);
	if (live) {
		await host.getAgent(live.agentName).closeSession(live.sessionId, threadId);
		return;
	}

	const thread = await getThread(threadId);
	if (thread.isErr() || !thread.value) return;
	if (!(thread.value.sessionId && thread.value.agentName)) return;
	await host
		.getAgent(thread.value.agentName)
		.closeSession(thread.value.sessionId, threadId);
}
