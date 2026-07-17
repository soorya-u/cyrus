import type { RepositoryError } from "@cyrus/errors/repository";
import { notFound, persistFailed } from "@cyrus/errors/repository";
import type { Thread, TitleSource } from "@cyrus/schemas/rtc/threads";
import { ThreadSchema } from "@cyrus/schemas/rtc/threads";
import { randomId } from "@cyrus/utils/identity";
import { nowISO } from "@cyrus/utils/time";
import { Result } from "better-result";
import { and, desc, eq, isNull, ne, or } from "drizzle-orm";
import { connection } from "../connection";
import { threads } from "../models/threads";
import { repoArgs } from "../utils/repo";
import { getProject } from "./projects";

export const DEFAULT_THREAD_NAME = "New thread";

export function threadNameFromPrompt(message: string): string {
	const trimmed = message.trim();
	if (!trimmed) return DEFAULT_THREAD_NAME;
	return Array.from(trimmed).slice(0, 50).join("");
}

export function generateThreadTitle(
	userMessage: string,
	_assistantMessage?: string
): string {
	return threadNameFromPrompt(userMessage);
}

function canApplyAutoTitle(thread: Thread): boolean {
	return thread.titleSource !== "user" && thread.name === DEFAULT_THREAD_NAME;
}

function canApplyAgentTitle(thread: Thread): boolean {
	return thread.titleSource !== "user";
}

type ThreadCreateOptions = {
	agentName?: string;
	firstMessage?: string;
	branch?: string;
	worktreePath?: string;
};

function parseThreadRow(row: typeof threads.$inferSelect): Thread {
	return ThreadSchema.parse(row);
}

const upsertThread = repoArgs(
	async (
		id: string,
		projectId: string,
		options?: ThreadCreateOptions
	): Promise<Thread> => {
		const [existing] = await connection.db
			.select()
			.from(threads)
			.where(and(eq(threads.id, id), eq(threads.projectId, projectId)))
			.limit(1);

		if (existing) {
			const updatedAt = nowISO();
			const agentName = options?.agentName ?? existing.agentName ?? undefined;
			await connection.db
				.update(threads)
				.set({
					agentName: agentName ?? null,
					updatedAt,
				})
				.where(and(eq(threads.id, id), eq(threads.projectId, projectId)));
			return parseThreadRow({
				...existing,
				agentName: agentName ?? null,
				updatedAt,
			});
		}

		const createdAt = nowISO();
		const thread = ThreadSchema.parse({
			id,
			projectId,
			name: options?.branch ?? DEFAULT_THREAD_NAME,
			agentName: options?.agentName,
			titleSource: null,
			branch: options?.branch ?? null,
			worktreePath: options?.worktreePath ?? null,
			createdAt,
			updatedAt: createdAt,
		});
		await connection.db.insert(threads).values({
			id: thread.id,
			projectId: thread.projectId,
			name: thread.name,
			titleSource: null,
			agentName: thread.agentName ?? null,
			sessionId: null,
			agentLocked: 0,
			branch: thread.branch ?? null,
			worktreePath: thread.worktreePath ?? null,
			createdAt: thread.createdAt,
			updatedAt: thread.updatedAt,
		});
		return thread;
	}
);

export async function ensureThread(
	id: string,
	projectId: string,
	options?: ThreadCreateOptions
): Promise<Result<Thread, RepositoryError>> {
	const project = await getProject(projectId);
	if (project.isErr()) return Result.err(project.error);
	if (!project.value) {
		return Result.err(notFound("project", projectId));
	}

	return upsertThread(id, projectId, options);
}

export const createThread = (
	projectId: string,
	options?: Pick<ThreadCreateOptions, "branch" | "worktreePath">
) => ensureThread(randomId(), projectId, options);

export const listThreads = repoArgs(async (projectId: string) => {
	const rows = await connection.db
		.select()
		.from(threads)
		.where(eq(threads.projectId, projectId))
		.orderBy(desc(threads.updatedAt));
	return rows.map((row) => parseThreadRow(row));
});

export const deleteThread = repoArgs(async (threadId: string) => {
	const deleted = await connection.db
		.delete(threads)
		.where(eq(threads.id, threadId))
		.returning({ id: threads.id });
	return deleted.length > 0;
});

export const deleteThreadsForProject = repoArgs(async (projectId: string) => {
	await connection.db.delete(threads).where(eq(threads.projectId, projectId));
});

export const getThread = repoArgs(async (threadId: string) => {
	const [row] = await connection.db
		.select()
		.from(threads)
		.where(eq(threads.id, threadId))
		.limit(1);
	return row ? parseThreadRow(row) : undefined;
});

const writeThreadName = repoArgs(
	async (
		threadId: string,
		name: string,
		current: Thread,
		titleSource: TitleSource,
		options?: { preserveUserTitle?: boolean }
	) => {
		const updatedAt = nowISO();
		const conditions = [eq(threads.id, threadId)];
		if (options?.preserveUserTitle) {
			const titleGuard = or(
				isNull(threads.titleSource),
				ne(threads.titleSource, "user")
			);
			if (titleGuard) conditions.push(titleGuard);
		}

		const updated = await connection.db
			.update(threads)
			.set({ name, titleSource, updatedAt })
			.where(and(...conditions))
			.returning();

		if (updated.length === 0) {
			const latest = await getThread(threadId);
			if (latest.isErr()) throw latest.error;
			if (!latest.value) throw notFound("thread", threadId);
			return latest.value;
		}

		return ThreadSchema.parse({ ...current, name, titleSource, updatedAt });
	}
);

export async function renameThread(
	threadId: string,
	name: string
): Promise<Result<Thread, RepositoryError>> {
	const thread = await getThread(threadId);
	if (thread.isErr()) return Result.err(thread.error);
	if (!thread.value) return Result.err(notFound("thread", threadId));

	return writeThreadName(threadId, name, thread.value, "user");
}

export async function applyAutoThreadTitle(
	threadId: string,
	userMessage: string,
	assistantMessage?: string
): Promise<Result<Thread | undefined, RepositoryError>> {
	const thread = await getThread(threadId);
	if (thread.isErr()) return Result.err(thread.error);
	if (!thread.value) return Result.err(notFound("thread", threadId));
	if (!canApplyAutoTitle(thread.value)) return Result.ok(undefined);

	const title = generateThreadTitle(userMessage, assistantMessage);
	return writeThreadName(threadId, title, thread.value, "auto", {
		preserveUserTitle: true,
	});
}

export async function applyAgentThreadTitle(
	threadId: string,
	title: string
): Promise<Result<Thread | undefined, RepositoryError>> {
	const trimmed = title.trim();
	if (!trimmed) return Result.ok(undefined);

	const thread = await getThread(threadId);
	if (thread.isErr()) return Result.err(thread.error);
	if (!thread.value) return Result.err(notFound("thread", threadId));
	if (!canApplyAgentTitle(thread.value)) return Result.ok(undefined);

	return writeThreadName(
		threadId,
		Array.from(trimmed).slice(0, 50).join(""),
		thread.value,
		"agent",
		{ preserveUserTitle: true }
	);
}

const writeThreadWorktreePath = repoArgs(
	async (threadId: string, worktreePath: string | null, current: Thread) => {
		const updatedAt = nowISO();
		await connection.db
			.update(threads)
			.set({ worktreePath, updatedAt })
			.where(eq(threads.id, threadId));
		return ThreadSchema.parse({ ...current, worktreePath, updatedAt });
	}
);

export async function updateThreadWorktreePath(
	threadId: string,
	worktreePath: string | null
): Promise<Result<Thread, RepositoryError>> {
	const thread = await getThread(threadId);
	if (thread.isErr()) return Result.err(thread.error);
	if (!thread.value) return Result.err(notFound("thread", threadId));

	return writeThreadWorktreePath(threadId, worktreePath, thread.value);
}

const writeBoundLockedAgent = repoArgs(
	async (
		threadId: string,
		projectId: string,
		data: { agentName: string; sessionId: string }
	) => {
		const updatedAt = nowISO();
		const updated = await connection.db
			.update(threads)
			.set({
				agentName: data.agentName,
				sessionId: data.sessionId,
				agentLocked: 1,
				updatedAt,
			})
			.where(
				and(
					eq(threads.id, threadId),
					eq(threads.projectId, projectId),
					or(eq(threads.agentLocked, 0), eq(threads.agentName, data.agentName))
				)
			)
			.returning();

		if (updated.length === 0) {
			throw persistFailed("thread agent claim failed");
		}

		const [row] = updated;
		if (!row) {
			throw persistFailed("thread agent claim failed");
		}

		return parseThreadRow(row);
	}
);

/** Persist session id and lock agent ownership in one write. */
export async function bindAndLockThreadAgent(
	threadId: string,
	projectId: string,
	data: { agentName: string; sessionId: string }
): Promise<Result<Thread, RepositoryError>> {
	const thread = await getThread(threadId);
	if (thread.isErr()) return Result.err(thread.error);
	if (!thread.value) return Result.err(notFound("thread", threadId));
	if (thread.value.projectId !== projectId) {
		return Result.err(notFound("thread", threadId));
	}
	if (thread.value.agentLocked && thread.value.agentName !== data.agentName) {
		return Result.err(
			persistFailed("thread agent is locked to a different agent")
		);
	}

	return writeBoundLockedAgent(threadId, projectId, data);
}

const writeLockedAgent = repoArgs(
	async (threadId: string, projectId: string, agentName: string) => {
		const updatedAt = nowISO();
		const updated = await connection.db
			.update(threads)
			.set({
				agentName,
				agentLocked: 1,
				updatedAt,
			})
			.where(
				and(
					eq(threads.id, threadId),
					eq(threads.projectId, projectId),
					or(eq(threads.agentLocked, 0), eq(threads.agentName, agentName))
				)
			)
			.returning();

		if (updated.length === 0) {
			throw persistFailed("thread agent claim failed");
		}

		const [row] = updated;
		if (!row) {
			throw persistFailed("thread agent claim failed");
		}

		return parseThreadRow(row);
	}
);

/** Lock the thread's agent without a session id (e.g. mid-flight start failure). */
export async function lockThreadAgent(
	threadId: string,
	projectId: string,
	agentName: string
): Promise<Result<Thread, RepositoryError>> {
	const thread = await getThread(threadId);
	if (thread.isErr()) return Result.err(thread.error);
	if (!thread.value) return Result.err(notFound("thread", threadId));
	if (thread.value.projectId !== projectId) {
		return Result.err(notFound("thread", threadId));
	}
	if (thread.value.agentLocked && thread.value.agentName === agentName) {
		return Result.ok(thread.value);
	}
	if (thread.value.agentLocked && thread.value.agentName !== agentName) {
		return Result.err(
			persistFailed("thread agent is locked to a different agent")
		);
	}

	return writeLockedAgent(threadId, projectId, agentName);
}

const lockThreadAgentFlag = repoArgs(
	async (threadId: string, current: Thread) => {
		const updatedAt = nowISO();
		await connection.db
			.update(threads)
			.set({ agentLocked: 1, updatedAt })
			.where(eq(threads.id, threadId));

		return ThreadSchema.parse({
			...current,
			agentLocked: true,
			updatedAt,
		});
	}
);

export async function setAgentLocked(
	threadId: string
): Promise<Result<Thread, RepositoryError>> {
	const thread = await getThread(threadId);
	if (thread.isErr()) return Result.err(thread.error);
	if (!thread.value) return Result.err(notFound("thread", threadId));
	if (thread.value.agentLocked) return Result.ok(thread.value);

	return lockThreadAgentFlag(threadId, thread.value);
}
