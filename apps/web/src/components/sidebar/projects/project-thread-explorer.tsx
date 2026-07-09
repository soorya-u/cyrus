import { useControllerThreads } from "@cyrus/hooks/connection/use-controller-threads";
import type { Thread } from "@cyrus/schemas/rtc/threads";
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
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useNavigate, useParams } from "@tanstack/react-router";
import { FolderPlusIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NewProjectDialog } from "@/components/portals/new-project-dialog";
import { ProjectThreadGroup } from "@/components/sidebar/projects/project-thread-group";
import { SortableProjectItem } from "@/components/sidebar/projects/sortable-project-item";
import { ThreadSearchField } from "@/components/sidebar/projects/thread-search-field";
import { SidebarGroup, SidebarMenu } from "@/components/ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { useAutoAnimateRef } from "@/hooks/use-auto-animate-ref";
import { useProjectOrderStore } from "@/stores/project-order";

type ProjectThreadExplorerProps = {
	workerId: string;
	activeThreadId?: string | null;
};

function projectCollisionDetection(args: Parameters<CollisionDetection>[0]) {
	const pointerCollisions = pointerWithin(args);
	if (pointerCollisions.length > 0) {
		return pointerCollisions;
	}
	return closestCorners(args);
}

export function ProjectThreadExplorer({
	workerId,
	activeThreadId = null,
}: ProjectThreadExplorerProps) {
	const navigate = useNavigate();
	const {
		projects,
		threads,
		createProject,
		renameProject,
		removeProject,
		createThread,
		renameThread,
		deleteThread,
	} = useControllerThreads();
	const [query, setQuery] = useState("");
	const [expandedProjects, setExpandedProjects] = useState<
		Record<string, boolean>
	>(() => Object.fromEntries(projects.map((project) => [project.id, true])));
	const projectOrder = useProjectOrderStore((state) => state.projectOrder);
	const setProjectOrder = useProjectOrderStore(
		(state) => state.setProjectOrder
	);
	const attachProjectListAutoAnimateRef = useAutoAnimateRef();
	const attachThreadListAutoAnimateRef = useAutoAnimateRef();
	const suppressProjectClickAfterDragRef = useRef(false);

	useEffect(() => {
		setProjectOrder((current) => {
			const known = new Set(projects.map((project) => project.id));
			const next = current.filter((id) => known.has(id));
			for (const project of projects)
				if (!next.includes(project.id)) next.push(project.id);

			return next;
		});
	}, [projects, setProjectOrder]);

	const byId = new Map(projects.map((project) => [project.id, project]));
	const orderedProjects = projectOrder
		.map((id) => byId.get(id))
		.filter(
			(project): project is NonNullable<typeof project> => project !== undefined
		);

	const q = query.trim().toLowerCase();
	const filteredThreads = q
		? threads.filter((thread) => thread.name.toLowerCase().includes(q))
		: threads;

	const threadsByProject = new Map<string, Thread[]>();
	for (const project of projects) {
		threadsByProject.set(project.id, []);
	}
	for (const thread of filteredThreads) {
		const list = threadsByProject.get(thread.projectId);
		if (list) {
			list.push(thread);
		}
	}

	const projectDnDSensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 6 },
		})
	);

	function handleProjectDragEnd(event: DragEndEvent) {
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
	}

	function handleSelectThread(thread: Thread) {
		navigate({
			to: "/workers/$workerId/p/$projectId/t/$threadId",
			params: {
				workerId,
				projectId: thread.projectId,
				threadId: thread.id,
			},
		});
	}

	function handleNewThread(projectId: string) {
		createThread(projectId).then((threadId) => {
			navigate({
				to: "/workers/$workerId/p/$projectId/t/$threadId",
				params: { workerId, projectId, threadId },
			});
		});
	}

	function handleDelete(threadId: string) {
		deleteThread(threadId);
		if (activeThreadId === threadId)
			navigate({ to: "/workers/$workerId", params: { workerId } });
	}

	return (
		<>
			<SidebarGroup className="px-2 py-2">
				<ThreadSearchField
					onChange={setQuery}
					placeholder="Search threads"
					value={query}
				/>
			</SidebarGroup>

			<SidebarGroup className="px-2 pb-2">
				<div className="flex items-center justify-between pr-1.5 pb-1 pl-2">
					<span className="font-medium text-[10px] text-muted-foreground/60 uppercase tracking-wider">
						Projects
					</span>
					<Tooltip>
						<TooltipTrigger
							render={
								<button
									aria-label="Add project"
									className="sidebar-icon-action-button"
									onClick={async () => {
										const result = await NewProjectDialog.call();
										if (result) createProject(result.name, result.path);
									}}
									type="button"
								/>
							}
						>
							<FolderPlusIcon className="size-3.5" />
						</TooltipTrigger>
						<TooltipPopup side="right">Add project</TooltipPopup>
					</Tooltip>
				</div>

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
								<SortableProjectItem key={project.id} projectId={project.id}>
									{(dragHandleProps) => (
										<ProjectThreadGroup
											activeThreadId={activeThreadId}
											attachThreadListAutoAnimateRef={
												attachThreadListAutoAnimateRef
											}
											dragHandleProps={dragHandleProps}
											expanded={expandedProjects[project.id] ?? true}
											onDelete={handleDelete}
											onNew={() => handleNewThread(project.id)}
											onRemoveProject={removeProject}
											onRename={renameThread}
											onRenameProject={renameProject}
											onSelect={handleSelectThread}
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
	);
}

/** Read threadId from nested thread route when present. */
export function useActiveThreadIdFromRoute(): string | undefined {
	const params = useParams({ strict: false });
	return "threadId" in params ? params.threadId : undefined;
}
