import { useGitFile } from "@cyrus/hooks/queries/use-git";
import { File } from "@pierre/diffs/react";
import { ArrowLeftIcon } from "lucide-react";
import { FILE_VIEW_OPTIONS } from "@/components/chat/workspace/patch-diff-options";
import { ScrollArea } from "@/components/ui/scroll-area";

const UNPREVIEWABLE_MESSAGE = {
	binary: "Binary file — can't preview.",
	too_large: "File is too large to preview.",
} as const;

function Message({ children }: { children: React.ReactNode }) {
	return (
		<p className="px-3 py-8 text-center text-muted-foreground/70 text-xs">
			{children}
		</p>
	);
}

export function FilePreview({
	threadId,
	path,
	onClose,
}: {
	threadId: string;
	path: string;
	onClose: () => void;
}) {
	const query = useGitFile(threadId, path);

	let body: React.ReactNode;
	if (query.isLoading) {
		body = <Message>Loading file…</Message>;
	} else if (query.isError || !query.data) {
		body = <Message>Unable to read this file.</Message>;
	} else if (query.data.kind === "unpreviewable") {
		body = <Message>{UNPREVIEWABLE_MESSAGE[query.data.reason]}</Message>;
	} else {
		body = (
			<File
				file={{ name: path, contents: query.data.contents }}
				options={FILE_VIEW_OPTIONS}
			/>
		);
	}

	return (
		<div className="flex h-full w-full flex-col">
			<div className="flex items-center gap-2 border-border border-b px-2 py-2">
				<button
					aria-label="Back to files"
					className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
					onClick={onClose}
					type="button"
				>
					<ArrowLeftIcon className="size-4" />
				</button>
				<span className="truncate font-mono text-xs" title={path}>
					{path}
				</span>
			</div>
			<ScrollArea className="min-h-0 flex-1">
				<div className="diff-render-surface min-h-full p-2">{body}</div>
			</ScrollArea>
		</div>
	);
}
