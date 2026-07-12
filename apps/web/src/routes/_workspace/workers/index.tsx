import { createFileRoute } from "@tanstack/react-router";
import { EmptyWorkspace } from "@/components/chat/empty/empty-workspace";
import { WorkersSidebar } from "@/components/sidebar/workers/workers-sidebar";
import { ChatSidebarLayout } from "@/layouts/chat-sidebar-layout";
import { WorkspaceInset } from "@/layouts/workspace-inset";

export const Route = createFileRoute("/_workspace/workers/")({
	component: () => (
		<ChatSidebarLayout sidebar={<WorkersSidebar />}>
			<WorkspaceInset>
				<EmptyWorkspace />
			</WorkspaceInset>
		</ChatSidebarLayout>
	),
});
