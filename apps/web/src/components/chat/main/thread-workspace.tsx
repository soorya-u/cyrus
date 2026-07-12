import { useControllerThreads } from "@cyrus/hooks/connection/use-controller-threads";
import { useThreadConversation } from "@cyrus/hooks/connection/use-thread-conversation";
import type { Thread } from "@cyrus/schemas/rtc/threads";
import type { ThreadConversation } from "@cyrus/schemas/view";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
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
	const { threads, sendMessage, stopThread, isThreadStopping, isThreadActive } =
		useControllerThreads();
	const { diffOpen, setDiffOpen } = useChatUiStore();

	const baseThread = threads.find((item) => item.id === threadId) ?? null;
	const conversation = useThreadConversation(baseThread ? threadId : undefined);
	const stopping = isThreadStopping(threadId);
	const running = conversation.turns.some((turn) => turn.state === "running");
	const active = isThreadActive(threadId);
	const thread: ThreadView | null = baseThread
		? { ...baseThread, ...conversation }
		: null;

	useEffect(() => {
		if (thread && thread.projectId !== projectId)
			navigate({
				to: "/workers/$workerId/p/$projectId/t/$threadId",
				params: {
					workerId,
					projectId: thread.projectId,
					threadId: thread.id,
				},
			});
	}, [navigate, projectId, thread, workerId]);

	async function handleSend(text: string) {
		if (!thread) return;
		await sendMessage(thread.id, text);
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
						threadId={thread.id}
					/>
				</div>
				{diffOpen ? (
					<div className="w-105 shrink-0">
						<DiffPanel
							conversation={conversation}
							onClose={() => setDiffOpen(false)}
						/>
					</div>
				) : null}
			</div>
		</>
	);
}
