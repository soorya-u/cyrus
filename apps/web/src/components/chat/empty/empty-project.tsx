import { cn } from "cnfast";
import { FolderPlusIcon, FolderTreeIcon } from "lucide-react";
import { NewProjectDialog } from "@/components/portals/new-project-dialog";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";

type EmptyProjectProps = {
	className?: string;
	onCreateProject: (input: {
		name: string;
		path: string;
	}) => void | Promise<void>;
};

export function EmptyProject({
	className,
	onCreateProject,
}: EmptyProjectProps) {
	return (
		<Empty className={cn("min-h-0 flex-1 border-none", className)}>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<FolderTreeIcon />
				</EmptyMedia>
				<EmptyTitle>No project selected</EmptyTitle>
				<EmptyDescription>
					Select an existing project from the sidebar, or create a new project
					to get started.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button
					onClick={async () => {
						const result = await NewProjectDialog.call();
						if (result) await onCreateProject(result);
					}}
					size="sm"
					type="button"
					variant="outline"
				>
					<FolderPlusIcon />
					Add project
				</Button>
			</EmptyContent>
		</Empty>
	);
}
