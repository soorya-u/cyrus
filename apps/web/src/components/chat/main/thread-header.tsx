import { useControllerThreads } from "@cyrus/hooks/connection/use-controller-threads";
import type { Thread } from "@cyrus/schemas/rtc/threads";
import { Link } from "@tanstack/react-router";
import { cn } from "cnfast";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useChatUiStore } from "@/stores/chat-ui";

type ThreadHeaderProps = {
	thread: Thread;
	workerId: string;
	projectId: string;
};

export function ThreadHeader({
	thread,
	workerId,
	projectId,
}: ThreadHeaderProps) {
	const { diffOpen, toggleDiffOpen } = useChatUiStore();
	const { projects } = useControllerThreads();
	const project = projects.find((item) => item.id === projectId);

	return (
		<div
			className={cn(
				"surface-subheader collapsed-sidebar-titlebar-inset flex items-center gap-2 px-3 transition-[padding-left] duration-200 ease-linear motion-reduce:transition-none"
			)}
		>
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link
								params={{ projectId, workerId }}
								to="/workers/$workerId/p/$projectId"
							>
								{project?.name ?? "Project"}
							</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{thread.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<div className="ml-auto flex items-center gap-1">
				<button
					className={
						diffOpen
							? "inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 font-medium text-primary-foreground text-xs"
							: "inline-flex h-7 items-center gap-1 rounded-md bg-muted/70 px-2 font-medium text-foreground text-xs hover:bg-muted"
					}
					onClick={toggleDiffOpen}
					type="button"
				>
					Diffs
				</button>
			</div>
		</div>
	);
}
