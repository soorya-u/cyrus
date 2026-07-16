import { cn } from "cnfast";
import { FileIcon, FolderIcon } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";

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

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll when selection or result set changes
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
