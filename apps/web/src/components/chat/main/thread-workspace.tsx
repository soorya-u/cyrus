import { useThreadConversation } from "@cyrus/hooks/conversation/use-thread-conversation";
import { useThreadTurns } from "@cyrus/hooks/conversation/use-thread-turns";
import {
	invalidateThreadGitQueries,
	useGitStatus,
} from "@cyrus/hooks/queries/use-git";
import { useProjects } from "@cyrus/hooks/queries/use-projects";
import { useThreads } from "@cyrus/hooks/queries/use-threads";
import {
	supportsElicitation,
	useAgentCatalogStore,
} from "@cyrus/hooks/stores/agent-catalog";
import type { ChatMessage } from "@cyrus/schemas/rtc/chat";
import type { Thread } from "@cyrus/schemas/rtc/threads";
import type { ThreadConversation } from "@cyrus/schemas/view";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { Composer } from "@/components/chat/composer";
import { ChatFeed } from "@/components/chat/feed/chat-feed";
import { ThreadHeader } from "@/components/chat/main/thread-header";
import { useChatUiStore } from "@/stores/chat-ui";

const DiffPanel = lazy(() =>
	import("@/components/chat/diff/diff-panel").then((mod) => ({
		default: mod.DiffPanel,
	}))
);

type ThreadWorkspaceProps = {
	workerId: string;
	projectId: string;
	threadId: string;
};

type ThreadView = Thread & ThreadConversation;

export function ThreadWorkspace({
	workerId,
	projectId,
	threadId,
}: ThreadWorkspaceProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { projects, invalidateThreads } = useProjects();
	const { baseThreads: threads } = useThreads({ projects, invalidateThreads });
	const { sendMessage, stopThread, isThreadStopping, isThreadActive } =
		useThreadTurns();
	const { diffOpen, setDiffOpen } = useChatUiStore();
	useGitStatus(diffOpen ? threadId : undefined);

	const baseThread = threads.find((item) => item.id === threadId) ?? null;
	const conversation = useThreadConversation(baseThread ? threadId : undefined);
	const stopping = isThreadStopping(threadId);
	const running = conversation.turns.some((turn) => turn.state === "running");
	const active = isThreadActive(threadId);
	const thread: ThreadView | null = baseThread
		? { ...baseThread, ...conversation }
		: null;

	const lastTurn = conversation.turns.at(-1);
	const lastTurnStateRef = useRef(lastTurn?.state);
	// Only orphan tip errors (e.g. bind failures) block send. Turn errors stay in
	// the feed so a failed turn does not permanently prevent the next message.
	const lastError = conversation.errors.at(-1) ?? null;
	const lastMessageAt = conversation.messages.at(-1)?.createdAt;
	const composerBlockingError =
		lastError &&
		!conversation.turns.some((turn) => turn.id === lastError.turnId) &&
		(lastMessageAt == null || lastError.createdAt >= lastMessageAt)
			? lastError
			: null;

	const pendingApprovals = useMemo(
		() => (conversation.approvals ?? []).filter((item) => !item.resolved),
		[conversation.approvals]
	);
	const elicitationCapable = useAgentCatalogStore((state) =>
		supportsElicitation(state.capabilitiesByThread[threadId])
	);
	const pendingElicitations = useMemo(
		() =>
			elicitationCapable
				? (conversation.elicitations ?? []).filter((item) => !item.resolved)
				: [],
		[conversation.elicitations, elicitationCapable]
	);

	useEffect(() => {
		if (!(diffOpen && lastTurn)) return;
		const previous = lastTurnStateRef.current;
		lastTurnStateRef.current = lastTurn.state;
		if (
			previous === "running" &&
			(lastTurn.state === "complete" || lastTurn.state === "interrupted")
		) {
			invalidateThreadGitQueries(queryClient, threadId);
		}
	}, [diffOpen, lastTurn, queryClient, threadId]);

	const threadProjectId = thread?.projectId;
	const resolvedThreadId = thread?.id;

	useEffect(() => {
		if (!(resolvedThreadId && threadProjectId)) return;
		if (threadProjectId === projectId) return;
		navigate({
			to: "/workers/$workerId/p/$projectId/t/$threadId",
			params: {
				workerId,
				projectId: threadProjectId,
				threadId: resolvedThreadId,
			},
		});
	}, [navigate, projectId, resolvedThreadId, threadProjectId, workerId]);

	async function handleSend(message: ChatMessage) {
		if (!thread) return;
		const result = await sendMessage(thread.id, message);
		if (result.isErr()) throw result.error;
	}

	if (!thread) return null;

	return (
		<>
			<ThreadHeader projectId={projectId} thread={thread} workerId={workerId} />

			<div className="flex min-h-0 flex-1">
				<div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
					<ChatFeed
						active={running || active}
						className="min-h-0"
						conversation={conversation}
					/>
					<Composer
						busy={running || active}
						onSend={handleSend}
						onStop={async () => await stopThread(thread.id)}
						pendingApprovals={pendingApprovals}
						pendingElicitations={pendingElicitations}
						projectId={projectId}
						stopping={stopping}
						thread={thread}
						threadError={composerBlockingError}
						threadId={thread.id}
					/>
				</div>
				{diffOpen ? (
					<div className="w-105 shrink-0">
						<Suspense fallback={null}>
							<DiffPanel
								onClose={() => setDiffOpen(false)}
								threadId={thread.id}
							/>
						</Suspense>
					</div>
				) : null}
			</div>
		</>
	);
}
