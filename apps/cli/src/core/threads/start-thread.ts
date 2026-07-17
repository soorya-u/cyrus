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
import { createGitWorktree, removeGitWorktree } from "@/git/worktree";
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
): Promise<Result<void, CoordinatorError>> {
	const userMessage = await appendConversation(threadId, {
		threadId,
		turnId,
		event: {
			type: "user_message",
			content: formatPromptBlocks(message),
			blocks: message,
		},
	});
	if (userMessage.isErr()) {
		return Result.err(coordinatorRepositoryError(userMessage.error));
	}

	const threadError = await appendConversation(threadId, {
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
	if (threadError.isErr()) {
		return Result.err(coordinatorRepositoryError(threadError.error));
	}

	const interrupted = await appendConversation(threadId, {
		threadId,
		turnId,
		event: { type: "turn_interrupted" },
	});
	if (interrupted.isErr()) {
		return Result.err(coordinatorRepositoryError(interrupted.error));
	}

	return Result.ok(undefined);
}

async function failAfterRow(
	threadId: string,
	turnId: string,
	message: ChatMessage,
	error: unknown
): Promise<Result<StartThreadResult, CoordinatorError>> {
	const persisted = await persistFailure(threadId, turnId, message, error);
	if (persisted.isErr()) return Result.err(persisted.error);
	return Result.ok({ threadId, turnId, bound: null });
}

async function applyBranchOrWorktree(
	threadId: string,
	projectId: string,
	branch: string | undefined,
	worktree: boolean | undefined,
	worktreePath: string | undefined
): Promise<Result<void, CoordinatorError>> {
	const wantsWorktree = Boolean(worktree || worktreePath);
	if (wantsWorktree && !branch) {
		return Result.err(coordinatorRuntimeError("worktree requires a branch"));
	}
	if (!branch) return Result.ok(undefined);

	const projectCwd = await resolveProjectCwd(projectId);
	if (projectCwd.isErr()) {
		return Result.err(coordinatorRepositoryError(projectCwd.error));
	}

	if (wantsWorktree) {
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
			await removeGitWorktree(projectCwd.value, created.value);
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
		if (setResult.isErr()) {
			// Some agents advertise catalog options but do not implement the
			// matching ACP setter (e.g. session/set_model → Method not found).
			// Skip that preference so first-send can still bind and prompt.
			const message = coordinatorErrorMessage(setResult.error);
			if (message.includes("Method not found")) continue;
			return Result.err(setResult.error);
		}
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

	// Persist branch only; worktree path is written after successful creation.
	const created = await createThread(input.projectId, {
		branch: input.branch,
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
		return failAfterRow(threadId, turnId, input.message, git.error);
	}

	const cwd = await host.resolveCwd(threadId);
	if (cwd.isErr()) {
		return failAfterRow(threadId, turnId, input.message, cwd.error);
	}

	const runtime = host.getAgent(input.agentName);
	const session = await host.withRuntime(() =>
		runtime.createBoundSession(threadId, input.projectId, cwd.value)
	);
	if (session.isErr()) {
		return failAfterRow(threadId, turnId, input.message, session.error);
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
		return failAfterRow(threadId, turnId, input.message, prefs.error);
	}

	const persisted = await bindThreadAgent(threadId, input.projectId, {
		agentName: input.agentName,
		sessionId: session.value.sessionId,
	});
	if (persisted.isErr()) {
		return failAfterRow(threadId, turnId, input.message, persisted.error);
	}

	const locked = await setAgentLocked(threadId);
	if (locked.isErr()) {
		return failAfterRow(threadId, turnId, input.message, locked.error);
	}

	return Result.ok({ threadId, turnId, bound });
}
