import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$applyNodeReplacement,
	$getNodeByKey,
	DecoratorNode,
	type LexicalNode,
	type NodeKey,
	type SerializedLexicalNode,
	type Spread,
} from "lexical";
import { FileIcon, LinkIcon, XIcon } from "lucide-react";
import type { ReactElement } from "react";

/** Single collapsed character representing an inline resource chip (t3code-style). */
export const COMPOSER_CHIP_PLACEHOLDER = "\uFFFC";

const HTTP_URI_PATTERN = /^https?:\/\//i;
const PATH_SPLIT_PATTERN = /[/\\]/;
const TRAILING_SLASH_PATTERN = /\/+$/;

type SerializedComposerResourceNode = Spread<
	{
		uri: string;
		name?: string;
		type: "composer-resource";
		version: 1;
	},
	SerializedLexicalNode
>;

function basename(path: string): string {
	const normalized = path.replace(TRAILING_SLASH_PATTERN, "");
	const parts = normalized.split(PATH_SPLIT_PATTERN);
	return parts.at(-1) || path;
}

function ResourceChipView({
	uri,
	name,
	nodeKey,
}: {
	uri: string;
	name?: string;
	nodeKey: NodeKey;
}) {
	const [editor] = useLexicalComposerContext();
	const isUrl = HTTP_URI_PATTERN.test(uri);
	const label = name ?? basename(uri);

	function remove() {
		editor.update(() => {
			const node = $getNodeByKey(nodeKey);
			if ($isComposerResourceNode(node)) node.remove();
		});
		editor.focus();
	}

	return (
		<span
			className="mx-0.5 inline-flex max-w-[min(100%,14rem)] items-center gap-0.5 rounded-md border border-border/80 bg-muted/50 py-0.5 pr-0.5 pl-1.5 align-middle text-xs leading-none"
			contentEditable={false}
			data-composer-resource-chip="true"
			spellCheck={false}
		>
			{isUrl ? (
				<LinkIcon className="size-3 shrink-0 text-muted-foreground" />
			) : (
				<FileIcon className="size-3 shrink-0 text-muted-foreground" />
			)}
			<span className="truncate font-mono text-[11px]">{label}</span>
			<button
				aria-label="Remove attachment"
				className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					remove();
				}}
				onMouseDown={(event) => event.preventDefault()}
				type="button"
			>
				<XIcon className="size-3" />
			</button>
		</span>
	);
}

export class ComposerResourceNode extends DecoratorNode<ReactElement> {
	__uri: string;
	__name?: string;

	static override getType(): string {
		return "composer-resource";
	}

	static override clone(node: ComposerResourceNode): ComposerResourceNode {
		return new ComposerResourceNode(node.__uri, node.__name, node.__key);
	}

	static override importJSON(
		serializedNode: SerializedComposerResourceNode
	): ComposerResourceNode {
		return $createComposerResourceNode(
			serializedNode.uri,
			serializedNode.name
		).updateFromJSON(serializedNode);
	}

	constructor(uri: string, name?: string, key?: NodeKey) {
		super(key);
		this.__uri = uri;
		this.__name = name;
	}

	override exportJSON(): SerializedComposerResourceNode {
		return {
			...super.exportJSON(),
			uri: this.__uri,
			name: this.__name,
			type: "composer-resource",
			version: 1,
		};
	}

	override createDOM(): HTMLElement {
		const dom = document.createElement("span");
		dom.className = "inline-flex align-middle leading-none";
		return dom;
	}

	override updateDOM(): false {
		return false;
	}

	override getTextContent(): string {
		return `@${this.__uri}`;
	}

	/** Keep chips one unit for caret math; copy still uses full `getTextContent()`. */
	override getTextContentSize(): number {
		return 1;
	}

	override isInline(): true {
		return true;
	}

	override decorate(): ReactElement {
		return (
			<ResourceChipView
				name={this.__name}
				nodeKey={this.getKey()}
				uri={this.__uri}
			/>
		);
	}
}

export function $createComposerResourceNode(
	uri: string,
	name?: string
): ComposerResourceNode {
	return $applyNodeReplacement(new ComposerResourceNode(uri, name));
}

export function $isComposerResourceNode(
	node: LexicalNode | null | undefined
): node is ComposerResourceNode {
	return node instanceof ComposerResourceNode;
}
