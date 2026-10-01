import { ChevronDownIcon, FolderIcon, GitBranchIcon } from "lucide-react";
import { DiffTab } from "@/components/chat/workspace/diff-tab";
import { ExplorerTab } from "@/components/chat/workspace/explorer-tab";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useChatUiStore, type WorkspaceTab } from "@/stores/chat-ui";

const WORKSPACE_TABS: WorkspaceTab[] = ["explorer", "diff"];

function isWorkspaceTab(value: string): value is WorkspaceTab {
	return (WORKSPACE_TABS as string[]).includes(value);
}

export function WorkspaceDrawer({
	threadId,
	onClose,
}: {
	threadId: string;
	onClose: () => void;
}) {
	const { workspaceTab, setWorkspaceTab } = useChatUiStore();

	return (
		<div className="flex h-full w-full flex-col bg-background">
			<div className="min-h-0 flex-1">
				{workspaceTab === "explorer" ? (
					<ExplorerTab key={threadId} threadId={threadId} />
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
					value={workspaceTab}
					variant="outline"
				>
					<ToggleGroupItem aria-label="Explorer" size="sm" value="explorer">
						<FolderIcon className="size-3.5" />
					</ToggleGroupItem>
					<ToggleGroupItem aria-label="Diff" size="sm" value="diff">
						<GitBranchIcon className="size-3.5" />
					</ToggleGroupItem>
				</ToggleGroup>
				<button
					aria-label="Close workspace drawer"
					className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
					onClick={onClose}
					type="button"
				>
					<ChevronDownIcon className="size-4" />
				</button>
			</div>
		</div>
	);
}
