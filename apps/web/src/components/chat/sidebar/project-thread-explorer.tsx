import type { Thread } from "@cyrus/hooks/types";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProjectThreadGroup } from "@/components/chat/sidebar/project-thread-group";
import { SortableProjectItem } from "@/components/chat/sidebar/sortable-project-item";
import { ThreadSearchField } from "@/components/chat/sidebar/thread-search-field";
import { SidebarGroup, SidebarMenu } from "@/components/ui/sidebar";
import { useAutoAnimateRef } from "@/hooks/use-auto-animate-ref";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useMockThreadsContext } from "@/mocks/mock-threads-provider";

type ProjectThreadExplorerProps = {
	workerId: string;
	activeThreadId?: string | null;
};

export function ProjectThreadExplorer({
	workerId,
	activeThreadId = null,
}: ProjectThreadExplorerProps) {
	const navigate = useNavigate();
	const { projects, threads, createThread, renameThread, archiveThread } =
		useMockThreadsContext();
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
			.filter(
				(project): project is NonNullable<typeof project> =>
					project !== undefined
			);
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

	const handleSelectThread = useCallback(
		(thread: Thread) => {
			navigate({
				to: "/workers/$workerId/p/$projectId/t/$threadId",
				params: {
					workerId,
					projectId: thread.projectId,
					threadId: thread.id,
				},
			});
		},
		[navigate, workerId]
	);

	const handleNewThread = useCallback(
		(projectId: string) => {
			const threadId = createThread(projectId);
			navigate({
				to: "/workers/$workerId/p/$projectId/t/$threadId",
				params: { workerId, projectId, threadId },
			});
		},
		[createThread, navigate, workerId]
	);

	const handleArchive = useCallback(
		(threadId: string) => {
			archiveThread(threadId);
			if (activeThreadId === threadId) {
				navigate({ to: "/workers/$workerId", params: { workerId } });
			}
		},
		[activeThreadId, archiveThread, navigate, workerId]
	);

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
											onArchive={handleArchive}
											onNew={() => handleNewThread(project.id)}
											onRename={renameThread}
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
