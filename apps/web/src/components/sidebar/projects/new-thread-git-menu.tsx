import {
	useProjectGitRefs,
	useProjectGitStatus,
} from "@cyrus/hooks/connection/use-git";
import { type ReactNode, useEffect, useRef } from "react";

type NewThreadGitMenuProps = {
	projectId: string;
	x: number;
	y: number;
	onClose: () => void;
	onCreateBranch: (projectId: string, branch: string) => void;
	onCreateWorktree: (projectId: string, branch: string) => void;
};

export function NewThreadGitMenu({
	projectId,
	x,
	y,
	onClose,
	onCreateBranch,
	onCreateWorktree,
}: NewThreadGitMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);
	const status = useProjectGitStatus(projectId);
	const refs = useProjectGitRefs(projectId);

	useEffect(() => {
		function handlePointerDown(event: MouseEvent) {
			if (!menuRef.current?.contains(event.target as Node)) onClose();
		}
		function handleEscape(event: KeyboardEvent) {
			if (event.key === "Escape") onClose();
		}
		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("keydown", handleEscape);
		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [onClose]);

	const isRepo = status.data?.isRepo === true;
	const branches = refs.data?.refs ?? [];

	let menuContent: ReactNode;
	if (!isRepo) {
		menuContent = (
			<div className="px-2 py-1.5 text-muted-foreground text-xs">
				Not a git repository
			</div>
		);
	} else if (branches.length === 0) {
		menuContent = (
			<div className="px-2 py-1.5 text-muted-foreground text-xs">
				No local branches
			</div>
		);
	} else {
		menuContent = branches.map((ref) => (
			<div className="flex flex-col" key={ref.name}>
				<button
					className="rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent"
					onClick={() => {
						onCreateBranch(projectId, ref.name);
						onClose();
					}}
					type="button"
				>
					{ref.name}
				</button>
				<button
					className="rounded-sm px-2 py-1.5 text-left text-[11px] text-muted-foreground hover:bg-accent"
					onClick={() => {
						onCreateWorktree(projectId, ref.name);
						onClose();
					}}
					type="button"
				>
					Open in worktree
				</button>
			</div>
		));
	}

	return (
		<div
			className="fixed z-50 min-w-48 rounded-md border border-border bg-popover p-1 shadow-md"
			ref={menuRef}
			style={{ left: x, top: y }}
		>
			{menuContent}
		</div>
	);
}
