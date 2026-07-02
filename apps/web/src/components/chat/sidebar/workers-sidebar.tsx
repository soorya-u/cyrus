"use client";

import { useNavigate, useParams } from "@tanstack/react-router";
import { SettingsIcon } from "lucide-react";
import { ChatSidebarHeader } from "@/components/chat/sidebar/chat-sidebar-header";
import {
	ProjectThreadExplorer,
	useActiveThreadIdFromRoute,
} from "@/components/chat/sidebar/project-thread-explorer";
import { WorkerSelect } from "@/components/chat/sidebar/worker-select";
import {
	SidebarContent,
	SidebarFooter,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";

export function WorkersSidebar() {
	const { isMobile, setOpenMobile } = useSidebar();
	const navigate = useNavigate();
	const params = useParams({ strict: false });
	const workerId = "workerId" in params ? params.workerId : undefined;
	const activeThreadId = useActiveThreadIdFromRoute() ?? null;

	const handleOpenSettings = () => {
		if (isMobile) setOpenMobile(false);
		navigate({ to: "/settings" });
	};

	return (
		<>
			<ChatSidebarHeader />

			<SidebarContent className="overflow-x-hidden">
				<WorkerSelect workerId={workerId} />
				{workerId ? (
					<ProjectThreadExplorer
						activeThreadId={activeThreadId ?? undefined}
						workerId={workerId}
					/>
				) : null}
			</SidebarContent>

			<SidebarFooter className="p-2">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							className="gap-2 px-2 py-1.5 text-muted-foreground/70 hover:bg-accent hover:text-foreground"
							onClick={handleOpenSettings}
							size="sm"
						>
							<SettingsIcon className="size-3.5" />
							<span className="text-xs">Settings</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</>
	);
}
