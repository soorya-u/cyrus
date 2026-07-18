import { useSearchEntries } from "@cyrus/hooks/queries/use-search-entries";
import {
	useComposerDraft,
	useComposerDraftStore,
} from "@cyrus/hooks/stores/composer-draft";
import type { AvailableCommand } from "@cyrus/schemas/rtc/catalog";
import type { ChatMessage } from "@cyrus/schemas/rtc/chat";
import { inferProjectTitleFromPath } from "@cyrus/utils/path";
import type { Result } from "better-result";
import {
	type ClipboardEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type {
	ComposerCommandKey,
	ComposerPromptEditorHandle,
} from "@/components/chat/composer/composer-prompt-editor";
import { COMPOSER_CHIP_PLACEHOLDER } from "@/components/chat/composer/composer-resource-node";
import { filterSlashCommands } from "@/utils/filters";

const SLASH_TOKEN_PATTERN = /(?:^|\s)\/([\w./-]*)$/;
const AT_TOKEN_PATTERN = /(?:^|\s)@([\w./-]*)$/;
const URL_PATTERN = /^https?:\/\/\S+$/i;
const TRAILING_URL_PATTERN = /(?:^|\s)(https?:\/\/\S+)(\s+)$/i;
const URL_IN_TEXT_PATTERN = /https?:\/\/\S+/i;

type UseComposerEditorOptions = {
	threadId: string;
	threadCwd: string;
	commands: AvailableCommand[];
	displayAgent: string;
	canAttachFiles: boolean;
	canPasteUrls: boolean;
	editorReady: boolean;
	hasAgents: boolean;
	stopping: boolean;
	composerBlocked: boolean;
	onSend: (message: ChatMessage) => Promise<Result<void, Error>>;
};

function textForTriggers(plainText: string): string {
	return plainText.replaceAll(COMPOSER_CHIP_PLACEHOLDER, "");
}

function buildPlaceholder(options: {
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

export function useComposerEditor({
	threadId,
	threadCwd,
	commands,
	displayAgent,
	canAttachFiles,
	canPasteUrls,
	editorReady,
	hasAgents,
	stopping,
	composerBlocked,
	onSend,
}: UseComposerEditorOptions) {
	const { setValue: setDraft, clear: clearDraft } = useComposerDraft(threadId);
	const [plainText, setPlainText] = useState("");
	const [hasContent, setHasContent] = useState(false);
	const [sending, setSending] = useState(false);
	const [mentionHighlight, setMentionHighlight] = useState(0);
	const [slashHighlight, setSlashHighlight] = useState(0);
	const [mentionDismissed, setMentionDismissed] = useState(false);
	const [slashDismissed, setSlashDismissed] = useState(false);
	const editorRef = useRef<ComposerPromptEditorHandle | null>(null);
	const ignoringEmptyDraftWriteRef = useRef(false);
	const draftRestoreGenerationRef = useRef(0);
	const submitStateRef = useRef({
		stopping,
		sending,
		hasAgents,
		composerBlocked,
	});
	submitStateRef.current = {
		stopping,
		sending,
		hasAgents,
		composerBlocked,
	};

	// Arm before Lexical's mount-time empty onChange can clear localStorage.
	// biome-ignore lint/correctness/useExhaustiveDependencies: re-arm on thread switch as well as editorReady
	useLayoutEffect(() => {
		if (!editorReady) return;
		ignoringEmptyDraftWriteRef.current = true;
	}, [editorReady, threadId]);

	// Restore after the editor is mounted rather than while skeleton/interactive
	// content occupies the composer.
	useEffect(() => {
		if (!editorReady) return;

		const generation = ++draftRestoreGenerationRef.current;
		let cancelled = false;
		let attempts = 0;

		const restore = () => {
			if (cancelled || generation !== draftRestoreGenerationRef.current) return;
			const editor = editorRef.current;
			if (!editor) {
				if (attempts++ < 60) requestAnimationFrame(restore);
				return;
			}

			const draft = useComposerDraftStore.getState().draftsByThread[threadId];
			if (draft && draft.length > 0) {
				editor.setMessage(draft);
				setHasContent(true);
			} else {
				editor.clear();
				setPlainText("");
				setHasContent(false);
			}
			ignoringEmptyDraftWriteRef.current = false;
		};

		restore();
		return () => {
			cancelled = true;
		};
	}, [editorReady, threadId]);

	const triggerText = textForTriggers(plainText);
	const slashFilter = useMemo(
		() => triggerText.match(SLASH_TOKEN_PATTERN)?.[1] ?? null,
		[triggerText]
	);
	const slashMatches = useMemo(
		() =>
			slashFilter === null ? [] : filterSlashCommands(commands, slashFilter),
		[commands, slashFilter]
	);
	const atMention = useMemo(() => {
		if (!canAttachFiles) return null;
		const match = triggerText.match(AT_TOKEN_PATTERN);
		return match ? (match[1] ?? "") : null;
	}, [canAttachFiles, triggerText]);

	const filesQuery = useSearchEntries(
		threadCwd,
		atMention ?? "",
		canAttachFiles && atMention !== null && atMention.length > 0
	);
	const filePaths = filesQuery.data?.entries.map((entry) => entry.path) ?? [];
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

	const restoreMessage = useCallback(
		(message: ChatMessage) => {
			editorRef.current?.setMessage(message);
			setHasContent(true);
			setDraft(message);
		},
		[setDraft]
	);

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
		editorRef.current?.clear();
		setPlainText("");
		setHasContent(false);
		clearDraft();
		try {
			if (!displayAgent) {
				restoreMessage(message);
				return;
			}
			const result = await onSend(message);
			if (result.isErr()) restoreMessage(message);
		} catch {
			restoreMessage(message);
		} finally {
			setSending(false);
		}
	}, [clearDraft, displayAgent, onSend, restoreMessage]);

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
						inferProjectTitleFromPath(path)
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
		(key: ComposerCommandKey): boolean => {
			if (handleMentionKeys(key) || handleSlashKeys(key)) return true;
			if (key !== "Enter") return false;
			submit().catch(() => undefined);
			return true;
		},
		[handleMentionKeys, handleSlashKeys, submit]
	);

	function handlePlainTextChange(next: string) {
		setPlainText(next);
		const message = editorRef.current?.getMessage() ?? [];
		setHasContent(editorRef.current?.hasContent() ?? false);
		if (message.length === 0 && ignoringEmptyDraftWriteRef.current) return;
		setDraft(message);

		if (canPasteUrls && TRAILING_URL_PATTERN.test(textForTriggers(next))) {
			queueMicrotask(() => editorRef.current?.absorbTrailingUrl());
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

	return {
		editorRef,
		hasContent,
		sending,
		submit,
		placeholder: buildPlaceholder({
			canAttachFiles,
			canPasteUrls,
			canSlash: commands.length > 0,
		}),
		handlers: {
			commandKeyDown: handleCommandKeyDown,
			paste: handlePaste,
			plainTextChange: handlePlainTextChange,
		},
		mention: {
			filter: atMention,
			dismissed: mentionDismissed,
			activeIndex: mentionHighlight,
			filesQuery,
			paths: filePaths,
			select: (path: string) =>
				editorRef.current?.replaceAtTokenWithResource(
					path,
					inferProjectTitleFromPath(path)
				),
		},
		slash: {
			filter: slashFilter,
			dismissed: slashDismissed,
			activeIndex: slashHighlight,
			select: (commandName: string) =>
				editorRef.current?.replaceSlashToken(commandName),
		},
	};
}
