import { createFileRoute } from "@tanstack/react-router";
import { ThreadWorkspace } from "@/components/chat/main/thread-workspace";

export const Route = createFileRoute(
	"/_workspace/workers/$workerId/p/$projectId/t/$threadId/"
)({
	component: ThreadPage,
});

function ThreadPage() {
	const { workerId, projectId, threadId } = Route.useParams();
	return (
		<ThreadWorkspace
			projectId={projectId}
			threadId={threadId}
			workerId={workerId}
		/>
	);
}
