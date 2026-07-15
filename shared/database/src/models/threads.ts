import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { projects } from "./projects";

export const threads = sqliteTable("threads", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	titleSource: text("title_source"),
	agentName: text("agent_name"),
	sessionId: text("session_id"),
	agentLocked: integer("agent_locked").notNull().default(0),
	branch: text("branch"),
	worktreePath: text("worktree_path"),
	createdAt: text("created_at").notNull(),
	updatedAt: text("updated_at").notNull(),
});
