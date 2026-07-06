import { createFileRoute } from "@tanstack/react-router";
import { ThreadEmptyState } from "@/components/chat/main/thread-empty-state";
import { ChatSidebarLayout } from "@/components/sidebar/chat-sidebar-layout";
import { WorkersSidebar } from "@/components/sidebar/workers/workers-sidebar";
import { WorkspaceInset } from "@/layouts/workspace-inset";

export const Route = createFileRoute("/_workspace/workers/")({
	component: WorkersIndexPage,
});

function WorkersIndexPage() {
	return (
		<ChatSidebarLayout sidebar={<WorkersSidebar />}>
			<WorkspaceInset>
				<ThreadEmptyState />
			</WorkspaceInset>
		</ChatSidebarLayout>
	);
}
