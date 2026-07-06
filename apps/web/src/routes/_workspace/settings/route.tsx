import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ChatSidebarLayout } from "@/components/sidebar/chat-sidebar-layout";
import { SettingsSidebar } from "@/components/sidebar/settings-sidebar";
import { WorkspaceInset } from "@/layouts/workspace-inset";

export const Route = createFileRoute("/_workspace/settings")({
	component: SettingsLayout,
});

function SettingsLayout() {
	return (
		<ChatSidebarLayout sidebar={<SettingsSidebar />}>
			<WorkspaceInset>
				<Outlet />
			</WorkspaceInset>
		</ChatSidebarLayout>
	);
}
