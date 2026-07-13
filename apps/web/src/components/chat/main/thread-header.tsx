import { useControllerThreads } from "@cyrus/hooks/connection/use-controller-threads";
import {
	useCheckoutRef,
	useGitStatus,
	useListGitRefs,
} from "@cyrus/hooks/connection/use-git";
import type { Thread } from "@cyrus/schemas/rtc/threads";
import { Link } from "@tanstack/react-router";
import { cn } from "cnfast";
import { ChevronDownIcon, GitBranchIcon } from "lucide-react";
import { useState } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
	const gitRefs = useListGitRefs(thread.id);
	const checkoutRef = useCheckoutRef();
	const [checkoutError, setCheckoutError] = useState<string | null>(null);

	const isRepo = gitStatus.data?.isRepo === true;
	const refName =
		gitStatus.data?.isRepo === true ? gitStatus.data.refName : null;

	async function handleCheckout(name: string) {
		setCheckoutError(null);
		try {
			await checkoutRef.mutateAsync({ threadId: thread.id, refName: name });
		} catch (error) {
			setCheckoutError(
				error instanceof Error ? error.message : "Branch checkout failed"
			);
		}
	}

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

			{isRepo && refName ? (
				<DropdownMenu>
					<DropdownMenuTrigger
						className="inline-flex h-7 items-center gap-1 rounded-md bg-muted/70 px-2 font-mono text-[11px] text-muted-foreground hover:bg-muted"
						type="button"
					>
						<GitBranchIcon className="size-3" />
						{refName}
						<ChevronDownIcon className="size-3 opacity-60" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						{(gitRefs.data?.refs ?? []).map((ref) => (
							<DropdownMenuItem
								key={ref.name}
								onSelect={() => handleCheckout(ref.name)}
							>
								{ref.name}
								{ref.current ? " (current)" : ""}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			) : null}

			{checkoutError ? (
				<span className="truncate text-[11px] text-destructive">
					{checkoutError}
				</span>
			) : null}

			<div className="ml-auto flex items-center gap-1">
				{isRepo ? (
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
				) : null}
			</div>
		</div>
	);
}
