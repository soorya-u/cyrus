import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Composer } from "@/components/chat/composer";
import { DiffPanel } from "@/components/chat/diff/diff-panel";
import { ChatFeed } from "@/components/chat/feed/chat-feed";
import { ThreadHeader } from "@/components/chat/main/thread-header";
import { useThreadConversation } from "@/hooks/chat/use-thread-conversation";
import { useControllerThreads } from "@/hooks/use-controller-threads";
import { useChatUiStore } from "@/stores/chat-ui";

type ThreadWorkspaceProps = {
	workerId: string;
	projectId: string;
	threadId: string;
};

export function ThreadWorkspace({
	workerId,
	projectId,
	threadId,
}: ThreadWorkspaceProps) {
	const navigate = useNavigate();
	const { threads, sendMessage, stopThread, createThread } =
		useControllerThreads();
	const { diffOpen, setDiffOpen, streamingThreadIds } = useChatUiStore();

	const baseThread = threads.find((item) => item.id === threadId) ?? null;
	const conversation = useThreadConversation(baseThread ? threadId : undefined);
	const thread = baseThread ? { ...baseThread, ...conversation } : null;
	const busy =
		Boolean(streamingThreadIds[threadId]) || thread?.status === "running";

	useEffect(() => {
		if (thread && thread.projectId !== projectId) {
			navigate({
				to: "/workers/$workerId/p/$projectId/t/$threadId",
				params: {
					workerId,
					projectId: thread.projectId,
					threadId: thread.id,
				},
			});
		}
	}, [navigate, projectId, thread, workerId]);

	function handleSend(text: string) {
		if (!thread) {
			createThread(projectId).then((id) => {
				sendMessage(id, text).catch(() => {
					/* surfaced via thread status on next getConversations poll */
				});
				navigate({
					to: "/workers/$workerId/p/$projectId/t/$threadId",
					params: { workerId, projectId, threadId: id },
				});
			});
			return;
		}
		sendMessage(thread.id, text).catch(() => {
			/* surfaced via thread status on next getConversations poll */
		});
	}

	if (!thread) {
		return null;
	}

	return (
		<>
			<ThreadHeader projectId={projectId} thread={thread} workerId={workerId} />

			<div className="flex min-h-0 flex-1">
				<div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
					<ChatFeed className="min-h-0" thread={thread} />
					<Composer
						busy={Boolean(busy)}
						onSend={handleSend}
						onStop={() => {
							stopThread(thread.id).catch(() => {
								/* noop */
							});
						}}
						projectId={projectId}
						threadId={thread.id}
					/>
				</div>
				{diffOpen ? (
					<div className="w-105 shrink-0">
						<DiffPanel onClose={() => setDiffOpen(false)} thread={thread} />
					</div>
				) : null}
			</div>
		</>
	);
}
