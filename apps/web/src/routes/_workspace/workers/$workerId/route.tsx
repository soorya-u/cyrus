import { useWorkerConversationSync } from "@cyrus/hooks/connection/use-worker-conversation-sync";
import { RtcProvider } from "@cyrus/providers/rtc/rtc-provider";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { ConnectionError } from "@/components/connection-error";
import { DeleteProjectDialog } from "@/components/portals/delete-project-dialog";
import { NewProjectDialog } from "@/components/portals/new-project-dialog";
import { RenameProjectDialog } from "@/components/portals/rename-project-dialog";
import { WorkersSidebar } from "@/components/sidebar/workers/workers-sidebar";
import { ChatSidebarLayout } from "@/layouts/chat-sidebar-layout";
import { WorkspaceInset } from "@/layouts/workspace-inset";
import { dialRtc } from "@/lib/orpc";
import { useWorkerStore } from "@/stores/worker";

export const Route = createFileRoute("/_workspace/workers/$workerId")({
	component: WorkerLayout,
});

function WorkerLayout() {
	const { workerId } = Route.useParams();
	const setLastWorkerId = useWorkerStore((state) => state.setLastWorkerId);

	useEffect(() => setLastWorkerId(workerId), [workerId, setLastWorkerId]);

	return (
		<RtcProvider
			dialRtc={dialRtc}
			errorFallback={(props) => <ConnectionError {...props} />}
			pendingFallback={
				<div className="flex min-h-[50vh] items-center justify-center text-muted-foreground text-sm">
					Connecting to worker…
				</div>
			}
			workerId={workerId}
		>
			<WorkerLayoutContent />
		</RtcProvider>
	);
}

function WorkerLayoutContent() {
	useWorkerConversationSync();

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
