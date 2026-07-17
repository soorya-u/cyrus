import { useStartThread } from "@cyrus/hooks/queries/use-start-thread";
import { useAgentCatalogStore } from "@cyrus/hooks/stores/agent-catalog";
import { useLocalDraftStore } from "@cyrus/hooks/stores/local-draft";
import type { ChatMessage } from "@cyrus/schemas/rtc/chat";
import type { Thread } from "@cyrus/schemas/rtc/threads";
import { randomId } from "@cyrus/utils/identity";
import { useNavigate } from "@tanstack/react-router";
import { Result } from "better-result";
import { useMemo } from "react";
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

export function DraftWorkspace({
	workerId,
	projectId,
	draftId,
}: DraftWorkspaceProps) {
	const navigate = useNavigate();
	const startThread = useStartThread(projectId);
	const clearLocalDraft = useLocalDraftStore((state) => state.clearDraft);
	const gitChoice = useLocalDraftStore((state) => state.gitByDraft[draftId]);

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
			throw new Error("no agent selected");
		}

		const selection = catalog.selectionByThread[draftId] ?? {};
		const turnId = randomId();
		const started = await Result.tryPromise(() =>
			startThread.mutateAsync({
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
			})
		);
		if (started.isErr()) throw started.error;

		clearLocalDraft(draftId);
		await navigate({
			to: "/workers/$workerId/p/$projectId/t/$threadId",
			params: {
				workerId,
				projectId,
				threadId: started.value.threadId,
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
