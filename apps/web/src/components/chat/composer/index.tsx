import { useAgentCatalog } from "@cyrus/hooks/agent-catalog/use-agent-catalog";
import {
	useGitStatus,
	useProjectGitStatus,
} from "@cyrus/hooks/queries/use-git";
import { useListAgents } from "@cyrus/hooks/queries/use-list-agents";
import { useProjects } from "@cyrus/hooks/queries/use-projects";
import { useComposerDraftHydrated } from "@cyrus/hooks/stores/composer-draft";
import { useEffect, useState } from "react";
import { FileMentionAutocomplete } from "@/components/chat/composer/composer-attachments";
import { ComposerContextUsage } from "@/components/chat/composer/composer-context-usage";
import { ComposerPendingInteractive } from "@/components/chat/composer/composer-interactive";
import { ComposerLowerChrome } from "@/components/chat/composer/composer-lower-chrome";
import { ComposerPromptEditor } from "@/components/chat/composer/composer-prompt-editor";
import { ComposerQueueChips } from "@/components/chat/composer/composer-queue";
import { ComposerSkeleton } from "@/components/chat/composer/composer-skeleton";
import { ComposerUnavailable } from "@/components/chat/composer/composer-unavailable";
import { ComposerFooterColumn } from "@/components/chat/composer/footer-controls";
import { ComposerPrimaryAction } from "@/components/chat/composer/primary-action";
import { SlashCommandAutocomplete } from "@/components/chat/composer/slash-command-autocomplete";
import { useComposerEditor } from "@/hooks/chat/use-composer-editor";
import type { ComposerProps } from "@/types/composer";

export type { ComposerSubject } from "@/types/composer";

type ComposerBodyStatus =
	| "loading"
	| "agents-error"
	| "unavailable"
	| "settling"
	| "interactive"
	| "ready";

function getComposerBodyStatus(options: {
	agentsLoading: boolean;
	agentsError: boolean;
	agentsReady: boolean;
	hasAgents: boolean;
	localDraft: boolean;
	draftCatalogSettled: boolean;
	isInteractivePending: boolean;
}): ComposerBodyStatus {
	if (options.agentsLoading) return "loading";
	if (options.agentsError) return "agents-error";
	if (options.agentsReady && !options.hasAgents) return "unavailable";
	if (options.localDraft && !options.draftCatalogSettled) return "settling";
	if (options.isInteractivePending) return "interactive";
	return "ready";
}

export function Composer({
	projectId,
	threadId,
	subject,
	onSend,
	onStop,
	busy = false,
	stopping = false,
	threadError = null,
	pendingApprovals = [],
	pendingElicitations = [],
	localDraft = false,
}: ComposerProps) {
	const agentsQuery = useListAgents();
	const agents = agentsQuery.data?.agents ?? [];
	const agentsReady = agentsQuery.isSuccess;
	const agentsLoading = agentsQuery.isLoading;
	const hasAgents = agents.length > 0;

	const { projects } = useProjects();
	const projectCwd =
		projects.find((project) => project.id === projectId)?.cwd ?? "";
	const threadCwd = subject.worktreePath ?? projectCwd;

	const catalog = useAgentCatalog({
		agents,
		localDraft,
		projectId,
		threadId,
	});
	const supportsEmbeddedContext =
		catalog.capabilities == null ||
		catalog.promptCapabilities.embeddedContext !== false;
	const canAttachFiles = Boolean(threadCwd) && supportsEmbeddedContext;
	const canPasteUrls = supportsEmbeddedContext;
	const composerBlocked = Boolean(threadError ?? catalog.catalogError);

	// Drafts defer project-git until the user opens the branch chrome so opening
	// a draft performs no worker RPCs beyond ambient listAgents.
	const [draftGitOpen, setDraftGitOpen] = useState(false);
	// Keep every draft lazy: a new draft/project identity must re-defer project
	// git access until its own branch chrome is explicitly opened.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset only on identity change
	useEffect(() => {
		setDraftGitOpen(false);
	}, [threadId, projectId]);

	// One-way latch: keeps a fresh draft in skeleton until its default agent
	// and model have both settled, so the composer never paints an
	// agent-selected-but-no-model-yet frame. Never re-arms after the first
	// settle, so a later agent switch (mid-typing) never re-hides the editor.
	const [draftCatalogSettled, setDraftCatalogSettled] = useState(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset only on identity change
	useEffect(() => {
		setDraftCatalogSettled(false);
	}, [threadId, projectId]);
	useEffect(() => {
		if (draftCatalogSettled) return;
		if (!localDraft) return;
		if (!catalog.displayAgent || catalog.modelsLoading) return;
		setDraftCatalogSettled(true);
	}, [
		draftCatalogSettled,
		localDraft,
		catalog.displayAgent,
		catalog.modelsLoading,
	]);
	const threadGitStatus = useGitStatus(localDraft ? undefined : threadId);
	const projectGitStatus = useProjectGitStatus(
		localDraft && draftGitOpen ? projectId : undefined
	);
	const isGitRepo =
		(localDraft ? projectGitStatus : threadGitStatus).data?.isRepo === true;
	const draftHydrated = useComposerDraftHydrated();
	const activeElicitation =
		pendingElicitations.find((item) => !item.resolved) ?? null;
	const activeApproval =
		pendingApprovals.find((item) => !item.resolved) ?? null;
	const isInteractivePending = Boolean(activeElicitation || activeApproval);

	const editorReady =
		draftHydrated &&
		!agentsLoading &&
		!agentsQuery.isError &&
		!(agentsReady && !hasAgents) &&
		!isInteractivePending &&
		(!localDraft || draftCatalogSettled);

	const editor = useComposerEditor({
		threadId,
		threadCwd,
		commands: catalog.commands,
		displayAgent: catalog.displayAgent,
		canAttachFiles,
		canPasteUrls,
		editorReady,
		hasAgents,
		stopping,
		composerBlocked,
		onSend,
	});

	const composerBodyStatus = getComposerBodyStatus({
		agentsLoading,
		agentsError: agentsQuery.isError,
		agentsReady,
		draftCatalogSettled,
		hasAgents,
		isInteractivePending,
		localDraft,
	});

	function renderComposerBody() {
		if (composerBodyStatus === "loading" || composerBodyStatus === "settling") {
			return <ComposerSkeleton />;
		}

		if (composerBodyStatus === "agents-error") {
			return (
				<div className="group rounded-[22px] p-px transition-colors duration-200">
					<div className="chat-composer-glass rounded-4xl border border-border px-4 py-5 text-center transition-colors duration-200">
						<p className="font-medium text-destructive text-sm">
							Could not load agents
						</p>
						<p className="mt-1 text-muted-foreground text-xs">
							Check that the worker is connected and try again.
						</p>
					</div>
				</div>
			);
		}

		if (composerBodyStatus === "unavailable") {
			return <ComposerUnavailable />;
		}

		if (composerBodyStatus === "interactive") {
			return (
				<div className="space-y-2">
					<ComposerQueueChips threadId={threadId} />
					<ComposerPendingInteractive
						approval={activeApproval}
						elicitation={activeElicitation}
						pendingApprovalCount={
							pendingApprovals.filter((item) => !item.resolved).length
						}
						pendingElicitationCount={
							pendingElicitations.filter((item) => !item.resolved).length
						}
					/>
				</div>
			);
		}

		return (
			<div className="group rounded-[22px] p-px transition-colors duration-200">
				<ComposerQueueChips threadId={threadId} />
				<div className="chat-composer-glass overflow-visible rounded-4xl border border-border transition-colors duration-200 has-focus-visible:border-ring/45">
					<div className="relative overflow-visible px-3 pt-3.5 pb-2 sm:px-4 sm:pt-4">
						<div className="relative overflow-visible">
							{editor.slash.filter === null || editor.slash.dismissed ? null : (
								<SlashCommandAutocomplete
									activeIndex={editor.slash.activeIndex}
									commands={catalog.commands}
									filter={editor.slash.filter}
									onSelect={(command) => editor.slash.select(command.name)}
								/>
							)}
							{editor.mention.filter === null ||
							editor.mention.dismissed ? null : (
								<FileMentionAutocomplete
									activeIndex={editor.mention.activeIndex}
									filter={editor.mention.filter}
									isError={editor.mention.filesQuery.isError}
									isLoading={
										editor.mention.filter.length > 0 &&
										(editor.mention.filesQuery.isFetching ||
											editor.mention.filesQuery.isPending)
									}
									needsQuery={editor.mention.filter.length === 0}
									onSelect={editor.mention.select}
									paths={editor.mention.paths}
									truncated={editor.mention.filesQuery.data?.truncated === true}
								/>
							)}
							<ComposerPromptEditor
								key={threadId}
								onCommandKeyDown={editor.handlers.commandKeyDown}
								onPaste={editor.handlers.paste}
								onPlainTextChange={editor.handlers.plainTextChange}
								placeholder={editor.placeholder}
								ref={editor.editorRef}
							/>
						</div>
					</div>

					<div
						className="flex min-w-0 flex-nowrap items-center justify-between gap-2 overflow-visible px-2.5 pb-2.5 sm:gap-0 sm:px-3 sm:pb-3"
						data-chat-composer-footer="true"
					>
						<ComposerFooterColumn
							agents={agents}
							catalogError={catalog.catalogError}
							displayAgent={catalog.displayAgent}
							localDraft={localDraft}
							onRetryAgent={catalog.selectAgent}
							projectId={projectId}
							threadId={threadId}
						/>
						<div
							className="flex shrink-0 flex-nowrap items-center justify-end gap-4"
							data-chat-composer-actions="right"
						>
							<ComposerContextUsage usage={catalog.contextUsage} />
							<ComposerPrimaryAction
								busy={busy}
								canSend={
									editor.hasContent &&
									!composerBlocked &&
									Boolean(catalog.displayAgent)
								}
								onStop={onStop}
								sending={editor.sending}
								stopping={stopping}
							/>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className="pointer-events-none absolute inset-x-0 bottom-0 z-20 pt-1.5 sm:pt-2"
			data-chat-composer-overlay="true"
		>
			<div
				aria-hidden="true"
				className="chat-composer-horizontal-inset pointer-events-none absolute inset-x-0 top-1.5 bottom-0 z-0 sm:top-2"
			>
				<div className="relative mx-auto h-full w-full max-w-3xl overflow-clip rounded-t-4xl">
					<div className="chat-composer-shared-blur absolute -inset-8" />
				</div>
			</div>

			<div className="chat-composer-horizontal-inset">
				<div className="pointer-events-auto relative isolate z-10">
					<form
						className="mx-auto w-full min-w-0 max-w-3xl"
						data-chat-composer-form="true"
						onSubmit={(event) => {
							event.preventDefault();
							editor.submit().catch(() => undefined);
						}}
					>
						{renderComposerBody()}
					</form>
				</div>
			</div>

			<ComposerLowerChrome
				draftGitOpen={draftGitOpen}
				isGitRepo={isGitRepo}
				localDraft={localDraft}
				onOpenDraftGit={() => setDraftGitOpen(true)}
				subject={subject}
			/>
		</div>
	);
}
