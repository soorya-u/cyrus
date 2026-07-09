import type { ChatChunk } from "@cyrus/schemas/rtc/chat";
import { ConversationEntrySchema } from "@cyrus/schemas/rtc/threads";
import { randomId } from "@cyrus/utils/identity";
import { nowISO } from "@cyrus/utils/time";
import { and, asc, eq, gt } from "drizzle-orm";
import { connection } from "../connection";
import { conversations } from "../models/conversations";
import { threads } from "../models/threads";
import type { RepositoryError } from "../utils/error";
import { tryRepo } from "../utils/error";

function parseConversationEntry(row: typeof conversations.$inferSelect) {
	const { chunk, ...rest } = row;
	return ConversationEntrySchema.parse({
		...rest,
		chunk: { ...JSON.parse(chunk), seq: row.seq },
	});
}

export function appendConversation(
	threadId: string,
	chunk: Omit<ChatChunk, "seq">
) {
	return tryRepo(async () => {
		const id = randomId();
		const createdAt = nowISO();
		const [row] = await connection.db
			.insert(conversations)
			.values({
				id,
				threadId,
				chunk: JSON.stringify(chunk),
				createdAt,
			})
			.returning();
		if (!row) {
			throw {
				type: "persist_failed",
				message: `failed to persist conversation entry for thread ${threadId}`,
			} satisfies RepositoryError;
		}

		await connection.db
			.update(threads)
			.set({ updatedAt: createdAt })
			.where(eq(threads.id, threadId));

		return parseConversationEntry(row);
	});
}

export function getConversations(threadId: string, afterSeq?: number) {
	return tryRepo(async () => {
		const where =
			afterSeq === undefined
				? eq(conversations.threadId, threadId)
				: and(
						eq(conversations.threadId, threadId),
						gt(conversations.seq, afterSeq)
					);
		const rows = await connection.db
			.select()
			.from(conversations)
			.where(where)
			.orderBy(asc(conversations.seq));
		return rows.map(parseConversationEntry);
	});
}
