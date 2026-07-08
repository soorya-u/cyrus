import type { Thread } from "@cyrus/connections/schemas/rtc/threads";
import { ThreadSchema } from "@cyrus/connections/schemas/rtc/threads";
import { randomId } from "@cyrus/utils/identity";
import { nowISO } from "@cyrus/utils/time";
import { Result } from "better-result";
import { desc, eq } from "drizzle-orm";
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

export async function ensureThread(
	id: string,
	projectId: string,
	options?: { agentName?: string; firstMessage?: string }
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
			.where(eq(threads.id, id))
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
				.where(eq(threads.id, id));
			return ThreadSchema.parse({
				id,
				projectId,
				name,
				agentName,
				createdAt: existing.createdAt,
				updatedAt,
			});
		}

		const createdAt = nowISO();
		const thread = ThreadSchema.parse({
			id,
			projectId,
			name: options?.firstMessage
				? threadNameFromPrompt(options.firstMessage)
				: "New thread",
			agentName: options?.agentName,
			createdAt,
			updatedAt: createdAt,
		});
		await connection.db.insert(threads).values({
			id: thread.id,
			projectId: thread.projectId,
			name: thread.name,
			agentName: thread.agentName ?? null,
			createdAt: thread.createdAt,
			updatedAt: thread.updatedAt,
		});
		return thread;
	});
}

export function createThread(
	projectId: string
): Promise<Result<Thread, RepositoryError>> {
	return ensureThread(randomId(), projectId);
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
		return rows.map((row) => ThreadSchema.parse(row));
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

export function getThread(
	threadId: string
): Promise<Result<Thread | undefined, RepositoryError>> {
	return tryRepo(async () => {
		const [row] = await connection.db
			.select()
			.from(threads)
			.where(eq(threads.id, threadId))
			.limit(1);
		return row ? ThreadSchema.parse(row) : undefined;
	});
}
