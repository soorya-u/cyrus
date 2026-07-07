import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { DeleteProjectDialog } from "@/components/portals/delete-project-dialog";
import { NewProjectDialog } from "@/components/portals/new-project-dialog";
import { RenameProjectDialog } from "@/components/portals/rename-project-dialog";
import { ChatSidebarLayout } from "@/components/sidebar/chat-sidebar-layout";
import { WorkersSidebar } from "@/components/sidebar/workers/workers-sidebar";
import { useWorkerConversationSync } from "@/hooks/chat/use-worker-conversation-sync";
import { WorkspaceInset } from "@/layouts/workspace-inset";
import { dialController } from "@/lib/orpc";
import { useWorkerStore } from "@/stores/worker";

export const Route = createFileRoute("/_workspace/workers/$workerId")({
	beforeLoad: async ({ context, params }) => {
		const { connection, orpc } = await dialController(
			context.signaling,
			params.workerId
		);
		return { workerConnection: connection, orpcController: orpc };
	},
	component: WorkerLayout,
});

function WorkerLayout() {
	useWorkerConversationSync();
	const { workerId } = Route.useParams();
	const { workerConnection } = Route.useRouteContext();
	const setLastWorkerId = useWorkerStore((state) => state.setLastWorkerId);

	useEffect(() => () => workerConnection.close(), [workerConnection]);
	useEffect(() => setLastWorkerId(workerId), [workerId, setLastWorkerId]);

	return (
		<>
			<ChatSidebarLayout sidebar={<WorkersSidebar />}>
				<WorkspaceInset>
					<Outlet />
				</WorkspaceInset>
			</ChatSidebarLayout>
			<NewProjectDialog />
			<RenameProjectDialog />
			<DeleteProjectDialog />
		</>
	);
}
