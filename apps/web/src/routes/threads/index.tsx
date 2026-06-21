import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/threads/")({
	component: ThreadsList,
});

function ThreadsList() {
	return (
		<div className="p-6">
			<h1 className="mb-4 font-semibold text-xl">Threads</h1>
			<p className="text-muted-foreground">
				Thread metadata list will appear here (shared across devices).
			</p>
			<div className="mt-4 text-sm">
				Create thread via dashboard or CLI worker for now.
			</div>
		</div>
	);
}
