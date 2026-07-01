"use client";

import type { Project, Thread } from "@cyrus/hooks/types";
import {
	type CollisionDetection,
	closestCorners,
	DndContext,
	type DragEndEvent,
	PointerSensor,
	pointerWithin,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	restrictToFirstScrollableAncestor,
	restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { autoAnimate } from "@formkit/auto-animate";
import {
	ArrowLeftIcon,
	ChevronRightIcon,
	FolderIcon,
	SearchIcon,
	SettingsIcon,
	SquarePenIcon,
} from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	SettingsNavMenu,
	type SettingsSectionId,
} from "@/components/chat/settings-sidebar-nav";
import { ThreadRow } from "@/components/chat/thread-row";
import {
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { cn } from "@/utils/cn";

const SIDEBAR_LIST_ANIMATION_OPTIONS = {
	duration: 180,
	easing: "ease-out",
} as const;

const SIDEBAR_ICON_ACTION_BUTTON_CLASS =
	"inline-flex h-6 min-w-6 cursor-pointer items-center justify-center rounded-md px-[calc(--spacing(1)-1px)] text-muted-foreground/60 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring";

function ThreadSearchField({
	value,
	onChange,
	placeholder,
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
}) {
	return (
		<div className="flex h-8 w-full items-center gap-2 rounded-lg border border-input bg-background px-2.5 shadow-xs/5 ring-ring/24 transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
			<SearchIcon
				aria-hidden="true"
				className="size-3.5 shrink-0 text-muted-foreground/60"
			/>
			<input
				className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs outline-none placeholder:text-muted-foreground/72"
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				type="search"
				value={value}
			/>
		</div>
	);
}

type SidebarPanel = "threads" | "settings";

type ChatSidebarProps = {
	activeId: string | null;
	onArchive: (id: string) => void;
	onNew: (projectId: string) => void;
	onRename: (id: string, title: string) => void;
	onSelect: (id: string) => void;
	panel: SidebarPanel;
	projects: Project[];
	settingsSection: SettingsSectionId;
	threads: Thread[];
	onOpenSettings: () => void;
	onCloseSettings: () => void;
	onSelectSettingsSection: (section: SettingsSectionId) => void;
};

function useAutoAnimateRef() {
	const animatedNodesRef = useRef(new WeakSet<HTMLElement>());
	return useCallback((node: HTMLElement | null) => {
		if (!node || animatedNodesRef.current.has(node)) {
			return;
		}
		autoAnimate(node, SIDEBAR_LIST_ANIMATION_OPTIONS);
		animatedNodesRef.current.add(node);
	}, []);
}

function SortableProjectItem({
	projectId,
	children,
}: {
	projectId: string;
	children: (handleProps: {
		attributes: ReturnType<typeof useSortable>["attributes"];
		listeners: ReturnType<typeof useSortable>["listeners"];
		setActivatorNodeRef: ReturnType<typeof useSortable>["setActivatorNodeRef"];
	}) => ReactNode;
}) {
	const {
		attributes,
		listeners,
		setActivatorNodeRef,
		setNodeRef,
		transform,
		transition,
		isDragging,
		isOver,
	} = useSortable({ id: projectId });

	return (
		<li
			className={cn(
				"group/menu-item relative rounded-md",
				isDragging && "z-20 opacity-80",
				isOver && !isDragging && "ring-1 ring-primary/40"
			)}
			data-sidebar="menu-item"
			data-slot="sidebar-menu-item"
			ref={setNodeRef}
			style={{
				transform: CSS.Translate.toString(transform),
				transition,
			}}
		>
			{children({ attributes, listeners, setActivatorNodeRef })}
		</li>
	);
}

function ProjectThreadGroup({
	project,
	threads,
	activeId,
	expanded,
	onToggle,
	onNew,
	onSelect,
	onArchive,
	onRename,
	attachThreadListAutoAnimateRef,
	dragHandleProps,
}: {
	project: Project;
	threads: Thread[];
	activeId: string | null;
	expanded: boolean;
	onToggle: () => void;
	onNew: () => void;
	onSelect: (id: string) => void;
	onArchive: (id: string) => void;
	onRename: (id: string, title: string) => void;
	attachThreadListAutoAnimateRef: (node: HTMLElement | null) => void;
	dragHandleProps: {
		attributes: ReturnType<typeof useSortable>["attributes"];
		listeners: ReturnType<typeof useSortable>["listeners"];
		setActivatorNodeRef: ReturnType<typeof useSortable>["setActivatorNodeRef"];
	} | null;
}) {
	const shouldShowThreadPanel = expanded;

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
						className={SIDEBAR_ICON_ACTION_BUTTON_CLASS}
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
				{shouldShowThreadPanel && threads.length === 0 ? (
					<SidebarMenuSubItem className="w-full">
						<div className="flex h-6 w-full translate-x-0 items-center px-2 text-left text-[10px] text-muted-foreground/60">
							No threads yet
						</div>
					</SidebarMenuSubItem>
				) : null}
				{shouldShowThreadPanel
					? threads.map((thread) => (
							<SidebarMenuSubItem className="w-full" key={thread.id}>
								<ThreadRow
									isActive={activeId === thread.id}
									onArchive={onArchive}
									onRename={onRename}
									onSelect={onSelect}
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

export function ChatSidebar({
	projects,
	threads,
	activeId,
	onSelect,
	onNew,
	onArchive,
	onRename,
	panel,
	settingsSection,
	onOpenSettings,
	onCloseSettings,
	onSelectSettingsSection,
}: ChatSidebarProps) {
	const { isMobile, setOpenMobile } = useSidebar();
	const [query, setQuery] = useState("");
	const [expandedProjects, setExpandedProjects] = useState<
		Record<string, boolean>
	>(() => Object.fromEntries(projects.map((project) => [project.id, true])));
	const [projectOrder, setProjectOrder] = useLocalStorage<string[]>(
		"chat_sidebar_project_order",
		projects.map((project) => project.id)
	);
	const attachProjectListAutoAnimateRef = useAutoAnimateRef();
	const attachThreadListAutoAnimateRef = useAutoAnimateRef();
	const suppressProjectClickAfterDragRef = useRef(false);

	useEffect(() => {
		setProjectOrder((current) => {
			const known = new Set(projects.map((project) => project.id));
			const next = current.filter((id) => known.has(id));
			for (const project of projects) {
				if (!next.includes(project.id)) {
					next.push(project.id);
				}
			}
			return next;
		});
	}, [projects, setProjectOrder]);

	const orderedProjects = useMemo(() => {
		const byId = new Map(projects.map((project) => [project.id, project]));
		return projectOrder
			.map((id) => byId.get(id))
			.filter((project): project is Project => project !== undefined);
	}, [projectOrder, projects]);

	const filteredThreads = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) {
			return threads;
		}
		return threads.filter((thread) => thread.title.toLowerCase().includes(q));
	}, [query, threads]);

	const threadsByProject = useMemo(() => {
		const map = new Map<string, Thread[]>();
		for (const project of projects) {
			map.set(project.id, []);
		}
		for (const thread of filteredThreads) {
			const list = map.get(thread.projectId);
			if (list) {
				list.push(thread);
			}
		}
		return map;
	}, [filteredThreads, projects]);

	const projectDnDSensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 6 },
		})
	);

	const projectCollisionDetection = useCallback<CollisionDetection>((args) => {
		const pointerCollisions = pointerWithin(args);
		if (pointerCollisions.length > 0) {
			return pointerCollisions;
		}
		return closestCorners(args);
	}, []);

	const handleProjectDragEnd = useCallback(
		(event: DragEndEvent) => {
			suppressProjectClickAfterDragRef.current = true;
			const { active, over } = event;
			if (!over || active.id === over.id) {
				return;
			}
			setProjectOrder((current) => {
				const oldIndex = current.indexOf(String(active.id));
				const newIndex = current.indexOf(String(over.id));
				if (oldIndex < 0 || newIndex < 0) {
					return current;
				}
				const next = [...current];
				const [moved] = next.splice(oldIndex, 1);
				if (!moved) {
					return current;
				}
				next.splice(newIndex, 0, moved);
				return next;
			});
		},
		[setProjectOrder]
	);

	const handleOpenSettings = () => {
		if (isMobile) {
			setOpenMobile(false);
		}
		onOpenSettings();
	};

	return (
		<>
			<SidebarHeader className="@container/sidebar-header h-(--workspace-topbar-height) shrink-0 flex-row items-center px-3 py-0 md:px-0">
				<span className="ml-(--workspace-titlebar-content-left) truncate font-medium text-foreground text-sm tracking-tight">
					Cyrus
				</span>
			</SidebarHeader>

			<SidebarContent className="overflow-x-hidden">
				{panel === "settings" ? (
					<SettingsNavMenu
						activeSection={settingsSection}
						onSelect={onSelectSettingsSection}
					/>
				) : (
					<>
						<SidebarGroup className="px-2 py-2">
							<ThreadSearchField
								onChange={setQuery}
								placeholder="Search threads"
								value={query}
							/>
						</SidebarGroup>

						<SidebarGroup className="px-2 pb-2">
							<DndContext
								collisionDetection={projectCollisionDetection}
								modifiers={[
									restrictToVerticalAxis,
									restrictToFirstScrollableAncestor,
								]}
								onDragEnd={handleProjectDragEnd}
								onDragStart={() => {
									suppressProjectClickAfterDragRef.current = true;
								}}
								sensors={projectDnDSensors}
							>
								<SidebarMenu ref={attachProjectListAutoAnimateRef}>
									<SortableContext
										items={orderedProjects.map((project) => project.id)}
										strategy={verticalListSortingStrategy}
									>
										{orderedProjects.map((project) => (
											<SortableProjectItem
												key={project.id}
												projectId={project.id}
											>
												{(dragHandleProps) => (
													<ProjectThreadGroup
														activeId={activeId}
														attachThreadListAutoAnimateRef={
															attachThreadListAutoAnimateRef
														}
														dragHandleProps={dragHandleProps}
														expanded={expandedProjects[project.id] ?? true}
														onArchive={onArchive}
														onNew={() => onNew(project.id)}
														onRename={onRename}
														onSelect={onSelect}
														onToggle={() => {
															if (suppressProjectClickAfterDragRef.current) {
																suppressProjectClickAfterDragRef.current = false;
																return;
															}
															setExpandedProjects((prev) => ({
																...prev,
																[project.id]: !(prev[project.id] ?? true),
															}));
														}}
														project={project}
														threads={threadsByProject.get(project.id) ?? []}
													/>
												)}
											</SortableProjectItem>
										))}
									</SortableContext>
								</SidebarMenu>
							</DndContext>

							{projects.length === 0 && (
								<div className="px-2 pt-4 text-center text-muted-foreground/60 text-xs">
									No projects yet
								</div>
							)}
						</SidebarGroup>
					</>
				)}
			</SidebarContent>

			<SidebarFooter className="p-2">
				<SidebarMenu>
					<SidebarMenuItem>
						{panel === "settings" ? (
							<SidebarMenuButton
								className="gap-2 px-2 py-2 text-muted-foreground text-xs hover:bg-accent hover:text-foreground"
								onClick={onCloseSettings}
								size="sm"
							>
								<ArrowLeftIcon className="size-4" />
								<span>Back</span>
							</SidebarMenuButton>
						) : (
							<SidebarMenuButton
								className="gap-2 px-2 py-1.5 text-muted-foreground/70 hover:bg-accent hover:text-foreground"
								onClick={handleOpenSettings}
								size="sm"
							>
								<SettingsIcon className="size-3.5" />
								<span className="text-xs">Settings</span>
							</SidebarMenuButton>
						)}
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</>
	);
}
