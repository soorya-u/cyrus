import { useShellExecution } from "@cyrus/hooks/conversation/use-shell-execution";
import { useThreadConversation } from "@cyrus/hooks/conversation/use-thread-conversation";
import { useThreadTurns } from "@cyrus/hooks/conversation/use-thread-turns";
import { useGitFilesWatch, useGitStatus } from "@cyrus/hooks/queries/use-git";
import { useProjects } from "@cyrus/hooks/queries/use-projects";
import { useThreads } from "@cyrus/hooks/queries/use-threads";
import {
	supportsElicitation,
	useAgentCatalogStore,
} from "@cyrus/hooks/stores/agent-catalog";
import type { ChatMessage } from "@cyrus/schemas/rtc/chat";
import type { Thread } from "@cyrus/schemas/rtc/threads";
import type { ThreadConversation } from "@cyrus/schemas/view";
import { useMediaQuery } from "@mantine/hooks";
import { useNavigate } from "@tanstack/react-router";
import { Result } from "better-result";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Composer } from "@/components/chat/composer";
import { ChatFeed } from "@/components/chat/feed/chat-feed";
import { ThreadHeader } from "@/components/chat/main/thread-header";
import { WorkspaceDrawerSheet } from "@/components/chat/workspace/workspace-drawer-sheet";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useChatUiStore } from "@/stores/chat-ui";

const WorkspaceDrawer = lazy(() =>
	import("@/components/chat/workspace/workspace-drawer").then((mod) => ({
		default: mod.WorkspaceDrawer,
	}))
);

// The size is read once on mount: feeding the live value back into
// defaultSize would re-apply the layout on every resize step and fight the drag.
function WorkspaceDrawerPanel({
	threadId,
	rootPath,
}: {
	threadId: string;
	rootPath?: string;
}) {
	const [initialSize] = useState(() => useChatUiStore.getState().drawerSize);
	const setDrawerSize = useChatUiStore((state) => state.setDrawerSize);

	return (
		<>
			<ResizableHandle />
			<ResizablePanel
				defaultSize={`${initialSize}`}
				id="workspace"
				maxSize="70"
				minSize="22"
				onResize={(size) => setDrawerSize(size.asPercentage)}
			>
				<Suspense fallback={null}>
					<WorkspaceDrawer rootPath={rootPath} threadId={threadId} />
				</Suspense>
			</ResizablePanel>
		</>
	);
}

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
	const { projects, invalidateThreads } = useProjects();
	const { baseThreads: threads } = useThreads({ projects, invalidateThreads });
	const { sendMessage, stopThread, isThreadStopping, isThreadActive } =
		useThreadTurns();
	const { executeShellInput } = useShellExecution();
	const { drawerOpen, setDrawerOpen } = useChatUiStore();
	const isMobile = useMediaQuery("(max-width: 768px)", false);
	useGitStatus(drawerOpen ? threadId : undefined);
	useGitFilesWatch(drawerOpen ? threadId : undefined);

	const baseThread = threads.find((item) => item.id === threadId) ?? null;
	const rootPath =
		baseThread?.worktreePath ??
		projects.find((item) => item.id === baseThread?.projectId)?.cwd;
	const conversation = useThreadConversation(baseThread ? threadId : undefined);
	const stopping = isThreadStopping(threadId);
	const running = conversation.turns.some((turn) => turn.state === "running");
	const active = isThreadActive(threadId);
	const thread: ThreadView | null = baseThread
		? { ...baseThread, ...conversation }
		: null;

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

	async function handleSend(
		message: ChatMessage
	): Promise<Result<void, Error>> {
		if (!thread) return Result.ok(undefined);
		return await sendMessage(thread.id, message);
	}

	async function handleExecuteShell(
		command: string
	): Promise<Result<void, Error>> {
		if (!thread) return Result.ok(undefined);
		return await executeShellInput(thread.id, command);
	}

	if (!thread) return null;

	return (
		<>
			<ThreadHeader
				projectId={thread.projectId}
				threadId={thread.id}
				title={thread.name}
				workerId={workerId}
			/>

			<ResizablePanelGroup className="min-h-0 flex-1" orientation="horizontal">
				<ResizablePanel id="chat" minSize="30">
					<div className="relative flex h-full min-h-0 min-w-0 flex-col">
						<ChatFeed
							active={running || active}
							className="min-h-0"
							conversation={conversation}
						/>
						<Composer
							busy={running || active}
							onExecuteShell={handleExecuteShell}
							onSend={handleSend}
							onStop={async () => await stopThread(thread.id)}
							pendingApprovals={pendingApprovals}
							pendingElicitations={pendingElicitations}
							projectId={projectId}
							stopping={stopping}
							subject={{
								id: thread.id,
								projectId: thread.projectId,
								worktreePath: thread.worktreePath,
							}}
							threadError={composerBlockingError}
							threadId={thread.id}
						/>
					</div>
				</ResizablePanel>
				{drawerOpen && !isMobile ? (
					<WorkspaceDrawerPanel rootPath={rootPath} threadId={thread.id} />
				) : null}
			</ResizablePanelGroup>
			{isMobile ? (
				<WorkspaceDrawerSheet onOpenChange={setDrawerOpen} open={drawerOpen}>
					<Suspense fallback={null}>
						<WorkspaceDrawer
							onClose={() => setDrawerOpen(false)}
							rootPath={rootPath}
							threadId={thread.id}
						/>
					</Suspense>
				</WorkspaceDrawerSheet>
			) : null}
		</>
	);
}
