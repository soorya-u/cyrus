import { coordinatorRuntimeError } from "@cyrus/errors/coordinator";
import { useStartThread } from "@cyrus/hooks/queries/use-start-thread";
import { useAgentCatalogStore } from "@cyrus/hooks/stores/agent-catalog";
import { useComposerDraftStore } from "@cyrus/hooks/stores/composer-draft";
import {
	discardLocalDraft,
	useLocalDraftStore,
} from "@cyrus/hooks/stores/local-draft";
import type { ChatMessage } from "@cyrus/schemas/rtc/chat";
import type { Thread } from "@cyrus/schemas/rtc/threads";
import { randomId } from "@cyrus/utils/identity";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Composer } from "@/components/chat/composer";
import { ChatFeed } from "@/components/chat/feed/chat-feed";
import { ThreadHeader } from "@/components/chat/main/thread-header";

type DraftWorkspaceProps = {
	workerId: string;
	projectId: string;
	draftId: string;
};

const EMPTY_CONVERSATION = {
	approvals: [],
	diffs: [],
	elicitations: [],
	errors: [],
	messages: [],
	thoughts: [],
	toolCalls: [],
	turns: [],
};

function clearDraftControllerState(draftId: string): void {
	discardLocalDraft(draftId);
	useComposerDraftStore.getState().clearDraft(draftId);
	useAgentCatalogStore.getState().clearPendingAgent(draftId);
}

export function DraftWorkspace({
	workerId,
	projectId,
	draftId,
}: DraftWorkspaceProps) {
	const navigate = useNavigate();
	const startThread = useStartThread(projectId);
	const gitChoice = useLocalDraftStore((state) => state.gitByDraft[draftId]);

	useEffect(
		() => () => {
			clearDraftControllerState(draftId);
		},
		[draftId]
	);

	const draftThread = useMemo<Thread>(
		() => ({
			id: draftId,
			projectId,
			name: "New thread",
			agentName: undefined,
			sessionId: undefined,
			agentLocked: undefined,
			titleSource: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}),
		[draftId, projectId]
	);

	async function handleSend(message: ChatMessage) {
		const catalog = useAgentCatalogStore.getState();
		const agentName =
			catalog.pendingAgentByThread[draftId] ??
			catalog.liveBindingByThread[draftId]?.agentName;
		if (!agentName) {
			// TanStack mutation / composer boundary — throw TaggedError.
			throw coordinatorRuntimeError("no agent selected");
		}

		const selection = catalog.selectionByThread[draftId] ?? {};
		const turnId = randomId();
		// mutateAsync already rejects with the oRPC/domain error — do not wrap
		// in Result.tryPromise (that would erase the TaggedError into UnhandledException).
		const started = await startThread.mutateAsync({
			projectId,
			agentName,
			message,
			turnId,
			branch: gitChoice?.branch,
			worktree: gitChoice?.worktree,
			preferences: {
				modelId: selection.modelId,
				modeId: selection.modeId,
				effortId: selection.effortId,
				personaId: selection.personaId,
			},
		});

		clearDraftControllerState(draftId);
		await navigate({
			to: "/workers/$workerId/p/$projectId/t/$threadId",
			params: {
				workerId,
				projectId,
				threadId: started.threadId,
			},
		});
	}

	return (
		<>
			<ThreadHeader
				localDraft
				projectId={projectId}
				thread={draftThread}
				workerId={workerId}
			/>

			<div className="flex min-h-0 flex-1">
				<div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
					<ChatFeed
						active={false}
						className="min-h-0"
						conversation={EMPTY_CONVERSATION}
					/>
					<Composer
						busy={startThread.isPending}
						localDraft
						onSend={handleSend}
						projectId={projectId}
						thread={draftThread}
						threadId={draftId}
					/>
				</div>
			</div>
		</>
	);
}
