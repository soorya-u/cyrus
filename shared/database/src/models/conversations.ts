import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { threads } from "./threads";

export const conversations = sqliteTable(
	"conversations",
	{
		seq: integer("seq").primaryKey({ autoIncrement: true }),
		id: text("id").notNull(),
		threadId: text("thread_id")
			.notNull()
			.references(() => threads.id, { onDelete: "cascade" }),
		chunk: text("chunk").notNull(),
		createdAt: text("created_at").notNull(),
	},
	(table) => [
		index("idx_conversations_thread_seq").on(table.threadId, table.seq),
	]
);
