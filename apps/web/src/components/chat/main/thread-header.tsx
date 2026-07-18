import {
	useGitStatus,
	useInitGitRepository,
} from "@cyrus/hooks/queries/use-git";
import { useProjects } from "@cyrus/hooks/queries/use-projects";
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
	/** Breadcrumb page title (thread name, or "New thread" for a draft). */
	title: string;
	workerId: string;
	projectId: string;
	/** Committed thread id — omitted for controller-local drafts. */
	threadId?: string;
	localDraft?: boolean;
};

export function ThreadHeader({
	title,
	workerId,
	projectId,
	threadId,
	localDraft = false,
}: ThreadHeaderProps) {
	const { diffOpen, toggleDiffOpen } = useChatUiStore();
	const { projects } = useProjects();
	const project = projects.find((item) => item.id === projectId);
	// Drafts never fetch git status on open — branch UI lives in the composer
	// and loads project git only when the user opens it.
	const gitStatus = useGitStatus(localDraft ? undefined : threadId);
	const initGitRepository = useInitGitRepository();

	const isRepo = gitStatus.data?.isRepo === true;

	function renderGitAction() {
		if (localDraft || !threadId) return null;

		if (isRepo)
			return (
				<button
					aria-pressed={diffOpen}
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
						initGitRepository.mutate({ threadId });
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
						<BreadcrumbPage>{title}</BreadcrumbPage>
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
