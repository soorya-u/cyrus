import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChatFeed, DiffPanel } from "@/components/chat";
import { Composer } from "@/components/chat/composer";
import { ThreadHeader } from "@/components/chat/main/thread-header";
import { useMockThreadsContext } from "@/mocks/mock-threads-provider";
import { useChatUiStore } from "@/stores/chat-ui-store";

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
	const { threads, sendMessage, createThread } = useMockThreadsContext();
	const { diffOpen, setDiffOpen } = useChatUiStore();

	const thread = threads.find((item) => item.id === threadId) ?? null;
	const busy = thread?.status === "running";

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
			const id = createThread(projectId);
			sendMessage(id, text);
			navigate({
				to: "/workers/$workerId/p/$projectId/t/$threadId",
				params: { workerId, projectId, threadId: id },
			});
			return;
		}
		sendMessage(thread.id, text);
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
							/* noop */
						}}
					/>
				</div>
				{diffOpen ? (
					<div className="w-[420px] shrink-0">
						<DiffPanel onClose={() => setDiffOpen(false)} thread={thread} />
					</div>
				) : null}
			</div>
		</>
	);
}
