import type { Thread, ThreadStatus } from "@cyrus/hooks/types";
import { relativeTime } from "@cyrus/utils/time";
import { cn } from "cnfast";
import { GitBranchIcon, Trash2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";

const STATUS_TONES: Record<
	ThreadStatus,
	{ dot: string; text: string; bg: string }
> = {
	running: {
		dot: "bg-orange-500",
		text: "text-orange-600 dark:text-orange-400",
		bg: "bg-orange-500/12",
	},
	ready: {
		dot: "bg-emerald-500",
		text: "text-emerald-600 dark:text-emerald-400",
		bg: "bg-emerald-500/12",
	},
	starting: {
		dot: "bg-blue-500",
		text: "text-blue-600 dark:text-blue-400",
		bg: "bg-blue-500/12",
	},
	error: {
		dot: "bg-red-500",
		text: "text-red-600 dark:text-red-400",
		bg: "bg-red-500/12",
	},
	idle: {
		dot: "bg-neutral-400",
		text: "text-neutral-500 dark:text-neutral-400",
		bg: "bg-neutral-500/10",
	},
};

function ThreadStatusPill({ status }: { status: ThreadStatus }) {
	const tone = STATUS_TONES[status];
	return (
		<span
			className={cn(
				"size-1.5 rounded-full",
				tone.dot,
				status === "running" && "animate-pulse"
			)}
		/>
	);
}

export function ThreadRow({
	thread,
	isActive,
	onSelect,
	onDelete,
	onRename,
	variant = "list",
}: {
	thread: Thread;
	isActive: boolean;
	onSelect: (id: string) => void;
	onDelete: (id: string) => void;
	onRename: (id: string, title: string) => void;
	variant?: "list" | "sub";
}) {
	const [renaming, setRenaming] = useState(false);
	const [draft, setDraft] = useState(thread.title);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (renaming && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [renaming]);

	const isRunning = thread.status === "running";
	const timestamp = relativeTime(
		thread.latestUserMessageAt ?? thread.updatedAt ?? thread.createdAt
	);

	if (variant === "sub") {
		return (
			<button
				className={cn(
					"group/sub flex h-7 w-full min-w-0 -translate-x-px cursor-pointer items-center gap-1.5 overflow-hidden rounded-lg px-2 text-left text-xs outline-hidden ring-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2",
					isActive &&
						"bg-sidebar-accent font-medium text-sidebar-accent-foreground"
				)}
				onClick={() => onSelect(thread.id)}
				onDoubleClick={() => {
					setDraft(thread.title);
					setRenaming(true);
				}}
				type="button"
			>
				<ThreadStatusPill status={thread.status} />
				{renaming ? (
					<input
						className="min-w-0 flex-1 truncate rounded border border-ring bg-transparent px-0.5 text-xs outline-none"
						onBlur={() => {
							onRename(thread.id, draft.trim() || thread.title);
							setRenaming(false);
						}}
						onChange={(event) => setDraft(event.target.value)}
						onClick={(event) => event.stopPropagation()}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								onRename(thread.id, draft.trim() || thread.title);
								setRenaming(false);
							} else if (event.key === "Escape") {
								event.preventDefault();
								setRenaming(false);
							}
						}}
						ref={inputRef}
						value={draft}
					/>
				) : (
					<span className="min-w-0 flex-1 truncate">{thread.title}</span>
				)}
				<span
					className={cn(
						"ml-auto shrink-0 text-[10px] tabular-nums",
						isActive ? "text-foreground/70" : "text-muted-foreground/50"
					)}
				>
					{timestamp}
				</span>
			</button>
		);
	}

	return (
		<li
			className={cn(
				"group/sub relative isolate flex w-full items-center rounded-md transition-colors",
				isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
			)}
		>
			<button
				className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-left"
				onClick={() => onSelect(thread.id)}
				onDoubleClick={() => {
					setDraft(thread.title);
					setRenaming(true);
				}}
				type="button"
			>
				<ThreadStatusPill status={thread.status} />
				{renaming ? (
					<input
						className="min-w-0 flex-1 truncate rounded border border-ring bg-transparent px-0.5 text-xs outline-none"
						onBlur={() => {
							onRename(thread.id, draft.trim() || thread.title);
							setRenaming(false);
						}}
						onChange={(event) => setDraft(event.target.value)}
						onClick={(event) => event.stopPropagation()}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								onRename(thread.id, draft.trim() || thread.title);
								setRenaming(false);
							} else if (event.key === "Escape") {
								event.preventDefault();
								setRenaming(false);
							}
						}}
						ref={inputRef}
						value={draft}
					/>
				) : (
					<span className="min-w-0 flex-1 truncate text-xs">
						{thread.title}
					</span>
				)}
			</button>
			<div className="ml-auto flex shrink-0 items-center gap-1.5 pr-1.5">
				{thread.branch && (
					<Tooltip>
						<TooltipTrigger
							render={
								<span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/70">
									<GitBranchIcon className="size-3" />
								</span>
							}
						/>
						<TooltipPopup side="top">{thread.branch}</TooltipPopup>
					</Tooltip>
				)}
				{confirmDelete ? (
					<button
						className="inline-flex h-5 cursor-pointer items-center rounded-md bg-destructive/12 px-2 font-medium text-[10px] text-destructive hover:bg-destructive/18"
						onClick={(event) => {
							event.stopPropagation();
							onDelete(thread.id);
						}}
						type="button"
					>
						Confirm
					</button>
				) : (
					!isRunning && (
						<button
							aria-label={`Delete ${thread.title}`}
							className={cn(
								"inline-flex size-5 cursor-pointer items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground",
								"opacity-0 transition-opacity group-hover/sub:opacity-100 max-sm:opacity-100"
							)}
							onClick={(event) => {
								event.stopPropagation();
								setConfirmDelete(true);
							}}
							type="button"
						>
							<Trash2Icon className="size-3.5" />
						</button>
					)
				)}
				<span
					className={cn(
						"text-[10px] tabular-nums",
						isActive ? "text-foreground/70" : "text-muted-foreground/50"
					)}
				>
					{timestamp}
				</span>
			</div>
		</li>
	);
}
