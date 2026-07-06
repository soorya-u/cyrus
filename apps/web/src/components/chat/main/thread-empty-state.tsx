import { cn } from "cnfast";
import { TerminalIcon } from "lucide-react";

type ThreadEmptyStateProps = {
	className?: string;
};

export function ThreadEmptyState({ className }: ThreadEmptyStateProps) {
	return (
		<div className={cn("flex min-h-0 flex-1", className)}>
			<div className="flex flex-1 flex-col items-center justify-center px-6 pb-56 text-center">
				<div className="max-w-sm space-y-1.5">
					<TerminalIcon className="mx-auto size-7 text-muted-foreground/50" />
					<p className="font-medium text-sm">No thread selected</p>
					<p className="text-muted-foreground text-xs">
						Select a worker, then pick or create a thread from the sidebar to
						start a coding session.
					</p>
				</div>
			</div>
		</div>
	);
}
