import {
	useCheckoutRef,
	useCreateWorktree,
	useGitStatus,
	useListGitRefs,
	useListProjectGitRefs,
	useProjectGitStatus,
} from "@cyrus/hooks/queries/use-git";
import { useLocalDraftStore } from "@cyrus/hooks/stores/local-draft";
import type { Thread } from "@cyrus/schemas/rtc/threads";
import { cn } from "cnfast";
import {
	ChevronDownIcon,
	FolderGit2Icon,
	FolderGitIcon,
	FolderIcon,
	GitBranchIcon,
	SearchIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { filterNamedItems } from "@/utils/filters";

type WorkspaceMode = "local" | "worktree";

type ComposerBranchToolbarProps = {
	thread: Thread;
	localDraft?: boolean;
};

function resolveWorkspaceLabel(
	hasWorktree: boolean,
	workspaceMode: WorkspaceMode
): string {
	if (hasWorktree) return "Worktree";
	if (workspaceMode === "worktree") return "New worktree";
	return "Current checkout";
}

function WorkspaceIcon({
	hasWorktree,
	workspaceMode,
}: {
	hasWorktree: boolean;
	workspaceMode: WorkspaceMode;
}) {
	if (hasWorktree) return <FolderGitIcon className="size-3" />;
	if (workspaceMode === "worktree")
		return <FolderGit2Icon className="size-3" />;
	return <FolderIcon className="size-3" />;
}

function resolveBranchTriggerLabel(
	refName: string | null,
	workspaceMode: WorkspaceMode,
	hasWorktree: boolean
): string {
	if (!refName) return "Select branch";
	if (workspaceMode === "worktree" && !hasWorktree) return `From ${refName}`;
	return refName;
}

function BranchListItems({
	filteredRefs,
	isLoading,
	onSelect,
}: {
	filteredRefs: { name: string; current: boolean }[];
	isLoading: boolean;
	onSelect: (name: string) => void;
}) {
	if (isLoading) {
		return (
			<div className="px-2 py-3 text-center text-muted-foreground text-xs">
				Loading branches...
			</div>
		);
	}

	if (filteredRefs.length === 0) {
		return (
			<div className="px-2 py-3 text-center text-muted-foreground text-xs">
				No branches found
			</div>
		);
	}

	return filteredRefs.map((ref) => (
		<DropdownMenuItem key={ref.name} onSelect={() => onSelect(ref.name)}>
			{ref.name}
			{ref.current ? " (current)" : ""}
		</DropdownMenuItem>
	));
}

export function ComposerBranchToolbar({
	thread,
	localDraft = false,
}: ComposerBranchToolbarProps) {
	const threadGitStatus = useGitStatus(localDraft ? undefined : thread.id);
	const projectGitStatus = useProjectGitStatus(
		localDraft ? thread.projectId : undefined
	);
	const gitStatus = localDraft ? projectGitStatus : threadGitStatus;
	const threadGitRefs = useListGitRefs(localDraft ? undefined : thread.id);
	const projectGitRefs = useListProjectGitRefs(
		localDraft ? thread.projectId : undefined
	);
	const gitRefs = localDraft ? projectGitRefs : threadGitRefs;
	const checkoutRef = useCheckoutRef();
	const createWorktree = useCreateWorktree();
	const draftGit = useLocalDraftStore((state) => state.gitByDraft[thread.id]);
	const setDraftBranch = useLocalDraftStore((state) => state.setBranch);
	const setDraftWorktree = useLocalDraftStore((state) => state.setWorktree);

	const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(() => {
		if (localDraft) return draftGit?.worktree ? "worktree" : "local";
		return thread.worktreePath ? "worktree" : "local";
	});
	const [branchQuery, setBranchQuery] = useState("");

	useEffect(() => {
		if (localDraft) return;
		if (thread.worktreePath) setWorkspaceMode("worktree");
	}, [localDraft, thread.worktreePath]);

	useEffect(() => {
		if (!localDraft) return;
		setDraftWorktree(thread.id, workspaceMode === "worktree");
	}, [localDraft, setDraftWorktree, thread.id, workspaceMode]);

	const isRepo = gitStatus.data?.isRepo === true;
	const statusRefName =
		gitStatus.data?.isRepo === true ? gitStatus.data.refName : null;
	const refName = localDraft
		? (draftGit?.branch ?? statusRefName)
		: statusRefName;
	const hasWorktree = localDraft ? false : Boolean(thread.worktreePath);
	const envLocked = hasWorktree;
	const branchMutationError = localDraft
		? null
		: (checkoutRef.error ?? createWorktree.error);
	const isBranchActionPending = localDraft
		? false
		: checkoutRef.isPending || createWorktree.isPending;

	const filteredRefs = useMemo(() => {
		const refs = gitRefs.data?.refs ?? [];
		return filterNamedItems(refs, branchQuery);
	}, [branchQuery, gitRefs.data?.refs]);

	const refsLoading = gitRefs.isLoading && gitRefs.data === undefined;

	if (!isRepo) return null;

	function handleBranchSelect(name: string) {
		setBranchQuery("");

		if (localDraft) {
			setDraftBranch(thread.id, name);
			return;
		}

		checkoutRef.reset();
		createWorktree.reset();

		if (workspaceMode === "worktree" && !hasWorktree) {
			createWorktree.mutate({ threadId: thread.id, refName: name });
			return;
		}

		checkoutRef.mutate({ threadId: thread.id, refName: name });
	}

	const workspaceLabel = resolveWorkspaceLabel(hasWorktree, workspaceMode);
	const branchTriggerLabel = resolveBranchTriggerLabel(
		refName,
		workspaceMode,
		hasWorktree
	);

	return (
		<div className="pointer-events-auto mx-auto flex w-full max-w-3xl items-center gap-2 bg-transparent px-2.5 pt-1 pb-3 sm:px-3">
			{envLocked ? (
				<span className="inline-flex h-7 shrink-0 items-center gap-1 px-2 font-medium text-muted-foreground/70 text-xs">
					<WorkspaceIcon
						hasWorktree={hasWorktree}
						workspaceMode={workspaceMode}
					/>
					{workspaceLabel}
				</span>
			) : (
				<Select
					onValueChange={(value) => setWorkspaceMode(value as WorkspaceMode)}
					value={workspaceMode}
				>
					<SelectTrigger
						aria-label="Workspace"
						className="h-7 w-auto shrink-0 gap-1 border-none bg-transparent px-2 font-medium text-muted-foreground/70 text-xs shadow-none hover:bg-transparent hover:text-foreground/80 dark:bg-transparent!"
						size="sm"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent align="start">
						<SelectGroup>
							<SelectLabel>Workspace</SelectLabel>
							<SelectItem value="local">
								<FolderIcon className="size-3" />
								Current checkout
							</SelectItem>
							<SelectItem value="worktree">
								<FolderGit2Icon className="size-3" />
								New worktree
							</SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>
			)}

			<DropdownMenu
				onOpenChange={(open) => {
					if (!open) setBranchQuery("");
				}}
			>
				<DropdownMenuTrigger
					className={cn(
						"ml-auto inline-flex h-7 min-w-0 max-w-full items-center gap-1 rounded-md border-none bg-transparent px-2 font-mono text-[11px] text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground/80",
						isBranchActionPending && "opacity-60"
					)}
					disabled={isBranchActionPending || refsLoading}
					type="button"
				>
					<GitBranchIcon className="size-3 shrink-0" />
					<span className="truncate">{branchTriggerLabel}</span>
					<ChevronDownIcon className="size-3 shrink-0 opacity-60" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-64 p-0">
					<div className="border-border border-b p-2">
						<div className="flex h-8 w-full items-center gap-2 rounded-lg border border-input bg-background px-2.5 shadow-xs/5 ring-ring/24 transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
							<SearchIcon
								aria-hidden="true"
								className="size-3.5 shrink-0 text-muted-foreground/60"
							/>
							<input
								className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs outline-none placeholder:text-muted-foreground/72"
								onChange={(event) => setBranchQuery(event.target.value)}
								onKeyDown={(event) => event.stopPropagation()}
								placeholder="Search branches"
								type="search"
								value={branchQuery}
							/>
						</div>
					</div>
					<div className="max-h-64 overflow-y-auto p-1">
						<BranchListItems
							filteredRefs={filteredRefs}
							isLoading={refsLoading}
							onSelect={handleBranchSelect}
						/>
					</div>
				</DropdownMenuContent>
			</DropdownMenu>

			{branchMutationError ? (
				<span className="truncate text-[11px] text-destructive">
					{branchMutationError.message}
				</span>
			) : null}
		</div>
	);
}
