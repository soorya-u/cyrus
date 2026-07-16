import { describe, expect, mock, test } from "bun:test";
import { Result } from "better-result";
import type { AgentRuntime } from "@/core/agents/runtime";
import { findLiveBinding, resolveBoundThread } from "./binding";
import type { BoundThread, CoordinatorHost } from "./types";

describe("findLiveBinding", () => {
	test("returns the live session from the owning agent runtime", () => {
		const runtime = {
			getLiveSession: (threadId: string) =>
				threadId === "thread-1"
					? {
							sessionId: "session-1",
							projectId: "project-1",
							cwd: "/tmp/project",
						}
					: null,
		} as unknown as AgentRuntime;

		const agents = new Map<string, AgentRuntime>([["claude", runtime]]);
		expect(findLiveBinding(agents, "thread-1")).toEqual({
			threadId: "thread-1",
			agentName: "claude",
			sessionId: "session-1",
			projectId: "project-1",
			cwd: "/tmp/project",
		});
		expect(findLiveBinding(agents, "missing")).toBeNull();
	});
});

describe("resolveBoundThread", () => {
	test("prefers a live binding when present", async () => {
		const live: BoundThread = {
			threadId: "thread-1",
			projectId: "project-1",
			agentName: "claude",
			sessionId: "session-1",
			cwd: "/tmp/project",
		};
		const host: Pick<CoordinatorHost, "findLiveBinding" | "resolveCwd"> = {
			findLiveBinding: () => live,
			resolveCwd: mock(async () => Result.ok("/tmp/other")),
		};

		const bound = await resolveBoundThread(host, "thread-1", "project-1");
		expect(bound.isOk()).toBe(true);
		if (bound.isOk()) expect(bound.value).toEqual(live);
		expect(host.resolveCwd).not.toHaveBeenCalled();
	});

	test("errors when live binding belongs to a different project", async () => {
		const host: Pick<CoordinatorHost, "findLiveBinding" | "resolveCwd"> = {
			findLiveBinding: () => ({
				threadId: "thread-1",
				projectId: "other-project",
				agentName: "claude",
				sessionId: "session-1",
				cwd: "/tmp/project",
			}),
			resolveCwd: mock(async () => Result.ok("/tmp/project")),
		};

		const bound = await resolveBoundThread(host, "thread-1", "project-1");
		expect(bound.isErr()).toBe(true);
		if (bound.isErr()) expect(bound.error._tag).toBe("coordinator.not_found");
	});
});
