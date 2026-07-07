import {
	useNavigate,
	useParams,
	useRouteContext,
} from "@tanstack/react-router";
import { SettingsIcon } from "lucide-react";
import {
	ProjectThreadExplorer,
	useActiveThreadIdFromRoute,
} from "@/components/sidebar/projects/project-thread-explorer";
import { WorkerSelect } from "@/components/sidebar/workers/worker-select";
import {
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { SidebarSectionLayout } from "@/layouts/sidebar-section-layout";

export function WorkersSidebar() {
	const params = useParams({ strict: false });
	const { isMobile, setOpenMobile } = useSidebar();
	const navigate = useNavigate();
	const workerId = "workerId" in params ? params.workerId : undefined;
	const { orpcController } = useRouteContext({ strict: false });
	const activeThreadId = useActiveThreadIdFromRoute() ?? null;

	return (
		<SidebarSectionLayout
			footerAction={
				<SidebarMenuItem>
					<SidebarMenuButton
						className="gap-2 px-2 py-1.5 text-muted-foreground/70 hover:bg-accent hover:text-foreground"
						onClick={() => {
							if (isMobile) setOpenMobile(false);
							navigate({ to: "/settings" });
						}}
						size="sm"
					>
						<SettingsIcon className="size-3.5" />
						<span className="text-xs">Settings</span>
					</SidebarMenuButton>
				</SidebarMenuItem>
			}
		>
			<WorkerSelect workerId={workerId} />
			{workerId && orpcController && (
				<ProjectThreadExplorer
					activeThreadId={activeThreadId ?? undefined}
					workerId={workerId}
				/>
			)}
		</SidebarSectionLayout>
	);
}
