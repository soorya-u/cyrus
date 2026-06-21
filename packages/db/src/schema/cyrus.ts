import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const device = pgTable(
	"device",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		publicKey: text("public_key").notNull(),
		name: text("name").notNull(),
		lastSeen: timestamp("last_seen").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("device_user_idx").on(table.userId)]
);

export const deviceRelations = relations(device, ({ one, many }) => ({
	user: one(user, {
		fields: [device.userId],
		references: [user.id],
	}),
	workers: many(worker),
}));

export const worker = pgTable(
	"worker",
	{
		id: text("id").primaryKey(),
		deviceId: text("device_id")
			.notNull()
			.references(() => device.id, { onDelete: "cascade" }),
		hostname: text("hostname").notNull(),
		capabilities: jsonb("capabilities").$type<{
			agents: { name: string; models: string[] }[];
		}>(),
		lastSeen: timestamp("last_seen").defaultNow().notNull(),
		online: text("online").default("false").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("worker_device_idx").on(table.deviceId)]
);

export const workerRelations = relations(worker, ({ one, many }) => ({
	device: one(device, {
		fields: [worker.deviceId],
		references: [device.id],
	}),
	ownedThreads: many(thread),
}));

export const thread = pgTable(
	"thread",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		ownerWorkerId: text("owner_worker_id").references(() => worker.id, {
			onDelete: "set null",
		}),
		agent: text("agent").notNull(),
		model: text("model").notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("thread_user_idx").on(table.userId),
		index("thread_owner_idx").on(table.ownerWorkerId),
	]
);

export const threadRelations = relations(thread, ({ one }) => ({
	user: one(user, {
		fields: [thread.userId],
		references: [user.id],
	}),
	ownerWorker: one(worker, {
		fields: [thread.ownerWorkerId],
		references: [worker.id],
	}),
}));
