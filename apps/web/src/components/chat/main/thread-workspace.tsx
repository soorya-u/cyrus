import { useControllerThreads } from "@cyrus/hooks/connection/use-controller-threads";
import {
	invalidateThreadGitQueries,
	useGitStatus,
} from "@cyrus/hooks/connection/use-git";
import { useThreadConversation } from "@cyrus/hooks/connection/use-thread-conversation";
import type { ChatMessage } from "@cyrus/schemas/rtc/chat";
import type { Thread } from "@cyrus/schemas/rtc/threads";
import type { ThreadConversation } from "@cyrus/schemas/view";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Composer } from "@/components/chat/composer";
import { DiffPanel } from "@/components/chat/diff/diff-panel";
import { ChatFeed } from "@/components/chat/feed/chat-feed";
import { ThreadHeader } from "@/components/chat/main/thread-header";
import { useChatUiStore } from "@/stores/chat-ui";

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
	const { threads, sendMessage, stopThread, isThreadStopping, isThreadActive } =
		useControllerThreads();
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
	const latestThreadError =
		conversation.errors.find((error) => error.turnId === lastTurn?.id) ??
		conversation.errors.at(-1) ??
		null;

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
		await sendMessage(thread.id, message);
	}

	if (!thread) return null;

	return (
		<>
			<ThreadHeader projectId={projectId} thread={thread} workerId={workerId} />

			<div className="flex min-h-0 flex-1">
				<div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
					<ChatFeed className="min-h-0" conversation={conversation} />
					<Composer
						busy={running || active}
						onSend={handleSend}
						onStop={async () => await stopThread(thread.id)}
						projectId={projectId}
						stopping={stopping}
						thread={thread}
						threadError={latestThreadError}
						threadId={thread.id}
					/>
				</div>
				{diffOpen ? (
					<div className="w-105 shrink-0">
						<DiffPanel
							onClose={() => setDiffOpen(false)}
							threadId={thread.id}
						/>
					</div>
				) : null}
			</div>
		</>
	);
}
