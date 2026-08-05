import type { Thread } from "@cyrus/schemas/rtc/threads";
import { relativeTime } from "@cyrus/utils/time";
import { cn } from "cnfast";
import { Trash2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
	onRename: (id: string, name: string) => void;
	variant?: "list" | "sub";
}) {
	const [renaming, setRenaming] = useState(false);
	const [draft, setDraft] = useState(thread.name);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (renaming && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [renaming]);

	const timestamp = relativeTime(thread.updatedAt ?? thread.createdAt);

	if (variant === "sub") {
		return (
			<div
				className={cn(
					"group/sub flex h-7 w-full min-w-0 -translate-x-px cursor-pointer items-center gap-1.5 overflow-hidden rounded-lg pl-2 text-xs outline-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
					isActive &&
						"bg-sidebar-accent font-medium text-sidebar-accent-foreground"
				)}
			>
				{renaming ? (
					<input
						className="min-w-0 flex-1 truncate rounded border border-ring bg-transparent px-0.5 text-xs outline-none"
						onBlur={() => {
							onRename(thread.id, draft.trim() || thread.name);
							setRenaming(false);
						}}
						onChange={(event) => setDraft(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								onRename(thread.id, draft.trim() || thread.name);
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
					<button
						className="flex min-w-0 flex-1 items-center overflow-hidden text-left outline-hidden focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
						onClick={() => onSelect(thread.id)}
						onDoubleClick={() => {
							setDraft(thread.name);
							setRenaming(true);
						}}
						type="button"
					>
						<span className="min-w-0 flex-1 truncate">{thread.name}</span>
					</button>
				)}
				<div className="ml-auto flex shrink-0 items-center gap-1.5 pr-1.5">
					{confirmDelete ? (
						<>
							<button
								className="inline-flex h-5 cursor-pointer items-center rounded-md bg-destructive/12 px-1.5 font-medium text-[10px] text-destructive hover:bg-destructive/18"
								onClick={() => onDelete(thread.id)}
								type="button"
							>
								Confirm
							</button>
							<button
								aria-label="Cancel delete"
								className="inline-flex h-5 cursor-pointer items-center rounded-md px-1.5 font-medium text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
								onClick={() => setConfirmDelete(false)}
								type="button"
							>
								Cancel
							</button>
						</>
					) : (
						<>
							<button
								aria-label={`Delete ${thread.name}`}
								className={cn(
									"hidden size-5 cursor-pointer items-center justify-center rounded-md text-muted-foreground/60 hover:text-destructive",
									"group-focus-within/sub:flex group-hover/sub:flex max-sm:flex"
								)}
								onClick={() => setConfirmDelete(true)}
								type="button"
							>
								<Trash2Icon className="size-3" />
							</button>
							<span
								className={cn(
									"shrink-0 text-[10px] tabular-nums group-hover/sub:hidden",
									isActive ? "text-foreground/70" : "text-muted-foreground/50"
								)}
							>
								{timestamp}
							</span>
						</>
					)}
				</div>
			</div>
		);
	}

	return (
		<li
			className={cn(
				"group/sub relative isolate flex w-full items-center rounded-md transition-colors",
				isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
			)}
		>
			{renaming ? (
				<input
					className="ms-2 min-w-0 flex-1 truncate rounded border border-ring bg-transparent px-0.5 text-xs outline-none"
					onBlur={() => {
						onRename(thread.id, draft.trim() || thread.name);
						setRenaming(false);
					}}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							onRename(thread.id, draft.trim() || thread.name);
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
				<button
					className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-left"
					onClick={() => onSelect(thread.id)}
					onDoubleClick={() => {
						setDraft(thread.name);
						setRenaming(true);
					}}
					type="button"
				>
					<span className="min-w-0 flex-1 truncate text-xs">{thread.name}</span>
				</button>
			)}
			<div className="ml-auto flex shrink-0 items-center gap-1.5 pr-1.5">
				{confirmDelete ? (
					<>
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
						<button
							aria-label="Cancel delete"
							className="inline-flex h-5 cursor-pointer items-center rounded-md px-2 font-medium text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
							onClick={(event) => {
								event.stopPropagation();
								setConfirmDelete(false);
							}}
							type="button"
						>
							Cancel
						</button>
					</>
				) : (
					<button
						aria-label={`Delete ${thread.name}`}
						className={cn(
							"hidden size-5 cursor-pointer items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground",
							"group-focus-within/sub:flex group-hover/sub:flex max-sm:flex"
						)}
						onClick={(event) => {
							event.stopPropagation();
							setConfirmDelete(true);
						}}
						type="button"
					>
						<Trash2Icon className="size-3.5" />
					</button>
				)}
				<span
					className={cn(
						"text-[10px] tabular-nums group-hover/sub:hidden",
						isActive ? "text-foreground/70" : "text-muted-foreground/50"
					)}
				>
					{timestamp}
				</span>
			</div>
		</li>
	);
}
