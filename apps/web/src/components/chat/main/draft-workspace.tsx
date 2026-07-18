import { useStartThread } from "@cyrus/hooks/queries/use-start-thread";
import { useAgentCatalogStore } from "@cyrus/hooks/stores/agent-catalog";
import { useComposerDraftStore } from "@cyrus/hooks/stores/composer-draft";
import {
	discardLocalDraft,
	useLocalDraftStore,
} from "@cyrus/hooks/stores/local-draft";
import type { ChatMessage } from "@cyrus/schemas/rtc/chat";
import { randomId } from "@cyrus/utils/identity";
import { useNavigate } from "@tanstack/react-router";
import { Result } from "better-result";
import { useEffect } from "react";
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

	async function handleSend(
		message: ChatMessage
	): Promise<Result<void, Error>> {
		const catalog = useAgentCatalogStore.getState();
		const agentName = catalog.pendingAgentByThread[draftId];
		if (!agentName) {
			return Result.err(new Error("Select an agent before sending"));
		}

		const selection = catalog.selectionByThread[draftId] ?? {};
		const turnId = randomId();
		try {
			// mutateAsync rejects with the oRPC/domain error — do not wrap in
			// Result.tryPromise (that would erase TaggedError into UnhandledException).
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
			return Result.ok(undefined);
		} catch (error) {
			return Result.err(
				error instanceof Error ? error : new Error(String(error))
			);
		}
	}

	return (
		<>
			<ThreadHeader
				localDraft
				projectId={projectId}
				title="New thread"
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
						subject={{ id: draftId, projectId }}
						threadId={draftId}
					/>
				</div>
			</div>
		</>
	);
}
