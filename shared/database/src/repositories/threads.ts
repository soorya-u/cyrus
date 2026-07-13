import type { Thread } from "@cyrus/schemas/rtc/threads";
import { ThreadSchema } from "@cyrus/schemas/rtc/threads";
import { randomId } from "@cyrus/utils/identity";
import { nowISO } from "@cyrus/utils/time";
import { Result } from "better-result";
import { and, desc, eq } from "drizzle-orm";
import { connection } from "../connection";
import { threads } from "../models/threads";
import type { RepositoryError } from "../utils/error";
import { notFound, tryRepo } from "../utils/error";
import { getProject } from "./projects";

export function threadNameFromPrompt(message: string): string {
	const trimmed = message.trim();
	if (!trimmed) return "New thread";
	return trimmed.slice(0, 50);
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

	return tryRepo(async () => {
		const [existing] = await connection.db
			.select()
			.from(threads)
			.where(and(eq(threads.id, id), eq(threads.projectId, projectId)))
			.limit(1);

		if (existing) {
			const name =
				options?.firstMessage && existing.name === "New thread"
					? threadNameFromPrompt(options.firstMessage)
					: existing.name;
			const updatedAt = nowISO();
			const agentName = options?.agentName ?? existing.agentName ?? undefined;
			await connection.db
				.update(threads)
				.set({
					name,
					agentName: agentName ?? null,
					updatedAt,
				})
				.where(and(eq(threads.id, id), eq(threads.projectId, projectId)));
			return parseThreadRow({
				...existing,
				name,
				agentName: agentName ?? null,
				updatedAt,
			});
		}

		const createdAt = nowISO();
		const thread = ThreadSchema.parse({
			id,
			projectId,
			name: options?.firstMessage
				? threadNameFromPrompt(options.firstMessage)
				: (options?.branch ?? "New thread"),
			agentName: options?.agentName,
			branch: options?.branch ?? null,
			worktreePath: options?.worktreePath ?? null,
			createdAt,
			updatedAt: createdAt,
		});
		await connection.db.insert(threads).values({
			id: thread.id,
			projectId: thread.projectId,
			name: thread.name,
			agentName: thread.agentName ?? null,
			sessionId: null,
			agentLocked: 0,
			branch: thread.branch ?? null,
			worktreePath: thread.worktreePath ?? null,
			createdAt: thread.createdAt,
			updatedAt: thread.updatedAt,
		});
		return thread;
	});
}

export function createThread(
	projectId: string,
	options?: Pick<ThreadCreateOptions, "branch" | "worktreePath">
): Promise<Result<Thread, RepositoryError>> {
	return ensureThread(randomId(), projectId, options);
}

export function listThreads(
	projectId: string
): Promise<Result<Thread[], RepositoryError>> {
	return tryRepo(async () => {
		const rows = await connection.db
			.select()
			.from(threads)
			.where(eq(threads.projectId, projectId))
			.orderBy(desc(threads.updatedAt));
		return rows.map((row) => parseThreadRow(row));
	});
}

export function deleteThread(
	threadId: string
): Promise<Result<boolean, RepositoryError>> {
	return tryRepo(async () => {
		const deleted = await connection.db
			.delete(threads)
			.where(eq(threads.id, threadId))
			.returning({ id: threads.id });
		return deleted.length > 0;
	});
}

export function deleteThreadsForProject(
	projectId: string
): Promise<Result<void, RepositoryError>> {
	return tryRepo(async () => {
		await connection.db.delete(threads).where(eq(threads.projectId, projectId));
	});
}

export async function renameThread(
	threadId: string,
	name: string
): Promise<Result<Thread, RepositoryError>> {
	const thread = await getThread(threadId);
	if (thread.isErr()) return Result.err(thread.error);
	if (!thread.value) return Result.err(notFound("thread", threadId));

	const current = thread.value;

	return tryRepo(async () => {
		const updatedAt = nowISO();
		await connection.db
			.update(threads)
			.set({ name, updatedAt })
			.where(eq(threads.id, threadId));
		return ThreadSchema.parse({ ...current, name, updatedAt });
	});
}

export async function updateThreadWorktreePath(
	threadId: string,
	worktreePath: string | null
): Promise<Result<Thread, RepositoryError>> {
	const thread = await getThread(threadId);
	if (thread.isErr()) return Result.err(thread.error);
	if (!thread.value) return Result.err(notFound("thread", threadId));

	return tryRepo(async () => {
		const updatedAt = nowISO();
		await connection.db
			.update(threads)
			.set({ worktreePath, updatedAt })
			.where(eq(threads.id, threadId));
		return ThreadSchema.parse({ ...thread.value, worktreePath, updatedAt });
	});
}

export function getThread(
	threadId: string
): Promise<Result<Thread | undefined, RepositoryError>> {
	return tryRepo(async () => {
		const [row] = await connection.db
			.select()
			.from(threads)
			.where(eq(threads.id, threadId))
			.limit(1);
		return row ? parseThreadRow(row) : undefined;
	});
}

export function getThreadSession(
	threadId: string
): Promise<
	Result<{ sessionId: string; agentName: string } | undefined, RepositoryError>
> {
	return tryRepo(async () => {
		const [row] = await connection.db
			.select({
				sessionId: threads.sessionId,
				agentName: threads.agentName,
			})
			.from(threads)
			.where(eq(threads.id, threadId))
			.limit(1);
		if (!(row?.sessionId && row.agentName)) return;
		return { sessionId: row.sessionId, agentName: row.agentName };
	});
}

export async function bindThreadAgent(
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

	return tryRepo(async () => {
		const updatedAt = nowISO();
		await connection.db
			.update(threads)
			.set({
				agentName: data.agentName,
				sessionId: data.sessionId,
				updatedAt,
			})
			.where(and(eq(threads.id, threadId), eq(threads.projectId, projectId)));

		return ThreadSchema.parse({
			...thread.value,
			agentName: data.agentName,
			sessionId: data.sessionId,
			updatedAt,
		});
	});
}

export async function setAgentLocked(
	threadId: string
): Promise<Result<Thread, RepositoryError>> {
	const thread = await getThread(threadId);
	if (thread.isErr()) return Result.err(thread.error);
	if (!thread.value) return Result.err(notFound("thread", threadId));
	if (thread.value.agentLocked) return Result.ok(thread.value);

	return tryRepo(async () => {
		const updatedAt = nowISO();
		await connection.db
			.update(threads)
			.set({ agentLocked: 1, updatedAt })
			.where(eq(threads.id, threadId));

		return ThreadSchema.parse({
			...thread.value,
			agentLocked: true,
			updatedAt,
		});
	});
}
