import { cn } from "cnfast";
import { ServerIcon } from "lucide-react";
import { InstallSnippet } from "@/components/chat/empty/install-snippet";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";

type EmptyWorkspaceProps = {
	className?: string;
};

export function EmptyWorkspace({ className }: EmptyWorkspaceProps) {
	return (
		<Empty className={cn("min-h-0 flex-1 border-none", className)}>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<ServerIcon />
				</EmptyMedia>
				<EmptyTitle>No worker connected</EmptyTitle>
				<EmptyDescription>
					Select a worker from the sidebar, or run the Cyrus daemon on your
					system to get started.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<InstallSnippet />
			</EmptyContent>
		</Empty>
	);
}
