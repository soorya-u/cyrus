import {
	appendConversation,
	getConversations,
} from "@cyrus/database/repositories/conversations";
import {
	createProject,
	listProjects,
} from "@cyrus/database/repositories/projects";
import {
	applyAutoThreadTitle,
	createThread,
	ensureThread,
	getThread,
	listThreads,
	renameThread,
	threadNameFromPrompt,
} from "@cyrus/database/repositories/threads";
import { describe, expect, test } from "vitest";
import { withTempDatabase } from "../helpers/turso";

describe("database repositories", () => {
	test("creates and lists projects", async () => {
		await withTempDatabase(async () => {
			const created = await createProject("Cyrus");
			expect(created.isOk()).toBe(true);
			if (!created.isOk()) return;

			const listed = await listProjects();
			expect(listed.isOk()).toBe(true);
			if (!listed.isOk()) return;

			expect(listed.value).toEqual([
				expect.objectContaining({
					id: created.value.id,
					name: "Cyrus",
					cwd: "",
				}),
			]);
		});
	});

	test("creates threads without renaming from first message before turn completion", async () => {
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

			expect(thread.value.name).toBe("New thread");
			expect(threadNameFromPrompt("  hello  ")).toBe("hello");
		});
	});

	test("auto-title replaces default name and preserves manual renames", async () => {
		await withTempDatabase(async () => {
			const project = await createProject("Repo");
			expect(project.isOk()).toBe(true);
			if (!project.isOk()) return;

			const thread = await createThread(project.value.id);
			expect(thread.isOk()).toBe(true);
			if (!thread.isOk()) return;

			const renamed = await renameThread(thread.value.id, "Manual title");
			expect(renamed.isOk()).toBe(true);
			if (!renamed.isOk()) return;

			const preserved = await applyAutoThreadTitle(
				thread.value.id,
				"First user message",
				"Assistant summary sentence."
			);
			expect(preserved.isOk()).toBe(true);
			if (!preserved.isOk()) return;
			expect(preserved.value).toBeUndefined();

			const refreshed = await getThread(thread.value.id);
			expect(refreshed.isOk()).toBe(true);
			if (!refreshed.isOk()) return;
			expect(refreshed.value?.name).toBe("Manual title");

			const defaultThread = await createThread(project.value.id);
			expect(defaultThread.isOk()).toBe(true);
			if (!defaultThread.isOk()) return;

			const autoTitled = await applyAutoThreadTitle(
				defaultThread.value.id,
				"Fix the failing tests in auth module",
				"Updated the auth tests and they pass now."
			);
			expect(autoTitled.isOk()).toBe(true);
			if (!autoTitled.isOk()) return;
			expect(autoTitled.value?.name).toBe(
				"Fix the failing tests in auth module"
			);
			expect(autoTitled.value?.titleSource).toBe("auto");
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
