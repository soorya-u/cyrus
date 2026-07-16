import type { Project } from "@cyrus/schemas/rtc/projects";
import type { Thread } from "@cyrus/schemas/rtc/threads";
import type { useSortable } from "@dnd-kit/sortable";
import { cn } from "cnfast";
import {
	ChevronRightIcon,
	FolderIcon,
	MoreHorizontalIcon,
	SquarePenIcon,
} from "lucide-react";
import { DeleteProjectDialog } from "@/components/portals/delete-project-dialog";
import { RenameProjectDialog } from "@/components/portals/rename-project-dialog";
import { ThreadRow } from "@/components/sidebar/projects/thread-row";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
	onDelete: (id: string) => void;
	onRename: (id: string, name: string) => void;
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
	onDelete,
	onRename,
	onRenameProject,
	onRemoveProject,
	attachThreadListAutoAnimateRef,
	dragHandleProps,
}: ProjectThreadGroupProps) {
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
								onSelect={async () => {
									const name = await RenameProjectDialog.call({
										currentName: project.name,
									});
									if (name) onRenameProject(project.id, name);
								}}
							>
								Rename
							</DropdownMenuItem>
							<DropdownMenuItem
								onSelect={async () => {
									const confirmed = await DeleteProjectDialog.call({
										projectName: project.name,
										threadCount: threads.length,
									});
									if (confirmed) onRemoveProject(project.id);
								}}
								variant="destructive"
							>
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
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
									onDelete={onDelete}
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
