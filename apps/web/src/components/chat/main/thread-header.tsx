import { useControllerThreads } from "@cyrus/hooks/connection/use-controller-threads";
import {
	useGitStatus,
	useInitGitRepository,
} from "@cyrus/hooks/connection/use-git";
import type { Thread } from "@cyrus/schemas/rtc/threads";
import { Link } from "@tanstack/react-router";
import { cn } from "cnfast";
import { GitBranchPlusIcon } from "lucide-react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
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
	const gitStatus = useGitStatus(thread.id);
	const initGitRepository = useInitGitRepository();

	const isRepo = gitStatus.data?.isRepo === true;

	function renderGitAction() {
		if (isRepo)
			return (
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
			);

		if (gitStatus.data?.isRepo === false)
			return (
				<Button
					className="h-7 gap-1 px-2 text-xs"
					disabled={initGitRepository.isPending}
					onClick={() => {
						initGitRepository.reset();
						initGitRepository.mutate({ threadId: thread.id });
					}}
					size="sm"
					type="button"
					variant="outline"
				>
					<GitBranchPlusIcon className="size-3.5" />
					{initGitRepository.isPending ? "Initializing..." : "Initialize Git"}
				</Button>
			);

		return null;
	}

	return (
		<div className={cn("surface-subheader flex items-center gap-2")}>
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

			{initGitRepository.error ? (
				<span className="truncate text-[11px] text-destructive">
					{initGitRepository.error.message}
				</span>
			) : null}

			<div className="ml-auto flex items-center gap-1">{renderGitAction()}</div>
		</div>
	);
}
