import { describe, expect, test } from "bun:test";
import {
	appendConversation,
	getConversations,
} from "@cyrus/database/repositories/conversations";
import {
	createProject,
	listProjects,
} from "@cyrus/database/repositories/projects";
import {
	createThread,
	ensureThread,
	listThreads,
	renameThread,
	threadNameFromPrompt,
} from "@cyrus/database/repositories/threads";
import { withTempDatabase } from "../helpers/turso";

describe("database repositories", () => {
	test("creates and lists projects", async () => {
		await withTempDatabase(async () => {
			const created = await createProject("Cyrus", "/tmp/cyrus");
			expect(created.isOk()).toBe(true);
			if (!created.isOk()) return;

			const listed = await listProjects();
			expect(listed.isOk()).toBe(true);
			if (!listed.isOk()) return;

			expect(listed.value).toEqual([
				expect.objectContaining({
					id: created.value.id,
					name: "Cyrus",
					cwd: "/tmp/cyrus",
				}),
			]);
		});
	});

	test("creates threads and derives names from first message", async () => {
		await withTempDatabase(async () => {
			const project = await createProject("Repo");
			expect(project.isOk()).toBe(true);
			if (!project.isOk()) return;

			const thread = await ensureThread("thread-1", project.value.id, {
				agentName: "claude",
				firstMessage: "Fix the failing tests",
			});
			expect(thread.isOk()).toBe(true);
			if (!thread.isOk()) return;

			expect(thread.value.name).toBe("Fix the failing tests");
			expect(threadNameFromPrompt("  hello  ")).toBe("hello");
		});
	});

	test("renames threads and persists conversation entries", async () => {
		await withTempDatabase(async () => {
			const project = await createProject("Repo");
			expect(project.isOk()).toBe(true);
			if (!project.isOk()) return;

			const thread = await createThread(project.value.id);
			expect(thread.isOk()).toBe(true);
			if (!thread.isOk()) return;

			const renamed = await renameThread(thread.value.id, "Renamed");
			expect(renamed.isOk()).toBe(true);
			if (!renamed.isOk()) return;
			expect(renamed.value.name).toBe("Renamed");

			const appended = await appendConversation(thread.value.id, {
				threadId: thread.value.id,
				turnId: "turn-1",
				event: { type: "user_message", content: "hello" },
			});
			expect(appended.isOk()).toBe(true);
			if (!appended.isOk()) return;

			const conversations = await getConversations(thread.value.id);
			expect(conversations.isOk()).toBe(true);
			if (!conversations.isOk()) return;

			expect(conversations.value).toHaveLength(1);
			expect(conversations.value[0]?.chunk.event).toEqual({
				type: "user_message",
				content: "hello",
			});

			const listed = await listThreads(project.value.id);
			expect(listed.isOk()).toBe(true);
			if (!listed.isOk()) return;
			expect(listed.value).toHaveLength(1);
		});
	});
});
