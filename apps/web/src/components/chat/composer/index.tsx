import { useAgentCatalog } from "@cyrus/hooks/connection/use-agent-catalog";
import { useGitStatus } from "@cyrus/hooks/connection/use-git";
import { useListAgents } from "@cyrus/hooks/connection/use-list-agents";
import { useProjects } from "@cyrus/hooks/connection/use-projects";
import { useSearchEntries } from "@cyrus/hooks/connection/use-search-entries";
import {
	useComposerDraft,
	useComposerDraftStore,
} from "@cyrus/hooks/stores/composer-draft";
import type { ChatMessage } from "@cyrus/schemas/rtc/chat";
import type { Thread } from "@cyrus/schemas/rtc/threads";
import type { ErrorView } from "@cyrus/schemas/view";
import { cn } from "cnfast";
import {
	type ClipboardEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { FileMentionAutocomplete } from "@/components/chat/composer/composer-attachments";
import { ComposerBranchToolbar } from "@/components/chat/composer/composer-branch-toolbar";
import {
	type ComposerCommandKey,
	ComposerPromptEditor,
	type ComposerPromptEditorHandle,
} from "@/components/chat/composer/composer-prompt-editor";
import { ComposerQueueChips } from "@/components/chat/composer/composer-queue";
import { COMPOSER_CHIP_PLACEHOLDER } from "@/components/chat/composer/composer-resource-node";
import { ComposerSkeleton } from "@/components/chat/composer/composer-skeleton";
import { ComposerUnavailable } from "@/components/chat/composer/composer-unavailable";
import { ComposerFooterControls } from "@/components/chat/composer/footer-controls";
import { ComposerPrimaryAction } from "@/components/chat/composer/primary-action";
import {
	filterSlashCommands,
	SlashCommandAutocomplete,
} from "@/components/chat/composer/slash-command-autocomplete";

const SLASH_TOKEN_PATTERN = /(?:^|\s)\/([\w./-]*)$/;
const AT_TOKEN_PATTERN = /(?:^|\s)@([\w./-]*)$/;
const URL_PATTERN = /^https?:\/\/\S+$/i;
const TRAILING_URL_PATTERN = /(?:^|\s)(https?:\/\/\S+)(\s+)$/i;
const URL_IN_TEXT_PATTERN = /https?:\/\/\S+/i;
const TRAILING_SLASHES_PATTERN = /\/+$/;

function buildComposerPlaceholder(options: {
	canAttachFiles: boolean;
	canPasteUrls: boolean;
	canSlash: boolean;
}): string {
	const hints = ["Ask anything"];
	if (options.canAttachFiles) hints.push("@ files");
	if (options.canPasteUrls) hints.push("paste URLs");
	hints.push("$use skills");
	if (options.canSlash) hints.push("/ for commands");
	return hints.join(", ");
}

function textForTriggers(plainText: string): string {
	return plainText.replaceAll(COMPOSER_CHIP_PLACEHOLDER, "");
}

function resourceNameFromPath(path: string): string {
	const normalizedPath = path.replace(TRAILING_SLASHES_PATTERN, "");
	return normalizedPath.split("/").pop() || path;
}

export function Composer({
	projectId,
	threadId,
	thread,
	onSend,
	onStop,
	busy = false,
	stopping = false,
	threadError = null,
}: {
	projectId: string;
	threadId: string;
	thread: Thread;
	onSend: (message: ChatMessage) => void | Promise<void>;
	onStop?: () => void;
	busy?: boolean;
	stopping?: boolean;
	threadError?: ErrorView | null;
}) {
	const agentsQuery = useListAgents();
	const agents = agentsQuery.data?.agents ?? [];
	const agentsReady = agentsQuery.isSuccess;
	const agentsLoading = agentsQuery.isLoading;
	const hasAgents = agents.length > 0;

	const { projects } = useProjects();
	const projectCwd =
		projects.find((project) => project.id === projectId)?.cwd ?? "";
	const threadCwd = thread.worktreePath ?? projectCwd;

	const catalog = useAgentCatalog({ agents, projectId, threadId });
	const supportsEmbeddedContext =
		catalog.capabilities == null ||
		catalog.promptCapabilities.embeddedContext !== false;
	const canAttachFiles = Boolean(threadCwd) && supportsEmbeddedContext;
	const canPasteUrls = supportsEmbeddedContext;
	const composerBlocked = Boolean(threadError ?? catalog.bindError);

	const gitStatus = useGitStatus(threadId);
	const isGitRepo = gitStatus.data?.isRepo === true;
	const { setValue: setDraft, clear: clearDraft } = useComposerDraft(threadId);
	const [plainText, setPlainText] = useState("");
	const [hasContent, setHasContent] = useState(false);
	const [sending, setSending] = useState(false);
	const [mentionHighlight, setMentionHighlight] = useState(0);
	const [slashHighlight, setSlashHighlight] = useState(0);
	const [mentionDismissed, setMentionDismissed] = useState(false);
	const [slashDismissed, setSlashDismissed] = useState(false);
	const editorRef = useRef<ComposerPromptEditorHandle | null>(null);
	const restoredForThreadRef = useRef<string | null>(null);
	const submitStateRef = useRef({
		busy,
		stopping,
		sending,
		hasAgents,
		composerBlocked,
	});
	submitStateRef.current = {
		busy,
		stopping,
		sending,
		hasAgents,
		composerBlocked,
	};

	// restore persisted draft once per thread (do not depend on draftMessage —
	// setMessage triggers onChange → setDraft and would loop)
	useEffect(() => {
		if (restoredForThreadRef.current === threadId) return;
		restoredForThreadRef.current = threadId;
		const draft = useComposerDraftStore.getState().draftsByThread[threadId];
		const frame = requestAnimationFrame(() => {
			if (draft && draft.length > 0) {
				editorRef.current?.setMessage(draft);
				setHasContent(true);
			} else {
				editorRef.current?.clear();
				setPlainText("");
				setHasContent(false);
			}
		});
		return () => cancelAnimationFrame(frame);
	}, [threadId]);

	const triggerText = textForTriggers(plainText);

	const slashFilter = useMemo(() => {
		const match = triggerText.match(SLASH_TOKEN_PATTERN);
		return match?.[1] ?? null;
	}, [triggerText]);

	const slashMatches = useMemo(() => {
		if (slashFilter === null) return [];
		return filterSlashCommands(catalog.commands, slashFilter);
	}, [catalog.commands, slashFilter]);

	const atMention = useMemo(() => {
		if (!canAttachFiles) return null;
		const match = triggerText.match(AT_TOKEN_PATTERN);
		if (!match) return null;
		return match[1] ?? "";
	}, [canAttachFiles, triggerText]);

	const filesQuery = useSearchEntries(
		threadCwd,
		atMention ?? "",
		canAttachFiles && atMention !== null && (atMention?.length ?? 0) > 0
	);
	const filePaths = filesQuery.data?.entries.map((entry) => entry.path) ?? [];

	const placeholder = buildComposerPlaceholder({
		canAttachFiles,
		canPasteUrls,
		canSlash: catalog.commands.length > 0,
	});

	const filePathsKey = filePaths.join("\0");
	const slashMatchesKey = slashMatches
		.map((command) => command.name)
		.join("\0");

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset when token/results change
	useEffect(() => {
		setMentionHighlight(0);
		setMentionDismissed(false);
	}, [atMention, filePathsKey]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset when token/results change
	useEffect(() => {
		setSlashHighlight(0);
		setSlashDismissed(false);
	}, [slashFilter, slashMatchesKey]);

	function insertFileMention(path: string) {
		editorRef.current?.replaceAtTokenWithResource(
			path,
			resourceNameFromPath(path)
		);
	}

	function insertSlashCommand(commandName: string) {
		editorRef.current?.replaceSlashToken(commandName);
	}

	const submit = useCallback(async () => {
		const state = submitStateRef.current;
		if (
			state.stopping ||
			state.sending ||
			!state.hasAgents ||
			state.composerBlocked
		) {
			return;
		}
		const message = editorRef.current?.getMessage() ?? [];
		if (message.length === 0) return;

		setSending(true);
		try {
			await onSend(message);
			editorRef.current?.clear();
			setPlainText("");
			setHasContent(false);
			clearDraft();
		} finally {
			setSending(false);
		}
	}, [clearDraft, onSend]);

	const handleMentionKeys = useCallback(
		(key: ComposerCommandKey): boolean => {
			if (atMention === null || mentionDismissed) return false;
			if (key === "Escape") {
				setMentionDismissed(true);
				return true;
			}
			if (filePaths.length === 0) return false;
			if (key === "ArrowDown") {
				setMentionHighlight((index) => (index + 1) % filePaths.length);
				return true;
			}
			if (key === "ArrowUp") {
				setMentionHighlight(
					(index) => (index - 1 + filePaths.length) % filePaths.length
				);
				return true;
			}
			if (key === "Enter" || key === "Tab") {
				const path = filePaths[mentionHighlight] ?? filePaths[0];
				if (path) {
					editorRef.current?.replaceAtTokenWithResource(
						path,
						resourceNameFromPath(path)
					);
				}
				return true;
			}
			return false;
		},
		[atMention, filePaths, mentionDismissed, mentionHighlight]
	);

	const handleSlashKeys = useCallback(
		(key: ComposerCommandKey): boolean => {
			if (slashFilter === null || slashDismissed) return false;
			if (key === "Escape") {
				setSlashDismissed(true);
				return true;
			}
			if (slashMatches.length === 0) return false;
			if (key === "ArrowDown") {
				setSlashHighlight((index) => (index + 1) % slashMatches.length);
				return true;
			}
			if (key === "ArrowUp") {
				setSlashHighlight(
					(index) => (index - 1 + slashMatches.length) % slashMatches.length
				);
				return true;
			}
			if (key === "Enter" || key === "Tab") {
				const command = slashMatches[slashHighlight] ?? slashMatches[0];
				if (command) editorRef.current?.replaceSlashToken(command.name);
				return true;
			}
			return false;
		},
		[slashDismissed, slashFilter, slashMatches, slashHighlight]
	);

	const handleCommandKeyDown = useCallback(
		(key: ComposerCommandKey, _event: KeyboardEvent): boolean => {
			if (handleMentionKeys(key) || handleSlashKeys(key)) return true;
			if (key === "Enter") {
				submit().catch(() => undefined);
				return true;
			}
			return false;
		},
		[handleMentionKeys, handleSlashKeys, submit]
	);

	function handlePlainTextChange(next: string) {
		setPlainText(next);
		setHasContent(editorRef.current?.hasContent() ?? false);
		setDraft(editorRef.current?.getMessage() ?? []);

		const trigger = textForTriggers(next);
		if (canPasteUrls && TRAILING_URL_PATTERN.test(trigger)) {
			queueMicrotask(() => {
				editorRef.current?.absorbTrailingUrl();
			});
		}
	}

	function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
		if (!canPasteUrls) return;
		const pasted = event.clipboardData.getData("text").trim();
		if (!URL_IN_TEXT_PATTERN.test(pasted)) return;

		if (URL_PATTERN.test(pasted)) {
			event.preventDefault();
			editorRef.current?.insertResource(pasted, pasted);
		}
	}

	function renderComposerBody() {
		if (agentsLoading) {
			return <ComposerSkeleton />;
		}

		if (agentsQuery.isError) {
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

		if (agentsReady && !hasAgents) {
			return <ComposerUnavailable />;
		}

		return (
			<div className="group rounded-[22px] p-px transition-colors duration-200">
				<ComposerQueueChips threadId={threadId} />
				<div className="chat-composer-glass overflow-visible rounded-4xl border border-border transition-colors duration-200 has-focus-visible:border-ring/45">
					<div className="relative overflow-visible px-3 pt-3.5 pb-2 sm:px-4 sm:pt-4">
						<div className="relative overflow-visible">
							{slashFilter === null || slashDismissed ? null : (
								<SlashCommandAutocomplete
									activeIndex={slashHighlight}
									commands={catalog.commands}
									filter={slashFilter}
									onSelect={(command) => insertSlashCommand(command.name)}
								/>
							)}
							{atMention === null || mentionDismissed ? null : (
								<FileMentionAutocomplete
									activeIndex={mentionHighlight}
									filter={atMention}
									isError={filesQuery.isError}
									isLoading={
										atMention.length > 0 &&
										(filesQuery.isFetching || filesQuery.isPending)
									}
									needsQuery={atMention.length === 0}
									onSelect={insertFileMention}
									paths={filePaths}
									truncated={filesQuery.data?.truncated === true}
								/>
							)}
							<ComposerPromptEditor
								onCommandKeyDown={handleCommandKeyDown}
								onPaste={handlePaste}
								onPlainTextChange={handlePlainTextChange}
								placeholder={placeholder}
								ref={editorRef}
							/>
						</div>
					</div>

					<div
						className="flex min-w-0 flex-nowrap items-center justify-between gap-2 overflow-visible px-2.5 pb-2.5 sm:gap-0 sm:px-3 sm:pb-3"
						data-chat-composer-footer="true"
					>
						<ComposerFooterControls
							agents={agents}
							projectId={projectId}
							threadId={threadId}
						/>
						<div
							className="flex shrink-0 flex-nowrap items-center justify-end gap-2"
							data-chat-composer-actions="right"
						>
							<ComposerPrimaryAction
								busy={busy}
								canSend={hasContent && !composerBlocked}
								onStop={onStop}
								sending={sending}
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
							submit().catch(() => undefined);
						}}
					>
						{renderComposerBody()}
					</form>
				</div>
			</div>

			<div
				className={cn(
					"chat-composer-horizontal-inset chat-composer-lower-chrome relative z-10",
					isGitRepo
						? "bg-transparent! pb-[calc(env(safe-area-inset-bottom)+0.25rem)] dark:bg-transparent!"
						: "pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pb-[calc(env(safe-area-inset-bottom)+1rem)]"
				)}
			>
				{isGitRepo ? <ComposerBranchToolbar thread={thread} /> : null}
			</div>
		</div>
	);
}
