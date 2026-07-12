import { useControllerThreads } from "@cyrus/hooks/connection/use-controller-threads";
import { createFileRoute } from "@tanstack/react-router";
import { EmptyProject } from "@/components/chat/empty/empty-project";

export const Route = createFileRoute("/_workspace/workers/$workerId/")({
	component: WorkerIndexPage,
});

function WorkerIndexPage() {
	const { createProject } = useControllerThreads();

	return (
		<EmptyProject
			onCreateProject={({ name, path }) => createProject(name, path)}
		/>
	);
}
