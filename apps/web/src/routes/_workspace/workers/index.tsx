import { createFileRoute } from "@tanstack/react-router";
import { ThreadEmptyState } from "@/components/chat/main/thread-empty-state";

export const Route = createFileRoute("/_workspace/workers/")({
	component: WorkersIndexPage,
});

function WorkersIndexPage() {
	return <ThreadEmptyState />;
}
