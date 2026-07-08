import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { projects } from "./projects";

export const threads = sqliteTable("threads", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	agentName: text("agent_name"),
	createdAt: text("created_at").notNull(),
	updatedAt: text("updated_at").notNull(),
});
