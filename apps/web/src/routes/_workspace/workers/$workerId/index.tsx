import { useProjects } from "@cyrus/hooks/connection/use-projects";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { EmptyProject } from "@/components/chat/empty/empty-project";

export const Route = createFileRoute("/_workspace/workers/$workerId/")({
	component: WorkerIndexPage,
});

function WorkerIndexPage() {
	const { createProject } = useProjects();

	return (
		<EmptyProject
			onCreateProject={async ({ name, path }) => {
				try {
					await createProject(name, path);
				} catch {
					toast.error("Failed to create project");
				}
			}}
		/>
	);
}
