import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SettingsSidebar } from "@/components/sidebar/settings-sidebar";
import { ChatSidebarLayout } from "@/layouts/chat-sidebar-layout";
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
