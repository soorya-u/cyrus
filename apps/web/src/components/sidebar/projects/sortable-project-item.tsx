import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "cnfast";
import type { ReactNode } from "react";

type SortableProjectItemProps = {
	projectId: string;
	children: (handleProps: {
		attributes: ReturnType<typeof useSortable>["attributes"];
		listeners: ReturnType<typeof useSortable>["listeners"];
		setActivatorNodeRef: ReturnType<typeof useSortable>["setActivatorNodeRef"];
	}) => ReactNode;
};

export function SortableProjectItem({
	projectId,
	children,
}: SortableProjectItemProps) {
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
