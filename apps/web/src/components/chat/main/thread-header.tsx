import { useProjects } from "@cyrus/hooks/queries/use-projects";
import { Link } from "@tanstack/react-router";
import { cn } from "cnfast";
import { PanelRightIcon } from "lucide-react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
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
	const { drawerOpen, toggleDrawerOpen } = useChatUiStore();
	const { projects } = useProjects();
	const project = projects.find((item) => item.id === projectId);

	function renderWorkspaceToggle() {
		if (localDraft || !threadId) return null;

		return (
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							aria-label="Toggle workspace drawer"
							aria-pressed={drawerOpen}
							className={cn(drawerOpen && "bg-accent text-accent-foreground")}
							onClick={toggleDrawerOpen}
							size="icon-sm"
							type="button"
							variant="ghost"
						/>
					}
				>
					<PanelRightIcon className="size-4" />
				</TooltipTrigger>
				<TooltipPopup>
					{drawerOpen ? "Close workspace" : "Open workspace"}
				</TooltipPopup>
			</Tooltip>
		);
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

			<div className="ml-auto flex items-center gap-1">
				{renderWorkspaceToggle()}
			</div>
		</div>
	);
}
