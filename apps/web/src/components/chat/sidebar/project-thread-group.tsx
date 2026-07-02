"use client";

import type { Project, Thread } from "@cyrus/hooks/types";
import type { useSortable } from "@dnd-kit/sortable";
import { ChevronRightIcon, FolderIcon, SquarePenIcon } from "lucide-react";
import { ThreadRow } from "@/components/chat/thread-row";
import {
	SidebarMenuButton,
	SidebarMenuSub,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/utils/cn";

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
	attachThreadListAutoAnimateRef,
	dragHandleProps,
}: ProjectThreadGroupProps) {
	return (
		<>
			<div className="group/project-header relative">
				<SidebarMenuButton
					className={cn(
						"gap-2 px-2 py-1.5 pr-8 text-left hover:bg-accent group-hover/project-header:bg-accent group-hover/project-header:text-sidebar-accent-foreground",
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
				<div className="pointer-events-none absolute top-[calc(50%+1px)] right-0.5 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-focus-within/project-header:pointer-events-auto group-focus-within/project-header:opacity-100 group-hover/project-header:pointer-events-auto group-hover/project-header:opacity-100">
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
				</div>
			</div>

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
