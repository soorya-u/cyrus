import type { ChatMessage } from "@cyrus/schemas/rtc/chat";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { cn } from "cnfast";
import {
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	$getSelection,
	$isParagraphNode,
	$isRangeSelection,
	$isTextNode,
	COMMAND_PRIORITY_HIGH,
	type EditorState,
	KEY_ARROW_DOWN_COMMAND,
	KEY_ARROW_UP_COMMAND,
	KEY_ENTER_COMMAND,
	KEY_ESCAPE_COMMAND,
	KEY_TAB_COMMAND,
	type LexicalNode,
	type ParagraphNode,
} from "lexical";
import {
	forwardRef,
	type MutableRefObject,
	type ClipboardEvent as ReactClipboardEvent,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
} from "react";
import {
	$createComposerResourceNode,
	$isComposerResourceNode,
	COMPOSER_CHIP_PLACEHOLDER,
	ComposerResourceNode,
} from "@/components/chat/composer/composer-resource-node";

const AT_TOKEN_END_PATTERN = /(?:^|\s)(@[\w./-]*)$/;
const SLASH_TOKEN_END_PATTERN = /(?:^|\s)(\/[\w./-]*)$/;
const TRAILING_URL_END_PATTERN = /(?:^|\s)(https?:\/\/\S+)(\s+)$/i;

function $ensureParagraph(): ParagraphNode {
	const root = $getRoot();
	const first = root.getFirstChild();
	if ($isParagraphNode(first)) return first;
	const paragraph = $createParagraphNode();
	root.append(paragraph);
	return paragraph;
}

/** Plain text with chips collapsed to a single placeholder (for @ / triggers). */
function $readPlainTextWithPlaceholders(): string {
	let out = "";

	const visit = (node: LexicalNode) => {
		if ($isComposerResourceNode(node)) {
			out += COMPOSER_CHIP_PLACEHOLDER;
			return;
		}
		if ($isTextNode(node)) {
			out += node.getTextContent();
			return;
		}
		if ("getChildren" in node) {
			for (const child of (
				node as { getChildren: () => LexicalNode[] }
			).getChildren()) {
				visit(child);
			}
		}
	};

	for (const [index, child] of $getRoot().getChildren().entries()) {
		if (index > 0) out += "\n";
		visit(child);
	}
	return out;
}

function $messageFromEditor(): ChatMessage {
	const blocks: ChatMessage = [];
	let textBuffer = "";

	function flushText() {
		const text = textBuffer;
		if (text.length > 0) blocks.push({ type: "text", text });
		textBuffer = "";
	}

	const visit = (node: LexicalNode) => {
		if ($isComposerResourceNode(node)) {
			flushText();
			blocks.push({
				type: "resource",
				uri: node.__uri,
				name: node.__name,
			});
			return;
		}
		if ($isTextNode(node)) {
			textBuffer += node.getTextContent();
			return;
		}
		if ("getChildren" in node) {
			for (const child of (
				node as { getChildren: () => LexicalNode[] }
			).getChildren()) {
				visit(child);
			}
		}
	};

	const paragraphs = $getRoot().getChildren();
	for (const [index, child] of paragraphs.entries()) {
		if (index > 0) textBuffer += "\n";
		visit(child);
	}
	flushText();
	return blocks;
}

function $insertResourceAtSelection(uri: string, name?: string) {
	const selection = $getSelection();
	const resource = $createComposerResourceNode(uri, name);
	const trailing = $createTextNode(" ");

	if ($isRangeSelection(selection)) {
		selection.insertNodes([resource, trailing]);
		trailing.selectEnd();
		return;
	}

	const paragraph = $ensureParagraph();
	paragraph.append(resource, trailing);
	trailing.selectEnd();
}

function $deleteBackwardChars(count: number) {
	const selection = $getSelection();
	if (!$isRangeSelection(selection)) return;
	for (let index = 0; index < count; index += 1) {
		selection.deleteCharacter(true);
	}
}

function $setMessage(message: ChatMessage): void {
	const root = $getRoot();
	root.clear();
	const paragraph = $createParagraphNode();
	for (const block of message) {
		if (block.type === "text") {
			if (block.text) paragraph.append($createTextNode(block.text));
			continue;
		}
		paragraph.append($createComposerResourceNode(block.uri, block.name));
		paragraph.append($createTextNode(" "));
	}
	root.append(paragraph);
	if (message.length > 0) paragraph.selectEnd();
}

export type ComposerPromptEditorHandle = {
	focus: () => void;
	clear: () => void;
	setPlainText: (text: string) => void;
	setMessage: (message: ChatMessage) => void;
	getPlainText: () => string;
	getMessage: () => ChatMessage;
	hasContent: () => boolean;
	replaceAtTokenWithResource: (uri: string, name?: string) => boolean;
	insertResource: (uri: string, name?: string) => void;
	replaceSlashToken: (commandName: string) => boolean;
	absorbTrailingUrl: () => boolean;
};

export type ComposerCommandKey =
	| "ArrowDown"
	| "ArrowUp"
	| "Enter"
	| "Tab"
	| "Escape";

type ComposerPromptEditorProps = {
	placeholder: string;
	className?: string;
	onPlainTextChange: (text: string) => void;
	onCommandKeyDown?: (key: ComposerCommandKey, event: KeyboardEvent) => boolean;
	onPaste?: (event: ReactClipboardEvent<HTMLDivElement>) => void;
};

function CommandKeyPlugin({
	onCommandKeyDown,
}: {
	onCommandKeyDown?: (key: ComposerCommandKey, event: KeyboardEvent) => boolean;
}) {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		if (!onCommandKeyDown) return;

		const handle = (
			key: ComposerCommandKey,
			event: KeyboardEvent | null
		): boolean => {
			if (!event) return false;
			return onCommandKeyDown(key, event);
		};

		const unsubs = [
			editor.registerCommand(
				KEY_ARROW_DOWN_COMMAND,
				(event) => {
					if (handle("ArrowDown", event)) {
						event?.preventDefault();
						return true;
					}
					return false;
				},
				COMMAND_PRIORITY_HIGH
			),
			editor.registerCommand(
				KEY_ARROW_UP_COMMAND,
				(event) => {
					if (handle("ArrowUp", event)) {
						event?.preventDefault();
						return true;
					}
					return false;
				},
				COMMAND_PRIORITY_HIGH
			),
			editor.registerCommand(
				KEY_ENTER_COMMAND,
				(event) => {
					if (event?.shiftKey) return false;
					if (handle("Enter", event)) {
						event?.preventDefault();
						return true;
					}
					return false;
				},
				COMMAND_PRIORITY_HIGH
			),
			editor.registerCommand(
				KEY_TAB_COMMAND,
				(event) => {
					if (handle("Tab", event)) {
						event?.preventDefault();
						return true;
					}
					return false;
				},
				COMMAND_PRIORITY_HIGH
			),
			editor.registerCommand(
				KEY_ESCAPE_COMMAND,
				(event) => {
					if (handle("Escape", event)) {
						event?.preventDefault();
						return true;
					}
					return false;
				},
				COMMAND_PRIORITY_HIGH
			),
		];

		return () => {
			for (const unsub of unsubs) unsub();
		};
	}, [editor, onCommandKeyDown]);

	return null;
}

function EditorHandlePlugin({
	handleRef,
}: {
	handleRef: MutableRefObject<ComposerPromptEditorHandle | null>;
}) {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		handleRef.current = {
			focus: () => {
				editor.focus();
			},
			clear: () => {
				editor.update(() => {
					const root = $getRoot();
					root.clear();
					root.append($createParagraphNode());
				});
			},
			setPlainText: (text) => {
				editor.update(() => {
					$setMessage(text ? [{ type: "text", text }] : []);
				});
			},
			setMessage: (message) => {
				editor.update(() => {
					$setMessage(message);
				});
			},
			getPlainText: () => {
				let text = "";
				editor.getEditorState().read(() => {
					text = $getRoot().getTextContent();
				});
				return text;
			},
			getMessage: () => {
				let message: ChatMessage = [];
				editor.getEditorState().read(() => {
					message = $messageFromEditor();
				});
				return message;
			},
			hasContent: () => {
				let ok = false;
				editor.getEditorState().read(() => {
					ok = $messageFromEditor().length > 0;
				});
				return ok;
			},
			insertResource: (uri, name) => {
				editor.update(() => {
					$getRoot().selectEnd();
					$insertResourceAtSelection(uri, name);
				});
				editor.focus();
			},
			replaceAtTokenWithResource: (uri, name) => {
				let applied = false;
				editor.update(() => {
					const text = $readPlainTextWithPlaceholders();
					const match = text.match(AT_TOKEN_END_PATTERN);
					if (!match?.[1]) return;
					$getRoot().selectEnd();
					$deleteBackwardChars(match[1].length);
					$insertResourceAtSelection(uri, name);
					applied = true;
				});
				if (applied) editor.focus();
				return applied;
			},
			replaceSlashToken: (commandName) => {
				let applied = false;
				editor.update(() => {
					const text = $readPlainTextWithPlaceholders();
					const match = text.match(SLASH_TOKEN_END_PATTERN);
					if (!match?.[1]) return;
					$getRoot().selectEnd();
					$deleteBackwardChars(match[1].length);
					const selection = $getSelection();
					const next = $createTextNode(`/${commandName} `);
					if ($isRangeSelection(selection)) {
						selection.insertNodes([next]);
						next.selectEnd();
					} else {
						$ensureParagraph().append(next);
						next.selectEnd();
					}
					applied = true;
				});
				if (applied) editor.focus();
				return applied;
			},
			absorbTrailingUrl: () => {
				let applied = false;
				editor.update(() => {
					const text = $readPlainTextWithPlaceholders().replaceAll(
						COMPOSER_CHIP_PLACEHOLDER,
						""
					);
					const match = text.match(TRAILING_URL_END_PATTERN);
					if (!match?.[1]) return;
					const url = match[1];
					const deleteCount = url.length + (match[2]?.length ?? 0);
					$getRoot().selectEnd();
					$deleteBackwardChars(deleteCount);
					$insertResourceAtSelection(url, url);
					applied = true;
				});
				if (applied) editor.focus();
				return applied;
			},
		};
	}, [editor, handleRef]);

	return null;
}

const ComposerPromptEditorInner = forwardRef<
	ComposerPromptEditorHandle,
	ComposerPromptEditorProps
>(function ComposerPromptEditorInner(
	{ placeholder, className, onPlainTextChange, onCommandKeyDown, onPaste },
	ref
) {
	const handleRef = useRef<ComposerPromptEditorHandle | null>(null);

	useImperativeHandle(ref, () => ({
		focus: () => handleRef.current?.focus(),
		clear: () => handleRef.current?.clear(),
		setPlainText: (text) => {
			handleRef.current?.setPlainText(text);
		},
		setMessage: (message) => {
			handleRef.current?.setMessage(message);
		},
		getPlainText: () => handleRef.current?.getPlainText() ?? "",
		getMessage: () => handleRef.current?.getMessage() ?? [],
		hasContent: () => handleRef.current?.hasContent() ?? false,
		insertResource: (uri, name) => {
			handleRef.current?.insertResource(uri, name);
		},
		replaceAtTokenWithResource: (uri, name) =>
			handleRef.current?.replaceAtTokenWithResource(uri, name) ?? false,
		replaceSlashToken: (commandName) =>
			handleRef.current?.replaceSlashToken(commandName) ?? false,
		absorbTrailingUrl: () => handleRef.current?.absorbTrailingUrl() ?? false,
	}));

	function handleChange(editorState: EditorState) {
		editorState.read(() => {
			onPlainTextChange($readPlainTextWithPlaceholders());
		});
	}

	return (
		<div className="relative">
			<PlainTextPlugin
				contentEditable={
					<ContentEditable
						aria-placeholder={placeholder}
						className={cn(
							"wrap-break-word block max-h-50 min-h-17.5 w-full overflow-y-auto whitespace-pre-wrap bg-transparent text-[16px] text-foreground leading-relaxed outline-none sm:text-[14px]",
							className
						)}
						onPaste={onPaste}
						placeholder={<span />}
					/>
				}
				ErrorBoundary={LexicalErrorBoundary}
				placeholder={
					<div className="pointer-events-none absolute inset-0 text-[16px] text-muted-foreground/35 leading-relaxed sm:text-[14px]">
						{placeholder}
					</div>
				}
			/>
			<OnChangePlugin ignoreSelectionChange onChange={handleChange} />
			<HistoryPlugin />
			<CommandKeyPlugin onCommandKeyDown={onCommandKeyDown} />
			<EditorHandlePlugin handleRef={handleRef} />
		</div>
	);
});

export const ComposerPromptEditor = forwardRef<
	ComposerPromptEditorHandle,
	ComposerPromptEditorProps
>(function ComposerPromptEditor(props, ref) {
	const initialConfig = useMemo(
		() => ({
			namespace: "cyrus-composer-editor",
			editable: true,
			nodes: [ComposerResourceNode],
			onError: (error: Error) => {
				throw error;
			},
			editorState: () => {
				$getRoot().append($createParagraphNode());
			},
		}),
		[]
	);

	return (
		<LexicalComposer initialConfig={initialConfig}>
			<ComposerPromptEditorInner {...props} ref={ref} />
		</LexicalComposer>
	);
});
