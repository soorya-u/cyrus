import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { ChatSidebarFooterActions } from "@/components/sidebar/chat-sidebar-footer-actions";
import { ChatSidebarHeader } from "@/components/sidebar/chat-sidebar-header";
import {
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { SETTINGS_NAV_ITEMS } from "@/constants/settings-nav";
import { useWorkerStore } from "@/stores/worker";

export function SettingsSidebar() {
	const navigate = useNavigate();
	const { isMobile, setOpenMobile } = useSidebar();
	const lastWorkerId = useWorkerStore((state) => state.lastWorkerId);
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	const activeSection =
		SETTINGS_NAV_ITEMS.find((entry) => entry.path === pathname)?.id ??
		"general";

	const handleBack = () => {
		if (isMobile) setOpenMobile(false);
		if (lastWorkerId)
			navigate({
				to: "/workers/$workerId",
				params: { workerId: lastWorkerId },
			});
		else navigate({ to: "/workers" });
	};

	return (
		<>
			<ChatSidebarHeader />

			<SidebarContent className="overflow-x-hidden">
				<SidebarGroup className="px-2 py-3">
					<SidebarMenu>
						{SETTINGS_NAV_ITEMS.map((item) => {
							const Icon = item.icon;
							const isActive = activeSection === item.id;
							return (
								<SidebarMenuItem key={item.id}>
									<SidebarMenuButton
										className={
											isActive
												? "gap-2.5 px-2.5 py-2 text-left font-medium text-[13px] text-foreground"
												: "gap-2.5 px-2.5 py-2 text-left text-[13px] text-muted-foreground/70 hover:text-foreground/80"
										}
										isActive={isActive}
										render={<Link to={item.path} />}
										size="sm"
									>
										<Icon
											className={
												isActive
													? "size-4 shrink-0 text-foreground"
													: "size-4 shrink-0 text-muted-foreground/60"
											}
										/>
										<span className="truncate">{item.label}</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							);
						})}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="p-2">
				<SidebarMenu>
					<ChatSidebarFooterActions />
					<SidebarMenuItem>
						<SidebarMenuButton
							className="gap-2 px-2 py-2 text-muted-foreground text-xs hover:bg-accent hover:text-foreground"
							onClick={handleBack}
							size="sm"
						>
							<ArrowLeftIcon className="size-4" />
							<span>Back to chat</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</>
	);
}
