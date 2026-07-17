import { createFileRoute } from "@tanstack/react-router";
import { DraftWorkspace } from "@/components/chat/main/draft-workspace";

export const Route = createFileRoute(
	"/_workspace/workers/$workerId/p/$projectId/d/$draftId/"
)({
	component: DraftPage,
});

function DraftPage() {
	const { workerId, projectId, draftId } = Route.useParams();
	return (
		<DraftWorkspace
			draftId={draftId}
			projectId={projectId}
			workerId={workerId}
		/>
	);
}
