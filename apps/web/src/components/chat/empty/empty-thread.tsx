import { cn } from "cnfast";
import { TerminalIcon } from "lucide-react";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";

type EmptyThreadProps = {
	className?: string;
};

export function EmptyThread({ className }: EmptyThreadProps) {
	return (
		<Empty className={cn("min-h-0 flex-1 border-none", className)}>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<TerminalIcon />
				</EmptyMedia>
				<EmptyTitle>No thread selected</EmptyTitle>
				<EmptyDescription>
					Pick or create a thread from the sidebar to start a coding session.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}
