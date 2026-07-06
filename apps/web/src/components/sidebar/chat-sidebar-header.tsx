import { SidebarHeader } from "@/components/ui/sidebar";

export function ChatSidebarHeader() {
	return (
		<SidebarHeader className="@container/sidebar-header h-(--workspace-topbar-height) shrink-0 flex-row items-center px-3 py-0 md:px-0">
			<span className="ml-(--workspace-titlebar-content-left) truncate font-medium text-foreground text-sm tracking-tight">
				Cyrus
			</span>
		</SidebarHeader>
	);
}
