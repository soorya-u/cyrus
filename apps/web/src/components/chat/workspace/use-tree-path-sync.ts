import type { FileTree } from "@pierre/trees";
import { useEffect, useRef } from "react";
import { buildFileTreePathUpdates } from "@/components/chat/workspace/file-tree-path-updates";

/** Seeds the tree once, then applies only the added/removed paths on later changes. */
export function useTreePathSync(
	model: FileTree,
	treePaths: readonly string[],
	ready = true
) {
	const previousPathsRef = useRef<readonly string[] | null>(null);
	useEffect(() => {
		if (!ready || previousPathsRef.current === treePaths) return;
		const previous = previousPathsRef.current;
		previousPathsRef.current = treePaths;
		if (previous === null) {
			model.resetPaths(treePaths);
			return;
		}
		const updates = buildFileTreePathUpdates(previous, treePaths);
		if (updates.length > 0) model.batch(updates);
	}, [ready, model, treePaths]);
}
