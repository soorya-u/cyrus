import { appendConversation } from "@cyrus/database/repositories/conversations";
import { resolveProjectCwd } from "@cyrus/database/repositories/projects";
import {
	bindThreadAgent,
	createThread,
	setAgentLocked,
	updateThreadWorktreePath,
} from "@cyrus/database/repositories/threads";
import {
	type CoordinatorError,
	coordinatorRepositoryError,
	coordinatorRuntimeError,
} from "@cyrus/errors/coordinator";
import type { ChatMessage } from "@cyrus/schemas/rtc/chat";
import { formatPromptBlocks } from "@cyrus/schemas/rtc/chat";
import { randomId } from "@cyrus/utils/identity";
import { Result } from "better-result";
import { tryCheckoutGitRef } from "@/git/checkout";
import { createGitWorktree } from "@/git/worktree";
import {
	coordinatorErrorCode,
	coordinatorErrorMessage,
} from "@/utils/thread-errors";
import type { BoundThread, CoordinatorHost } from "./types";

export type StartThreadPreferences = {
	modelId?: string;
	modeId?: string;
	effortId?: string;
	personaId?: string;
};

export type StartThreadInput = {
	projectId: string;
	agentName: string;
	message: ChatMessage;
	preferences?: StartThreadPreferences;
	branch?: string;
	/** When true with a branch, create a worktree instead of checking out in-place. */
	worktree?: boolean;
	worktreePath?: string;
	turnId?: string;
};

export type StartThreadResult = {
	threadId: string;
	turnId: string;
	/** Bound and ready to prompt; null if setup failed after the row was created. */
	bound: BoundThread | null;
};

async function persistFailure(
	threadId: string,
	turnId: string,
	message: ChatMessage,
	error: unknown
): Promise<void> {
	const userMessage = await appendConversation(threadId, {
		threadId,
		turnId,
		event: {
			type: "user_message",
			content: formatPromptBlocks(message),
			blocks: message,
		},
	});
	if (userMessage.isErr()) return;

	await appendConversation(threadId, {
		threadId,
		turnId,
		event: {
			type: "thread_error",
			message: coordinatorErrorMessage(error),
			...(coordinatorErrorCode(error)
				? { code: coordinatorErrorCode(error) }
				: {}),
		},
	});
	await appendConversation(threadId, {
		threadId,
		turnId,
		event: { type: "turn_interrupted" },
	});
}

async function applyBranchOrWorktree(
	threadId: string,
	projectId: string,
	branch: string | undefined,
	worktree: boolean | undefined,
	worktreePath: string | undefined
): Promise<Result<void, CoordinatorError>> {
	if (!branch) return Result.ok(undefined);

	const projectCwd = await resolveProjectCwd(projectId);
	if (projectCwd.isErr()) {
		return Result.err(coordinatorRepositoryError(projectCwd.error));
	}

	if (worktree || worktreePath) {
		const created = await createGitWorktree(
			projectCwd.value,
			branch,
			worktreePath
		);
		if (created.isErr()) {
			return Result.err(coordinatorRuntimeError(created.error.message));
		}
		const updated = await updateThreadWorktreePath(threadId, created.value);
		if (updated.isErr()) {
			return Result.err(coordinatorRepositoryError(updated.error));
		}
		return Result.ok(undefined);
	}

	const checkedOut = await tryCheckoutGitRef(projectCwd.value, branch);
	if (checkedOut.isErr()) {
		return Result.err(coordinatorRuntimeError(checkedOut.error.message));
	}
	return Result.ok(undefined);
}

async function applyPreferences(
	host: CoordinatorHost,
	bound: BoundThread,
	preferences: StartThreadPreferences | undefined
): Promise<Result<void, CoordinatorError>> {
	if (!preferences) return Result.ok(undefined);

	const runtime = host.getAgent(bound.agentName);
	const fields: Array<{
		field: "model" | "mode" | "effort" | "persona";
		value: string;
	}> = [];
	if (preferences.modelId)
		fields.push({ field: "model", value: preferences.modelId });
	if (preferences.modeId)
		fields.push({ field: "mode", value: preferences.modeId });
	if (preferences.effortId)
		fields.push({ field: "effort", value: preferences.effortId });
	if (preferences.personaId)
		fields.push({ field: "persona", value: preferences.personaId });

	for (const { field, value } of fields) {
		const setResult = await host.withRuntime(() =>
			runtime.setCatalogField(
				field,
				bound.threadId,
				bound.projectId,
				bound.cwd,
				bound.sessionId,
				value
			)
		);
		if (setResult.isErr()) return Result.err(setResult.error);
	}
	return Result.ok(undefined);
}

/**
 * Compound first-message operation: row → git → session → prefs → binding.
 * On failure after the row exists, persists the user message and a thread_error
 * entry and returns `bound: null` so the controller can navigate and retry.
 */
export async function startThread(
	host: CoordinatorHost,
	input: StartThreadInput
): Promise<Result<StartThreadResult, CoordinatorError>> {
	const turnId = input.turnId ?? randomId();

	const created = await createThread(input.projectId, {
		branch: input.branch,
		worktreePath: input.worktreePath,
	});
	if (created.isErr()) {
		return Result.err(coordinatorRepositoryError(created.error));
	}
	const threadId = created.value.id;

	const git = await applyBranchOrWorktree(
		threadId,
		input.projectId,
		input.branch,
		input.worktree,
		input.worktreePath
	);
	if (git.isErr()) {
		await persistFailure(threadId, turnId, input.message, git.error);
		return Result.ok({ threadId, turnId, bound: null });
	}

	const cwd = await host.resolveCwd(threadId);
	if (cwd.isErr()) {
		await persistFailure(threadId, turnId, input.message, cwd.error);
		return Result.ok({ threadId, turnId, bound: null });
	}

	const runtime = host.getAgent(input.agentName);
	const session = await host.withRuntime(() =>
		runtime.createBoundSession(threadId, input.projectId, cwd.value)
	);
	if (session.isErr()) {
		await persistFailure(threadId, turnId, input.message, session.error);
		return Result.ok({ threadId, turnId, bound: null });
	}

	const bound: BoundThread = {
		threadId,
		projectId: input.projectId,
		agentName: input.agentName,
		sessionId: session.value.sessionId,
		cwd: cwd.value,
	};

	const prefs = await applyPreferences(host, bound, input.preferences);
	if (prefs.isErr()) {
		await persistFailure(threadId, turnId, input.message, prefs.error);
		return Result.ok({ threadId, turnId, bound: null });
	}

	const persisted = await bindThreadAgent(threadId, input.projectId, {
		agentName: input.agentName,
		sessionId: session.value.sessionId,
	});
	if (persisted.isErr()) {
		await persistFailure(threadId, turnId, input.message, persisted.error);
		return Result.ok({ threadId, turnId, bound: null });
	}

	const locked = await setAgentLocked(threadId);
	if (locked.isErr()) {
		await persistFailure(threadId, turnId, input.message, locked.error);
		return Result.ok({ threadId, turnId, bound: null });
	}

	return Result.ok({ threadId, turnId, bound });
}
