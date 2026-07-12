import { createFileRoute } from "@tanstack/react-router";
import { EmptyThread } from "@/components/chat/empty/empty-thread";

export const Route = createFileRoute(
	"/_workspace/workers/$workerId/p/$projectId/"
)({
	component: EmptyThread,
});
