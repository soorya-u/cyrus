import type { Project as RtcProject } from "@cyrus/connections/schemas/rtc/projects";
import type { Thread as RtcThread } from "@cyrus/connections/schemas/rtc/threads";
import type { Project, Thread } from "@cyrus/hooks/types";

export function mapProject(project: RtcProject): Project {
	return {
		id: project.id,
		name: project.name ?? project.id,
		path: project.cwd,
	};
}

export function mapThread(thread: RtcThread): Thread {
	return {
		id: thread.id,
		projectId: thread.projectId,
		title: thread.name,
		branch: thread.agentName ?? null,
		createdAt: thread.createdAt,
		updatedAt: thread.updatedAt,
		latestUserMessageAt: null,
		messages: [],
		toolCalls: [],
		diffs: [],
		turns: [],
		status: "idle",
		model: "default",
	};
}
