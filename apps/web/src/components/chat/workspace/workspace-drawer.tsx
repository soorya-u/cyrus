import {
	useGitStatus,
	useInitGitRepository,
} from "@cyrus/hooks/queries/use-git";
import {
	FolderIcon,
	GitBranchIcon,
	GitBranchPlusIcon,
	PanelRightCloseIcon,
} from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { DiffTab } from "@/components/chat/workspace/diff-tab";
import { ExplorerTab } from "@/components/chat/workspace/explorer-tab";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useChatUiStore, type WorkspaceTab } from "@/stores/chat-ui";

const WORKSPACE_TABS: WorkspaceTab[] = ["explorer", "diff"];

function isWorkspaceTab(value: string): value is WorkspaceTab {
	return (WORKSPACE_TABS as string[]).includes(value);
}

export function WorkspaceDrawer({
	threadId,
	rootPath,
	onClose,
}: {
	threadId: string;
	rootPath?: string;
	onClose?: () => void;
}) {
	const { workspaceTab, setWorkspaceTab } = useChatUiStore();
	const gitStatus = useGitStatus(threadId);
	const initGitRepository = useInitGitRepository();
	const isRepo = gitStatus.data?.isRepo === true;
	const needsGit = gitStatus.data?.isRepo === false;
	const activeTab = needsGit ? "explorer" : workspaceTab;

	const initError = initGitRepository.error;
	useEffect(() => {
		if (initError) toast.error(initError.message);
	}, [initError]);

	return (
		<div className="workspace-drawer flex h-full w-full flex-col bg-background">
			<div className="min-h-0 flex-1">
				{activeTab === "explorer" ? (
					<ExplorerTab key={threadId} rootPath={rootPath} threadId={threadId} />
				) : (
					<DiffTab threadId={threadId} />
				)}
			</div>
			<div className="flex items-center justify-between border-border border-t px-2 py-1.5">
				<ToggleGroup
					aria-label="Workspace tab"
					onValueChange={(value) => {
						if (isWorkspaceTab(value)) setWorkspaceTab(value);
					}}
					type="single"
					value={activeTab}
					variant="outline"
				>
					<ToggleGroupItem aria-label="Explorer" size="sm" value="explorer">
						<FolderIcon className="size-3.5" />
					</ToggleGroupItem>
					{isRepo ? (
						<ToggleGroupItem aria-label="Diff" size="sm" value="diff">
							<GitBranchIcon className="size-3.5" />
						</ToggleGroupItem>
					) : null}
				</ToggleGroup>
				<div className="flex items-center gap-1">
					{needsGit ? (
						<Button
							className="h-6 gap-1 px-2 text-xs"
							disabled={initGitRepository.isPending}
							onClick={() => {
								initGitRepository.reset();
								initGitRepository.mutate({ threadId });
							}}
							size="sm"
							type="button"
							variant="outline"
						>
							<GitBranchPlusIcon className="size-3.5" />
							{initGitRepository.isPending
								? "Initializing..."
								: "Initialize Git"}
						</Button>
					) : null}
					{onClose ? (
						<button
							aria-label="Close workspace drawer"
							className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
							onClick={onClose}
							type="button"
						>
							<PanelRightCloseIcon className="size-4" />
						</button>
					) : null}
				</div>
			</div>
		</div>
	);
}
