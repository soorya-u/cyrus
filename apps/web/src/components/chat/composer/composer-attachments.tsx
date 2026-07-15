import type { PromptInputBlock } from "@cyrus/schemas/rtc/chat";
import { cn } from "cnfast";
import { FileIcon, FolderIcon, LinkIcon, XIcon } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";

const HTTP_URI_PATTERN = /^https?:\/\//i;

export type ComposerAttachment = Extract<
	PromptInputBlock,
	{ type: "resource" }
> & { id: string };

let nextAttachmentId = 0;

export function createAttachment(
	uri: string,
	name?: string
): ComposerAttachment {
	nextAttachmentId += 1;
	return {
		id: `attachment-${nextAttachmentId}`,
		type: "resource",
		uri,
		name,
	};
}

function attachmentKindLabel(isUrl: boolean, isDirectory: boolean): string {
	if (isUrl) return "URL";
	if (isDirectory) return "Folder";
	return "File";
}

function AttachmentKindIcon({
	isUrl,
	isDirectory,
}: {
	isUrl: boolean;
	isDirectory: boolean;
}) {
	if (isUrl) {
		return <LinkIcon className="size-3 shrink-0 text-muted-foreground" />;
	}
	if (isDirectory) {
		return <FolderIcon className="size-3 shrink-0 text-muted-foreground" />;
	}
	return <FileIcon className="size-3 shrink-0 text-muted-foreground" />;
}

export function InlineAttachmentChip({
	attachment,
	onRemove,
	onNavigateToText,
}: {
	attachment: ComposerAttachment;
	onRemove: (id: string) => void;
	onNavigateToText?: () => void;
}) {
	const isUrl = HTTP_URI_PATTERN.test(attachment.uri);
	const isDirectory = !isUrl && attachment.uri.endsWith("/");
	const label = attachment.name ?? attachment.uri;
	const kind = attachmentKindLabel(isUrl, isDirectory);

	function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
		if (event.key === "Backspace" || event.key === "Delete") {
			event.preventDefault();
			event.stopPropagation();
			onRemove(attachment.id);
			return;
		}
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			onNavigateToText?.();
		}
	}

	return (
		<button
			aria-label={`${kind} ${label}. Press Backspace to remove.`}
			className="inline-flex max-w-[min(100%,14rem)] shrink-0 items-center gap-0.5 rounded-md border border-border/80 bg-muted/50 py-0.5 pr-0.5 pl-1.5 align-middle text-xs leading-none outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
			data-composer-attachment-id={attachment.id}
			onKeyDown={handleKeyDown}
			type="button"
		>
			<AttachmentKindIcon isDirectory={isDirectory} isUrl={isUrl} />
			<span className="truncate font-mono text-[11px]">{label}</span>
			<span
				aria-hidden="true"
				className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					onRemove(attachment.id);
				}}
				onKeyDown={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						event.stopPropagation();
						onRemove(attachment.id);
					}
				}}
				role="presentation"
			>
				<XIcon className="size-3" />
			</span>
		</button>
	);
}

export function FileMentionAutocomplete({
	paths,
	filter,
	onSelect,
	activeIndex = 0,
	isLoading = false,
	isError = false,
	needsQuery = false,
	truncated = false,
}: {
	paths: string[];
	filter: string;
	onSelect: (path: string) => void;
	activeIndex?: number;
	isLoading?: boolean;
	isError?: boolean;
	needsQuery?: boolean;
	truncated?: boolean;
}) {
	const listRef = useRef<HTMLUListElement | null>(null);
	const pathsKey = paths.join("\0");

	useEffect(() => {
		const active = listRef.current?.querySelector<HTMLElement>(
			'[data-active="true"]'
		);
		active?.scrollIntoView({ block: "nearest" });
	}, [activeIndex, pathsKey]);

	let body: ReactNode;
	if (needsQuery) {
		body = (
			<div className="px-3 py-2.5 text-muted-foreground text-xs">
				Type to search files
			</div>
		);
	} else if (isLoading) {
		body = (
			<div className="flex items-center gap-2 px-3 py-2.5 text-muted-foreground text-xs">
				<Spinner className="size-3.5" />
				<span>Searching files…</span>
			</div>
		);
	} else if (isError) {
		body = (
			<div className="px-3 py-2.5 text-destructive text-xs">
				Could not search files for this thread
			</div>
		);
	} else if (paths.length === 0) {
		body = (
			<div className="px-3 py-2.5 text-muted-foreground text-xs">
				{`No files matching “@${filter}”`}
			</div>
		);
	} else {
		body = (
			<>
				<ul className="max-h-48 overflow-y-auto py-1" ref={listRef}>
					{paths.map((path, index) => {
						const isDirectory = path.endsWith("/");
						const isActive = index === activeIndex;
						return (
							<li key={path}>
								<button
									className={cn(
										"flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
										isActive ? "bg-accent" : "hover:bg-accent"
									)}
									data-active={isActive ? "true" : undefined}
									onMouseDown={(event) => {
										event.preventDefault();
										onSelect(path);
									}}
									type="button"
								>
									{isDirectory ? (
										<FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
									) : (
										<FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
									)}
									<span className="truncate font-mono text-xs">{path}</span>
								</button>
							</li>
						);
					})}
				</ul>
				{truncated ? (
					<div className="border-border border-t px-3 py-1.5 text-[11px] text-muted-foreground">
						Showing top matches — refine your search for more
					</div>
				) : null}
			</>
		);
	}

	return (
		<div className="absolute inset-x-0 bottom-full z-30 mb-1 overflow-hidden rounded-xl border border-border bg-popover shadow-md">
			{body}
		</div>
	);
}
