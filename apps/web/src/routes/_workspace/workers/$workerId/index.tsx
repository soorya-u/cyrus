import { createFileRoute } from "@tanstack/react-router";
import { ThreadEmptyState } from "@/components/chat/main/thread-empty-state";

export const Route = createFileRoute("/_workspace/workers/$workerId/")({
	component: WorkerIndexPage,
});

function WorkerIndexPage() {
	return <ThreadEmptyState />;
}
