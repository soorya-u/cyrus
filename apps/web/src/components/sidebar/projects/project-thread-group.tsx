import type { Project, Thread } from "@cyrus/hooks/types";
import type { useSortable } from "@dnd-kit/sortable";
import { cn } from "cnfast";
import {
	ChevronRightIcon,
	FolderIcon,
	MoreHorizontalIcon,
	SquarePenIcon,
} from "lucide-react";
import { useState } from "react";
import { ThreadRow } from "@/components/chat/thread-row";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	SidebarMenuButton,
	SidebarMenuSub,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";

type ProjectThreadGroupProps = {
	project: Project;
	threads: Thread[];
	activeThreadId: string | null;
	expanded: boolean;
	onToggle: () => void;
	onNew: () => void;
	onSelect: (thread: Thread) => void;
	onArchive: (id: string) => void;
	onRename: (id: string, title: string) => void;
	onRenameProject: (id: string, name: string) => void;
	onRemoveProject: (id: string) => void;
	attachThreadListAutoAnimateRef: (node: HTMLElement | null) => void;
	dragHandleProps: {
		attributes: ReturnType<typeof useSortable>["attributes"];
		listeners: ReturnType<typeof useSortable>["listeners"];
		setActivatorNodeRef: ReturnType<typeof useSortable>["setActivatorNodeRef"];
	} | null;
};

export function ProjectThreadGroup({
	project,
	threads,
	activeThreadId,
	expanded,
	onToggle,
	onNew,
	onSelect,
	onArchive,
	onRename,
	onRenameProject,
	onRemoveProject,
	attachThreadListAutoAnimateRef,
	dragHandleProps,
}: ProjectThreadGroupProps) {
	const [renameOpen, setRenameOpen] = useState(false);
	const [renameValue, setRenameValue] = useState(project.name);
	const [deleteOpen, setDeleteOpen] = useState(false);

	const submitRename = () => {
		const trimmed = renameValue.trim();
		if (trimmed) onRenameProject(project.id, trimmed);

		setRenameOpen(false);
	};

	return (
		<>
			<div className="group/project-header relative">
				<SidebarMenuButton
					className={cn(
						"gap-2 px-2 py-1.5 pr-14 text-left hover:bg-accent group-hover/project-header:bg-accent group-hover/project-header:text-sidebar-accent-foreground",
						dragHandleProps && "cursor-grab active:cursor-grabbing"
					)}
					onClick={onToggle}
					ref={dragHandleProps?.setActivatorNodeRef}
					size="sm"
					{...(dragHandleProps?.attributes ?? {})}
					{...(dragHandleProps?.listeners ?? {})}
				>
					<ChevronRightIcon
						className={cn(
							"-ml-0.5 size-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-150",
							expanded && "rotate-90"
						)}
					/>
					<FolderIcon className="size-3.5 shrink-0 text-muted-foreground/70" />
					<span className="flex min-w-0 flex-1 items-center gap-2">
						<span className="truncate font-medium text-foreground/90 text-xs">
							{project.name}
						</span>
						<span className="shrink-0 text-[10px] text-muted-foreground/60">
							{threads.length}
						</span>
					</span>
				</SidebarMenuButton>
				<div className="pointer-events-none absolute top-[calc(50%+1px)] right-0.5 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-focus-within/project-header:pointer-events-auto group-focus-within/project-header:opacity-100 group-hover/project-header:pointer-events-auto group-hover/project-header:opacity-100">
					<button
						aria-label={`Create new thread in ${project.name}`}
						className="sidebar-icon-action-button"
						onClick={(event) => {
							event.stopPropagation();
							onNew();
						}}
						type="button"
					>
						<SquarePenIcon className="size-3.5" />
					</button>
					<DropdownMenu>
						<DropdownMenuTrigger
							aria-label={`${project.name} actions`}
							className="sidebar-icon-action-button"
							onClick={(event) => event.stopPropagation()}
							type="button"
						>
							<MoreHorizontalIcon className="size-3.5" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onSelect={() => {
									setRenameValue(project.name);
									setRenameOpen(true);
								}}
							>
								Rename
							</DropdownMenuItem>
							<DropdownMenuItem
								onSelect={() => setDeleteOpen(true)}
								variant="destructive"
							>
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<Dialog onOpenChange={setRenameOpen} open={renameOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Rename project</DialogTitle>
					</DialogHeader>
					<Input
						aria-label="Project name"
						autoFocus
						onChange={(event) => setRenameValue(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								submitRename();
							}
						}}
						value={renameValue}
					/>
					<DialogFooter>
						<Button onClick={() => setRenameOpen(false)} variant="outline">
							Cancel
						</Button>
						<Button disabled={!renameValue.trim()} onClick={submitRename}>
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog onOpenChange={setDeleteOpen} open={deleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete {project.name}?</AlertDialogTitle>
						<AlertDialogDescription>
							This removes the project and its {threads.length} thread
							{threads.length === 1 ? "" : "s"}. This can't be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={() => onRemoveProject(project.id)}>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<SidebarMenuSub
				className="mx-0.5 my-0 w-full translate-x-0 gap-0.5 overflow-hidden px-1 py-0 sm:mx-1 sm:px-1.5"
				ref={attachThreadListAutoAnimateRef}
			>
				{expanded && threads.length === 0 ? (
					<SidebarMenuSubItem className="w-full">
						<div className="flex h-6 w-full translate-x-0 items-center px-2 text-left text-[10px] text-muted-foreground/60">
							No threads yet
						</div>
					</SidebarMenuSubItem>
				) : null}
				{expanded
					? threads.map((thread) => (
							<SidebarMenuSubItem className="w-full" key={thread.id}>
								<ThreadRow
									isActive={activeThreadId === thread.id}
									onArchive={onArchive}
									onRename={onRename}
									onSelect={() => onSelect(thread)}
									thread={thread}
									variant="sub"
								/>
							</SidebarMenuSubItem>
						))
					: null}
			</SidebarMenuSub>
		</>
	);
}
