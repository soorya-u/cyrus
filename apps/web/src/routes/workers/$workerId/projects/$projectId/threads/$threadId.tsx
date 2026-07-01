// biome-ignore lint/style/useFilenamingConvention: TanStack Router requires $threadId param syntax.
import { createFileRoute } from "@tanstack/react-router";
import { ThreadDetail } from "@/routes/threads/$threadId";

export const Route = createFileRoute(
	"/workers/$workerId/projects/$projectId/threads/$threadId"
)({
	component: WorkerProjectThreadPage,
});

function WorkerProjectThreadPage() {
	const { workerId, projectId, threadId } = Route.useParams();
	return (
		<ThreadDetail
			projectId={projectId}
			threadId={threadId}
			workerId={workerId}
		/>
	);
}
