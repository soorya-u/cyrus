import { useCallback, useState } from "react";
import type {
	GitDiff,
	Message,
	Project,
	Thread,
	ToolCall,
	Turn,
} from "./types";
import { createId } from "./use-id";

const MOCK_PROJECTS: Project[] = [
	{ id: "p-cyrus", name: "cyrus", path: "~/oss/cyrus" },
	{ id: "p-web", name: "cyrus-web", path: "~/oss/cyrus/apps/web" },
];

const MOCK_TITLES = [
	"Fix auth redirect asdasd",
	"Refactor composer layout asdladjsaklsdjlks",
	"Add diff panel tests",
	"Wire up terminal drawer",
	"Migrate sidebar to base-ui",
];

function nowISO(): string {
	return new Date().toISOString();
}

function mockAssistantReply(
	turnId: string,
	text: string
): { message: Message; toolCalls: ToolCall[]; diffs: GitDiff[]; turn: Turn } {
	const lower = text.toLowerCase();
	const toolCalls: ToolCall[] = [];
	const diffs: GitDiff[] = [];

	if (
		lower.includes("fix") ||
		lower.includes("bug") ||
		lower.includes("edit")
	) {
		toolCalls.push({
			id: createId("tc"),
			turnId,
			name: "grep",
			args: { pattern: "TODO|FIXME" },
			result: "found 3 matches",
			status: "complete",
			createdAt: nowISO(),
		});
		toolCalls.push({
			id: createId("tc"),
			turnId,
			name: "read_file",
			args: { path: "src/auth.ts" },
			status: "complete",
			createdAt: nowISO(),
		});
		diffs.push({
			id: createId("d"),
			turnId,
			file: "src/auth.ts",
			additions: 2,
			deletions: 1,
			patch:
				"diff --git a/src/auth.ts b/src/auth.ts\nindex 1a2b3c4..5d6e7f8 100644\n--- a/src/auth.ts\n+++ b/src/auth.ts\n@@ -12,7 +12,8 @@\n- if (!user) redirect('/login')\n+ if (!user) redirect('/dashboard')\n+ // ensure session persists across reloads\n   return user;\n }",
		});
	} else if (lower.includes("test")) {
		toolCalls.push({
			id: createId("tc"),
			turnId,
			name: "run_tests",
			args: { suite: "auth" },
			result: "2 passed",
			status: "complete",
			createdAt: nowISO(),
		});
	} else {
		toolCalls.push({
			id: createId("tc"),
			turnId,
			name: "list_dir",
			args: { path: "." },
			result: "src, apps, packages",
			status: "complete",
			createdAt: nowISO(),
		});
	}

	const turn: Turn = {
		id: turnId,
		threadId: "",
		index: 0,
		completedAt: nowISO(),
		state: "complete",
	};

	const message: Message = {
		id: createId("m"),
		role: "assistant",
		content: `Investigating: ${text}\n\nI looked at the relevant files and applied the changes below. The diff panel shows what changed.`,
		createdAt: nowISO(),
		turnId,
	};

	return { message, toolCalls, diffs, turn };
}

export function useMockThreads() {
	const [threads, setThreads] = useState<Thread[]>(() => {
		const t1Id = "t1";
		const turn1Id = "turn1";
		const seed: Thread = {
			id: t1Id,
			projectId: "p-cyrus",
			title: MOCK_TITLES[0] ?? "New thread",
			status: "ready",
			createdAt: nowISO(),
			updatedAt: nowISO(),
			latestUserMessageAt: nowISO(),
			model: "codex-default",
			branch: "fix/auth-redirect",
			messages: [
				{
					id: createId("m"),
					role: "user",
					content: "Fix the login redirect bug",
					createdAt: nowISO(),
					turnId: turn1Id,
				},
				{
					id: createId("m"),
					role: "assistant",
					content:
						"Investigating the auth flow. I grepped for `redirect` and read `src/auth.ts`, then patched the redirect target.",
					createdAt: nowISO(),
					turnId: turn1Id,
				},
			],
			toolCalls: [
				{
					id: createId("tc"),
					turnId: turn1Id,
					name: "grep",
					args: { q: "redirect" },
					result: "found",
					status: "complete",
					createdAt: nowISO(),
				},
			],
			diffs: [
				{
					id: createId("d"),
					turnId: turn1Id,
					file: "src/auth.ts",
					additions: 1,
					deletions: 1,
					patch:
						"diff --git a/src/auth.ts b/src/auth.ts\nindex 1a2b3c4..5d6e7f8 100644\n--- a/src/auth.ts\n+++ b/src/auth.ts\n@@ -12,7 +12,7 @@\n- if (!user) redirect('/login')\n+ if (!user) redirect('/dashboard')\n   return user;\n }",
				},
			],
			turns: [
				{
					id: turn1Id,
					threadId: t1Id,
					index: 1,
					completedAt: nowISO(),
					state: "complete",
				},
			],
		};
		return [
			seed,
			{
				id: "t2",
				projectId: "p-cyrus",
				title: MOCK_TITLES[1] ?? "Refactor composer layout asdasldkjaldsjl",
				status: "idle",
				createdAt: nowISO(),
				updatedAt: nowISO(),
				latestUserMessageAt: null,
				model: "codex-default",
				branch: "feat/composer",
				messages: [],
				toolCalls: [],
				diffs: [],
				turns: [],
			},
			{
				id: "t3",
				projectId: "p-web",
				title: MOCK_TITLES[2] ?? "Add diff panel tests",
				status: "ready",
				createdAt: nowISO(),
				updatedAt: nowISO(),
				latestUserMessageAt: nowISO(),
				model: "codex-default",
				branch: "test/diff-panel",
				messages: [],
				toolCalls: [],
				diffs: [],
				turns: [],
			},
		];
	});

	const createThread = useCallback((projectId = "p-cyrus"): string => {
		const id = createId("t");
		const thread: Thread = {
			id,
			projectId,
			title: "New thread",
			status: "idle",
			createdAt: nowISO(),
			updatedAt: nowISO(),
			latestUserMessageAt: null,
			model: "codex-default",
			branch: null,
			messages: [],
			toolCalls: [],
			diffs: [],
			turns: [],
		};
		setThreads((prev) => [thread, ...prev]);
		return id;
	}, []);

	const renameThread = useCallback((id: string, title: string) => {
		setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
	}, []);

	const archiveThread = useCallback((id: string) => {
		setThreads((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const deleteThread = useCallback((id: string) => {
		setThreads((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const sendMessage = useCallback((threadId: string, text: string) => {
		const turnId = createId("turn");
		const userMsg: Message = {
			id: createId("m"),
			role: "user",
			content: text,
			createdAt: nowISO(),
			turnId,
		};
		setThreads((prev) =>
			prev.map((t) => {
				if (t.id !== threadId) {
					return t;
				}
				const reply = mockAssistantReply(turnId, text);
				reply.turn.threadId = threadId;
				reply.turn.index = t.turns.length + 1;
				const nextTurns = [...t.turns, reply.turn];
				const isUntitled = t.title === "New thread" || t.messages.length === 0;
				return {
					...t,
					title: isUntitled ? text.slice(0, 48) : t.title,
					status: "ready",
					updatedAt: nowISO(),
					latestUserMessageAt: nowISO(),
					messages: [...t.messages, userMsg, reply.message],
					toolCalls: [...t.toolCalls, ...reply.toolCalls],
					diffs: [...t.diffs, ...reply.diffs],
					turns: nextTurns,
				};
			})
		);
	}, []);

	const stopThread = useCallback((threadId: string) => {
		setThreads((prev) =>
			prev.map((t) =>
				t.id === threadId
					? {
							...t,
							status: "ready",
							turns: t.turns.map((turn, i) =>
								i === t.turns.length - 1 && turn.state === "running"
									? { ...turn, state: "interrupted", completedAt: nowISO() }
									: turn
							),
						}
					: t
			)
		);
	}, []);

	return {
		projects: MOCK_PROJECTS,
		threads,
		createThread,
		renameThread,
		archiveThread,
		deleteThread,
		sendMessage,
		stopThread,
	};
}

export type UseMockThreads = ReturnType<typeof useMockThreads>;
